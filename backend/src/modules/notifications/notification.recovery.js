/**
 * Notification Recovery - Startup Recovery Logic
 *
 * Nhiệm vụ:
 * Khi server restart, scan tất cả tasks có dueDate/scheduledAt/reminderAt
 * trong tương lai và re-queue notification jobs nếu chưa có.
 *
 * Điều này đảm bảo:
 * 1. Jobs không bị mất sau restart
 * 2. Tasks được tạo/update lúc server down vẫn nhận notification
 * 3. Idempotent: nếu job đã tồn tại trong queue → skip (nhờ addNotificationJob)
 *
 * FLOW:
 * Server boot → connection() → recoverPendingNotifications()
 *                              ↓
 *               SELECT tasks WHERE (dueDate > NOW() OR scheduledAt > NOW() OR reminderAt > NOW())
 *                              AND status NOT IN ('DONE', 'ARCHIVED')
 *                              AND deletedAt IS NULL
 *                              ↓
 *               For each task → scheduleForTask(task)
 *                              ↓
 *               addNotificationJob handles dedup (remove-then-add or skip if exists)
 */

import prisma from '../../config/database.js';
import { scheduleForTask } from './notification.schedule.js';

/**
 * Scan và re-queue notification jobs cho tất cả tasks cần thông báo
 *
 * Chạy khi server startup, sau khi database đã connected.
 * Safe to call multiple times (idempotent nhờ addNotificationJob logic).
 */
export const recoverPendingNotifications = async () => {
	const startTime = Date.now();
	console.log('[Recovery] Starting notification recovery scan...');

	try {
		const now = new Date();

		// Lấy tất cả tasks có thời gian trong tương lai và chưa DONE/ARCHIVED
		const pendingTasks = await prisma.task.findMany({
			where: {
				deletedAt: null,
				status: {
					notIn: ['DONE', 'ARCHIVED'],
				},
				OR: [
					{ dueDate: { gt: now } },
					{ scheduledAt: { gt: now } },
					{ reminderAt: { gt: now } },
				],
			},
			select: {
				id: true,
				userId: true,
				title: true,
				dueDate: true,
				scheduledAt: true,
				reminderAt: true,
				status: true,
			},
			orderBy: { dueDate: 'asc' },
		});

		if (pendingTasks.length === 0) {
			console.log('[Recovery] No pending tasks found, nothing to recover');
			return { recovered: 0, duration: Date.now() - startTime };
		}

		console.log(`[Recovery] Found ${pendingTasks.length} tasks with future dates`);

		let recoveredCount = 0;
		let errorCount = 0;

		for (const task of pendingTasks) {
			try {
				await scheduleForTask(task);
				recoveredCount++;
			} catch (error) {
				errorCount++;
				console.error(
					`[Recovery] Error scheduling task ${task.id}:`,
					error.message,
				);
			}
		}

		const duration = Date.now() - startTime;
		console.log(
			`[Recovery] Recovery complete: ${recoveredCount} tasks scheduled, ${errorCount} errors, ${duration}ms`,
		);

		return { recovered: recoveredCount, errors: errorCount, duration };
	} catch (error) {
		console.error('[Recovery] Fatal error during recovery:', error);
		// Don't throw — recovery failure should not prevent server startup
		return { recovered: 0, errors: 1, duration: Date.now() - startTime };
	}
};

/**
 * Xử lý missed notifications
 *
 * Scan tasks có dueDate/scheduledAt/reminderAt đã QUÁ nhưng chưa có notification
 * và tạo notification "đã quá hạn" cho chúng.
 *
 * Chạy optional sau recoverPendingNotifications.
 */
export const processMissedNotifications = async () => {
	console.log('[Recovery] Scanning for missed notifications...');

	try {
		const now = new Date();
		// Lookback window: 24 giờ qua
		const lookbackStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

		// Tìm tasks có dueDate trong 24h qua nhưng chưa DONE
		const missedTasks = await prisma.task.findMany({
			where: {
				deletedAt: null,
				status: {
					notIn: ['DONE', 'ARCHIVED'],
				},
				dueDate: {
					gte: lookbackStart,
					lte: now,
				},
			},
			select: {
				id: true,
				userId: true,
				title: true,
				dueDate: true,
			},
		});

		if (missedTasks.length === 0) {
			console.log('[Recovery] No missed notifications found');
			return { processed: 0 };
		}

		let processedCount = 0;

		for (const task of missedTasks) {
			// Kiểm tra xem đã có notification cho task này chưa
			const existingNotif = await prisma.notification.findFirst({
				where: {
					taskId: task.id,
					notifKey: {
						startsWith: `task:${task.id}:`,
					},
				},
			});

			if (existingNotif) {
				continue; // Đã có notification → skip
			}

			// Tạo notification "đã quá hạn"
			const notifKey = `task:${task.id}:OVERDUE:0`;

			try {
				await prisma.notification.upsert({
					where: { notifKey },
					create: {
						userId: task.userId,
						taskId: task.id,
						type: 'TASK_DUE',
						title: task.title,
						content: `"${task.title}" đã quá hạn`,
						notifKey,
						scheduledAt: task.dueDate,
						sentAt: now,
						status: 'SENT',
					},
					update: {}, // No-op if already exists
				});
				processedCount++;
			} catch (error) {
				// Unique constraint → already exists, skip
				if (error?.code !== 'P2002') {
					console.error(`[Recovery] Error creating missed notification for task ${task.id}:`, error.message);
				}
			}
		}

		console.log(`[Recovery] Processed ${processedCount} missed notifications`);
		return { processed: processedCount };
	} catch (error) {
		console.error('[Recovery] Error processing missed notifications:', error);
		return { processed: 0 };
	}
};
