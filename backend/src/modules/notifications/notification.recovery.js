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
import { scheduleTaskV2, scheduleEventV2 } from './notification.schedule.js';

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

		const pendingTasks = await prisma.task.findMany({
			where: {
				deletedAt: null,
				status: { notIn: ['DONE', 'ARCHIVED'] },
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
				type: true,
				dueDate: true,
				scheduledAt: true,
				reminderAt: true,
				status: true,
			},
			orderBy: { dueDate: 'asc' },
		});

		if (pendingTasks.length === 0) {
			console.log('[Recovery] No pending tasks found');
			return { recovered: 0, duration: Date.now() - startTime };
		}

		console.log(`[Recovery] Found ${pendingTasks.length} tasks with future dates`);

		let recoveredCount = 0;
		let errorCount = 0;

		for (const task of pendingTasks) {
			try {
				// v2: schedule theo type
				await scheduleTaskV2(task);
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
			`[Recovery] Done: ${recoveredCount} tasks, ${errorCount} errors, ${duration}ms`,
		);
		return { recovered: recoveredCount, errors: errorCount, duration };
	} catch (error) {
		console.error('[Recovery] Fatal error:', error);
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
		const lookbackStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

		const missedTasks = await prisma.task.findMany({
			where: {
				deletedAt: null,
				status: { notIn: ['DONE', 'ARCHIVED'] },
				dueDate: { gte: lookbackStart, lte: now },
			},
			select: { id: true, userId: true, title: true, dueDate: true },
		});

		if (missedTasks.length === 0) {
			console.log('[Recovery] No missed notifications found');
			return { processed: 0 };
		}

		let processedCount = 0;

		for (const task of missedTasks) {
			const existingNotif = await prisma.notification.findFirst({
				where: {
					OR: [
						// v2 notifKey
						{ notifKey: `notif:task:${task.id}:TASK_DUE` },
						// v1 notifKey legacy
						{ notifKey: { startsWith: `task:${task.id}:` } },
					],
				},
			});

			if (existingNotif) continue;

			const notifKey = `notif:task:${task.id}:TASK_DUE`;

			try {
				await prisma.notification.upsert({
					where: { notifKey },
					create: {
						userId: task.userId,
						source: 'TASK',
						sourceId: task.id,
						taskId: task.id,
						type: 'TASK_DUE',
						title: task.title,
						content: `"${task.title}" đã quá hạn`,
						notifKey,
						scheduledAt: task.dueDate,
						sentAt: now,
						status: 'SENT',
					},
					update: {},
				});
				processedCount++;
			} catch (error) {
				if (error?.code !== 'P2002') {
					console.error(
						`[Recovery] Error creating missed notif for task ${task.id}:`,
						error.message,
					);
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

/**
 * Recovery cho Event notifications (v2)
 * Scan events có startAt/endAt/reminderAt trong tương lai và chưa có linkedTaskId
 */
export const recoverPendingEventNotifications = async () => {
	const startTime = Date.now();
	console.log('[Recovery] Starting event notification recovery...');

	try {
		const now = new Date();
		const todayStart = new Date(now);
		todayStart.setHours(0, 0, 0, 0);

		const pendingEvents = await prisma.event.findMany({
			where: {
				linkedTaskId: null, // Chỉ recover events độc lập (không phải event dẫn xuất)
				OR: [
					{ startAt: { gt: now } },
					{ endAt: { gt: now } },
					{ reminderAt: { gt: now } },
					{ date: { gte: todayStart } },
				],
			},
			select: {
				id: true,
				userId: true,
				title: true,
				startAt: true,
				endAt: true,
				reminderAt: true,
				linkedTaskId: true,
				date: true,
				time: true,
				reminder: true,
			},
		});

		if (pendingEvents.length === 0) {
			console.log('[Recovery] No pending events found');
			return { recovered: 0, duration: Date.now() - startTime };
		}

		console.log(
			`[Recovery] Found ${pendingEvents.length} events with future timestamps`,
		);

		let recoveredCount = 0;
		let errorCount = 0;

		for (const event of pendingEvents) {
			try {
				await scheduleEventV2(event);
				recoveredCount++;
			} catch (error) {
				errorCount++;
				console.error(
					`[Recovery] Error scheduling event ${event.id}:`,
					error.message,
				);
			}
		}

		const duration = Date.now() - startTime;
		console.log(
			`[Recovery] Events done: ${recoveredCount} recovered, ${errorCount} errors, ${duration}ms`,
		);
		return { recovered: recoveredCount, errors: errorCount, duration };
	} catch (error) {
		console.error('[Recovery] Fatal error during event recovery:', error);
		return { recovered: 0, errors: 1, duration: Date.now() - startTime };
	}
};
