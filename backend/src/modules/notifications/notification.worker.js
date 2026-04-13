/**
 * Notification Worker - Xử lý job BullMQ gửi thông báo
 *
 * Nhiệm vụ:
 * 1. Lắng nghe job từ notification-reminder queue
 * 2. Query task từ database
 * 3. Kiểm tra điều kiện (task status, task tồn tại, stale check)
 * 4. Tạo notification record (idempotent via notifKey unique constraint)
 * 5. Emit realtime event tới client qua Socket.io
 *
 * CRITICAL: Sử dụng notifKey (unique DB field) thay vì Redis key cho deduplication
 * để đảm bảo KHÔNG BAO GIỜ tạo duplicate notification.
 */

import { Worker } from 'bullmq';
import connection from '../../config/redis.js';
import prisma from '../../config/database.js';
import { getIO } from '../../common/realtime/socket.gateway.js';

const STALE_SCHEDULE_DRIFT_MS = 60 * 1000; // 1 phút

const toValidDate = (value) => {
	if (!value) {
		return null;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed;
};

const resolveTaskBaseTime = (task) =>
	toValidDate(task?.dueDate) ||
	toValidDate(task?.scheduledAt) ||
	toValidDate(task?.reminderAt);

const shouldSkipStaleTaskJob = (task, offset, scheduledFor) => {
	const baseTime = resolveTaskBaseTime(task);
	if (!baseTime) {
		return true;
	}

	if (typeof offset !== 'number' || Number.isNaN(offset)) {
		return false;
	}

	const expectedRunAt = new Date(baseTime.getTime() + offset * 60000);
	const payloadRunAt = toValidDate(scheduledFor);

	if (payloadRunAt) {
		const driftMs = Math.abs(payloadRunAt.getTime() - expectedRunAt.getTime());
		return driftMs > STALE_SCHEDULE_DRIFT_MS;
	}

	return expectedRunAt.getTime() - Date.now() > STALE_SCHEDULE_DRIFT_MS;
};

/**
 * Map phase → NotifType cho DB storage
 * Giúp phân biệt loại thông báo trên frontend
 */
const phaseToNotifType = (phase) => {
	switch (phase) {
		case 'PRE_EVENT':
		case 'CUSTOM':
			return 'TASK_REMINDER';
		case 'ON_TIME':
			return 'TASK_DUE';
		case 'START_TIME':
			return 'TASK_START';
		case 'OVERDUE':
			return 'TASK_DUE';
		default:
			return 'SYSTEM_ALERT';
	}
};

/**
 * Build deterministic notifKey cho idempotency
 * Key format: task:{taskId}:{phase}:{offset}
 *
 * Khi DB có unique constraint trên notifKey,
 * tạo notification lần 2 với cùng key sẽ bị reject → KHÔNG duplicate.
 */
const buildNotifKey = (targetType, targetId, phase, offset) =>
	`${targetType.toLowerCase()}:${targetId}:${phase}:${offset}`;

/**
 * Build message nội dung thông báo
 * Phụ thuộc vào phase và offset
 *
 * @param {Object} item - Task object
 * @param {string} phase - PRE_EVENT | ON_TIME | OVERDUE | CUSTOM | START_TIME
 * @param {number} offset - Số phút offset từ baseTime
 * @returns {string} Message hoặc null nếu không thích hợp
 */
const buildMessage = (item, phase, offset) => {
	if (!item || !item.title) {
		return null;
	}

	const taskTitle = item.title;

	switch (phase) {
		case 'PRE_EVENT': {
			// Thông báo trước deadline
			const minutesBefore = Math.abs(offset);
			if (minutesBefore < 60) {
				return `"${taskTitle}" sắp diễn ra trong ${minutesBefore} phút`;
			}
			const hoursBefore = Math.round(minutesBefore / 60);
			if (hoursBefore < 24) {
				return `"${taskTitle}" sắp diễn ra trong ${hoursBefore} giờ`;
			}
			const daysBefore = Math.round(hoursBefore / 24);
			return `"${taskTitle}" sắp diễn ra trong ${daysBefore} ngày`;
		}

		case 'ON_TIME': {
			return `"${taskTitle}" đã đến hạn - hãy kiểm tra ngay!`;
		}

		case 'START_TIME': {
			return `"${taskTitle}" đã bắt đầu!`;
		}

		case 'OVERDUE': {
			const minutesAfter = Math.abs(offset);
			if (minutesAfter === 0) {
				return `"${taskTitle}" đã quá hạn`;
			}
			if (minutesAfter < 60) {
				return `"${taskTitle}" đã quá hạn ${minutesAfter} phút`;
			}
			const hoursAfter = Math.round(minutesAfter / 60);
			if (hoursAfter < 24) {
				return `"${taskTitle}" đã quá hạn hơn ${hoursAfter} giờ`;
			}
			const daysAfter = Math.round(hoursAfter / 24);
			return `"${taskTitle}" đã quá hạn hơn ${daysAfter} ngày`;
		}

		case 'CUSTOM': {
			if (offset === 0) {
				return `Đã đến giờ nhắc cho "${taskTitle}"`;
			}

			const offsetLabel =
				offset < 0 ? `trước ${Math.abs(offset)} phút` : `sau ${offset} phút`;
			return `"${taskTitle}" - reminder: ${offsetLabel}`;
		}

		default:
			console.warn(`[Worker] Unknown phase: ${phase}`);
			return null;
	}
};

/**
 * BullMQ Worker
 * - Name: "notification-reminder" (phải match với queue name)
 * - Xử lý từng job một, lần lượt
 * - Tự động retry nếu fail (config trong queue)
 *
 * Idempotency:
 * - Dùng notifKey (unique DB field) thay vì Redis key
 * - Nếu notification đã tồn tại → skip, KHÔNG tạo duplicate
 */
const worker = new Worker(
	'notification-reminder',
	async (job) => {
		const { targetType, targetId, phase, offset, scheduledFor, userId } = job.data;
		const jobId = job.opts?.jobId || job.id;

		console.log(`[Worker] Processing job ${jobId}: ${targetType}:${targetId} (phase: ${phase}, offset: ${offset})`);

		try {
			// 1. Lấy thông tin target (task)
			let item;

			if (targetType === 'TASK') {
				item = await prisma.task.findUnique({
					where: { id: targetId },
					select: {
						id: true,
						title: true,
						status: true,
						userId: true,
						dueDate: true,
						scheduledAt: true,
						reminderAt: true,
						deletedAt: true,
					},
				});

				// Nếu task không tồn tại → bỏ qua
				if (!item) {
					console.log(`[Worker] Task ${targetId} không tồn tại, skipped`);
					return;
				}

				// Nếu task đã DONE → bỏ qua
				if (item.status === 'DONE') {
					console.log(`[Worker] Task ${targetId} đã DONE, skipped`);
					return;
				}

				// Nếu task đã xóa → bỏ qua
				if (item.deletedAt) {
					console.log(`[Worker] Task ${targetId} đã deleted, skipped`);
					return;
				}

				// Kiểm tra stale (task đã được update dueDate sau khi job được schedule)
				if (shouldSkipStaleTaskJob(item, offset, scheduledFor)) {
					console.log(`[Worker] Job ${jobId} stale với trạng thái task hiện tại, skipped`);
					return;
				}
			}

			// 2. Build message nội dung thông báo
			const message = buildMessage(item, phase, offset);

			if (!message) {
				console.warn(`[Worker] Could not build message for ${phase}:${offset}`);
				return;
			}

			// 3. Build notifKey cho idempotency
			const notifKey = buildNotifKey(targetType, targetId, phase, offset);

			// 4. Tạo notification record trong database (IDEMPOTENT)
			// Check-then-create: nếu notifKey đã tồn tại → skip (unique constraint là safety net)
			const targetUserId = item?.userId || userId;
			const notifType = phaseToNotifType(phase);

			let notification;

			// IDEMPOTENCY: Check if notification already exists by notifKey
			const existing = await prisma.notification.findUnique({
				where: { notifKey },
				select: { id: true },
			});

			if (existing) {
				console.log(`[Worker] Notification ${notifKey} đã tồn tại (dedup), skipped`);
				return;
			}

			// Tạo notification mới — unique constraint on notifKey là safety net cuối cùng
			try {
				notification = await prisma.notification.create({
					data: {
						userId: targetUserId,
						taskId: targetType === 'TASK' ? targetId : null,
						type: notifType,
						title: item?.title || null,
						content: message,
						notifKey,
						scheduledAt: new Date(),
						sentAt: new Date(),
						status: 'SENT',
					},
				});
			} catch (dbError) {
				// Race condition: another worker created it between findUnique and create
				if (dbError?.code === 'P2002' || dbError?.message?.includes('Unique constraint')) {
					console.log(`[Worker] Duplicate notification (race condition) for ${notifKey}, skipped`);
					return;
				}
				throw dbError;
			}

			console.log(
				`[Worker] Created notification ${notification.id} (key: ${notifKey}) for user ${targetUserId}`,
			);

			// 5. Emit realtime event tới client qua Socket.io
			const io = getIO();
			if (io) {
				io.to(targetUserId).emit('TASK_EVENT_REMINDER', {
					id: notification.id,
					eventType: 'TASK_REMINDER',
					type: notification.type,
					taskTitle: item?.title || null,
					dueDate: item?.dueDate || null,
					message,
					taskId: targetId,
					phase,
					offset,
					createdAt: notification.createdAt,
				});

				console.log(`[Worker] Emitted TASK_EVENT_REMINDER to user ${targetUserId}`);
			} else {
				console.warn(`[Worker] Socket.io not initialized, skipped emit`);
			}
		} catch (error) {
			console.error(`[Worker] Error processing job ${jobId}:`, error);
			throw error; // Rethrow để BullMQ retry job
		}
	},
	{
		connection,
		settings: {
			maxStalledCount: 2, // Hủy job nếu stuck quá 2 lần
		},
		concurrency: 5, // Cho phép xử lý song song 5 jobs
	},
);

// Worker event listeners cho monitoring
worker.on('completed', (job) => {
	const jobId = job.opts?.jobId || job.id;
	console.log(`[Worker] Job ${jobId} completed successfully`);
});

worker.on('failed', (job, err) => {
	const jobId = job?.opts?.jobId || job?.id;
	console.error(`[Worker] Job ${jobId} failed:`, err.message);
});

worker.on('error', (err) => {
	console.error('[Worker] Worker error:', err);
});

export default worker;
