/**
 * Notification Worker - Xử lý job BullMQ gửi thông báo
 *
 * Nhiệm vụ:
 * 1. Lắng nghe job từ notification-reminder queue
 * 2. Query task từ database
 * 3. Kiểm tra điều kiện (task status, task tồn tại)
 * 4. Tạo notification record
 * 5. Emit realtime event tới client qua Socket.io
 */

import { Worker } from 'bullmq';
import connection from '../../config/redis.js';
import prisma from '../../config/database.js';
import { getIO } from '../../common/realtime/socket.gateway.js';

/**
 * BullMQ Worker
 * - Name: "notification-reminder" (phải match với queue name)
 * - Xử lý từng job một, lần lượt
 * - Tự động retry nếu fail (config trong queue)
 */
new Worker(
	'notification-reminder',
	async (job) => {
		const { targetType, targetId, phase, offset, userId } = job.data;

		console.log(`[Worker] Processing job ${job.id}: ${targetType}:${targetId}`);

		try {
			// 1. Lấy thông tin target (task, event, etc.)
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
						reminderAt: true,
					},
				});

				// Nếu task không tồn tại hoặc đã DONE -> bỏ qua
				if (!item) {
					console.log(`[Worker] Task ${targetId} không tồn tại, skipped`);
					return;
				}

				if (item.status === 'DONE') {
					console.log(`[Worker] Task ${targetId} đã DONE, skipped`);
					return;
				}
			}

			// 2. Build message nội dung thông báo
			const message = buildMessage(item, phase, offset);

			if (!message) {
				console.warn(`[Worker] Could not build message for ${phase}:${offset}`);
				return;
			}

			// 3. Tạo notification record trong database
			const notification = await prisma.notification.create({
				data: {
					userId,
					taskId: targetType === 'TASK' ? targetId : null,
					type: 'SYSTEM_ALERT',
					title: item?.title || null,
					content: message,
					scheduledAt: new Date(),
					sentAt: new Date(),
					status: 'SENT',
				},
			});

			console.log(
				`[Worker] Created notification ${notification.id} for user ${userId}`,
			);

			// 4. Emit realtime event tới client qua Socket.io
			const io = getIO();
			if (io) {
				io.to(userId).emit('TASK_EVENT_REMINDER', {
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

				console.log(`[Worker] Emitted TASK_EVENT_REMINDER to user ${userId}`);
			} else {
				console.warn(`[Worker] Socket.io not initialized, skipped emit`);
			}
		} catch (error) {
			console.error(`[Worker] Error processing job ${job.id}:`, error);
			throw error; // Rethrow để BullMQ retry job
		}
	},
	{
		connection,
		// Optional: Thiết lập options cho worker
		settings: {
			maxStalledCount: 2, // Hủy job nếu stuck quá 2 lần
		},
	},
);

/**
 * Build message nội dung thông báo
 * Phụ thuộc vào phase và offset
 *
 * @param {Object} item - Task object
 * @param {string} phase - PRE_EVENT | ON_TIME | OVERDUE | CUSTOM
 * @param {number} offset - Số phút offset từ baseTime
 * @returns {string} Message hoặc null nếu không thích hợp
 *
 * @example
 * buildMessage(task, 'PRE_EVENT', -15) // => "Bạn có 'Task title' sắp diễn ra trong 15 phút"
 * buildMessage(task, 'ON_TIME', 0)     // => "'Task title' đã bắt đầu"
 * buildMessage(task, 'OVERDUE', 1440)  // => "'Task title' đã quá hạn hơn 1 ngày"
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
			return `"${taskTitle}" sắp diễn ra trong ${hoursBefore} giờ`;
		}

		case 'ON_TIME': {
			// Thông báo lúc deadline
			return `"${taskTitle}" đã bắt đầu - hãy kiểm tra ngay!`;
		}

		case 'OVERDUE': {
			// Thông báo khi quá hạn
			const minutesAfter = Math.abs(offset);
			if (minutesAfter === 0) {
				return `"${taskTitle}" đã quá hạn`;
			}
			if (minutesAfter < 60) {
				return `"${taskTitle}" đã quá hạn ${minutesAfter} phút`;
			}
			const hoursAfter = Math.round(minutesAfter / 60);
			return `"${taskTitle}" đã quá hạn hơn ${hoursAfter} giờ`;
		}

		case 'CUSTOM': {
			// Custom reminder message
			const offsetLabel =
				offset < 0 ? `trước ${Math.abs(offset)} phút` : `sau ${offset} phút`;
			return `"${taskTitle}" - reminder: ${offsetLabel}`;
		}

		default:
			console.warn(`[Worker] Unknown phase: ${phase}`);
			return null;
	}
};
