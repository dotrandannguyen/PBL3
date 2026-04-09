/**
 * Notification Scheduler - Quản lý lịch trình thông báo
 *
 * Nhiệm vụ:
 * 1. Lên lịch job thông báo cho task dựa trên dueDate/scheduledAt
 * 2. Hủy job khi task status thay đổi (DONE/delete)
 * 3. Reschedule khi task dueDate thay đổi
 */

import { addNotificationJob, removeJobsByPrefix } from './notification.queue.js';
import { buildSchedulePoints } from './notification.policy.js';

/**
 * Helper tạo job ID duy nhất cho reminder
 * Format: reminder:{type}:{id}:{phase}:{offset}
 *
 * @example
 * buildJobId("TASK", "task-123", "PRE_EVENT", -15)
 * => "reminder:TASK:task-123:PRE_EVENT:-15"
 */
const buildJobId = (type, id, phase, offset) =>
	`reminder:${type}:${id}:${phase}:${offset}`;

/**
 * Lên lịch thông báo cho task
 *
 * @param {Object} task - Task object với id, userId, dueDate, scheduledAt
 * @param {Array<Object>} reminders - Danh sách reminder user chọn (tùy chọn)
 *
 * Ví dụ reminders:
 * [
 *   { phase: 'PRE_EVENT', offset: -15 },  // 15 phút trước
 *   { phase: 'ON_TIME', offset: 0 },      // Lúc dueDate
 *   { phase: 'OVERDUE', offset: 1440 }    // 1 ngày sau deadline
 * ]
 */
export const scheduleForTask = async (task, reminders = []) => {
	// Xác định base time từ dueDate hoặc scheduledAt
	const baseTime = task.dueDate || task.scheduledAt;

	// Nếu không có dueDate/scheduledAt, bỏ qua
	if (!baseTime) {
		console.log(`[Scheduler] Task ${task.id} không có dueDate, skipped scheduling`);
		return;
	}

	// Tính điểm thông báo: loại bỏ quá khứ, duplicate, sort theo thời gian
	const points = buildSchedulePoints(new Date(baseTime), reminders);

	if (points.length === 0) {
		console.log(`[Scheduler] Task ${task.id} không có reminder điểm nào, skipped`);
		return;
	}

	// Lên lịch job cho mỗi điểm thông báo
	for (const p of points) {
		const jobId = buildJobId('TASK', task.id, p.phase, p.offset);
		const delay = p.runAt.getTime() - Date.now();

		// Nếu delay âm, bỏ qua (đã qua thời gian thông báo)
		if (delay < 0) {
			console.warn(`[Scheduler] Job ${jobId} has negative delay, skipping`);
			continue;
		}

		await addNotificationJob({
			jobId,
			delay,
			payload: {
				targetType: 'TASK',
				targetId: task.id,
				phase: p.phase,
				offset: p.offset,
				userId: task.userId,
			},
		});

		console.log(`[Scheduler] Scheduled job ${jobId} (delay: ${delay}ms)`);
	}
};

/**
 * Hủy tất cả job liên quan tới 1 target (task, event, etc.)
 *
 * @param {string} targetType - Loại target (TASK, EVENT, etc.)
 * @param {string} targetId - ID của target
 *
 * @example
 * // Hủy tất cả notification job của task-123
 * await cancelAllForTarget('TASK', 'task-123');
 */
export const cancelAllForTarget = async (targetType, targetId) => {
	const prefix = `reminder:${targetType}:${targetId}`;

	try {
		await removeJobsByPrefix(prefix);
		console.log(`[Scheduler] Cancelled all jobs for ${targetType}:${targetId}`);
	} catch (error) {
		console.error(`[Scheduler] Error cancelling jobs: ${error.message}`);
		throw error;
	}
};

/**
 * Reschedule: Hủy job cũ + Lên lịch job mới
 * Được gọi khi task dueDate thay đổi
 *
 * Guard: Chỉ reschedule nếu task có dueDate/scheduledAt
 *
 * @param {Object} task - Task object với thông tin mới nhất
 * @param {Array<Object>} reminders - Danh sách reminder mới
 *
 * @example
 * const updatedTask = await getTask(taskId);
 * await rescheduleTask(updatedTask, [{ phase: 'PRE_EVENT', offset: -30 }]);
 */
export const rescheduleTask = async (task, reminders = []) => {
	// Guard 1: Kiểm tra task có baseTime không
	const baseTime = task.dueDate || task.scheduledAt;
	if (!baseTime) {
		console.log(
			`[Scheduler] Task ${task.id} không có dueDate/scheduledAt, skip reschedule`,
		);
		await cancelAllForTarget('TASK', task.id); // Vẫn hủy job cũ nếu có
		return;
	}

	// Guard 2: Kiểm tra có reminder không
	const hasReminders = reminders.length > 0 || task.reminderAt;
	if (!hasReminders) {
		console.log(`[Scheduler] Task ${task.id} không có reminder, skip reschedule`);
		await cancelAllForTarget('TASK', task.id); // Vẫn hủy job cũ nếu có
		return;
	}

	// 1. Hủy job cũ
	await cancelAllForTarget('TASK', task.id);

	// 2. Lên lịch job mới
	await scheduleForTask(task, reminders);

	console.log(`[Scheduler] Rescheduled task ${task.id}`);
};
