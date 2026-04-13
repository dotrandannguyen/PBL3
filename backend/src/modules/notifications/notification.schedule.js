/**
 * Notification Scheduler - Quản lý lịch trình thông báo
 *
 * Nhiệm vụ:
 * 1. Lên lịch job thông báo cho task dựa trên dueDate/scheduledAt/reminderAt
 * 2. Hủy job khi task status thay đổi (DONE/delete)
 * 3. Reschedule khi task dueDate thay đổi
 *
 * ARCHITECTURE:
 * - scheduleForTask: Producer — push jobs vào BullMQ queue
 * - cancelAllForTarget: Xóa tất cả jobs của 1 target
 * - rescheduleTask: Cancel + Schedule mới (atomic intent)
 *
 * FIXES:
 * - Dùng addNotificationJob đã fix (remove-then-add thay vì chỉ add)
 * - removeJobsByPrefix đã fix (dùng job.opts.jobId thay vì job.id)
 */

import { addNotificationJob, removeJobsByPrefix } from './notification.queue.js';
import { buildSchedulePoints } from './notification.policy.js';

/**
 * Default reminders khi user không chọn reminder cụ thể
 * - ON_TIME (offset=0): Thông báo đúng lúc dueDate
 */
const DEFAULT_TASK_REMINDERS = [
	{ phase: 'ON_TIME', offset: 0 },
];

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

/**
 * Resolve fallback point từ reminderAt
 * Khi task có reminderAt nhưng không có dueDate/scheduledAt,
 * hoặc reminderAt khác với dueDate → tạo thêm 1 điểm nhắc nhở
 */
const resolveFallbackPoint = (task, baseDate) => {
	const reminderAt = toValidDate(task?.reminderAt);
	if (!reminderAt) {
		return null;
	}

	if (reminderAt.getTime() <= Date.now()) {
		return null;
	}

	const offset = Math.round((reminderAt.getTime() - baseDate.getTime()) / 60000);
	const hasTaskTimeline = Boolean(task?.dueDate || task?.scheduledAt);

	let phase = 'CUSTOM';
	if (hasTaskTimeline) {
		if (offset < 0) {
			phase = 'PRE_EVENT';
		} else if (offset === 0) {
			phase = 'ON_TIME';
		} else {
			phase = 'OVERDUE';
		}
	}

	return {
		phase,
		offset,
		runAt: reminderAt,
	};
};

/**
 * Deduplicate và sort schedule points
 * Tránh schedule 2 job cùng phase:offset:runAt
 */
const dedupeAndSortPoints = (points = []) => {
	const seen = new Set();

	return points
		.filter((point) => point?.runAt instanceof Date)
		.filter((point) => {
			const key = `${point.phase}:${point.offset}:${point.runAt.getTime()}`;
			if (seen.has(key)) {
				return false;
			}

			seen.add(key);
			return true;
		})
		.sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
};

/**
 * Resolve tất cả schedule points cho 1 task
 * Kết hợp: user reminders + default reminders + fallback reminderAt
 */
const resolveSchedulePoints = (task, reminders = []) => {
	const dueDate = toValidDate(task?.dueDate);
	const scheduledAt = toValidDate(task?.scheduledAt);
	const reminderAt = toValidDate(task?.reminderAt);

	const timelineBaseDate = dueDate || scheduledAt;
	const baseDate = timelineBaseDate || reminderAt;

	if (!baseDate) {
		return {
			baseDate: null,
			points: [],
		};
	}

	// Nếu user đã chọn reminders cụ thể → dùng reminders đó
	if (Array.isArray(reminders) && reminders.length > 0) {
		const pointsFromReminders = buildSchedulePoints(baseDate, reminders);
		if (pointsFromReminders.length > 0) {
			return {
				baseDate,
				points: dedupeAndSortPoints(pointsFromReminders),
			};
		}
	}

	// Nếu không → dùng default reminders
	const points = [];

	if (timelineBaseDate) {
		points.push(...buildSchedulePoints(timelineBaseDate, DEFAULT_TASK_REMINDERS));
	}

	// Thêm fallback point từ reminderAt (nếu khác dueDate)
	const fallbackPoint = resolveFallbackPoint(task, timelineBaseDate || baseDate);
	if (fallbackPoint) {
		points.push(fallbackPoint);
	}

	return {
		baseDate,
		points: dedupeAndSortPoints(points),
	};
};

/**
 * Helper tạo job ID duy nhất cho reminder
 * Format: reminder_{type}_{id}_{phase}_{offset}
 *
 * @example
 * buildJobId("TASK", "task-123", "PRE_EVENT", -15)
 * => "reminder_TASK_task-123_PRE_EVENT_-15"
 */
const buildJobId = (type, id, phase, offset) =>
	`reminder_${type}_${id}_${phase}_${offset}`;

/**
 * Lên lịch thông báo cho task
 *
 * @param {Object} task - Task object với id, userId, dueDate, scheduledAt, reminderAt
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
	const { baseDate, points } = resolveSchedulePoints(task, reminders);

	// Nếu không có nguồn thời gian nào để schedule, bỏ qua
	if (!baseDate) {
		console.log(
			`[Scheduler] Task ${task.id} không có dueDate/scheduledAt/reminderAt, skipped scheduling`,
		);
		return;
	}

	if (points.length === 0) {
		console.log(`[Scheduler] Task ${task.id} không có reminder điểm nào trong tương lai, skipped`);
		return;
	}

	let scheduledCount = 0;

	// Lên lịch job cho mỗi điểm thông báo
	for (const p of points) {
		const jobId = buildJobId('TASK', task.id, p.phase, p.offset);
		const delay = p.runAt.getTime() - Date.now();

		// Nếu delay âm (đã qua thời gian thông báo), bỏ qua
		if (delay < 0) {
			console.warn(`[Scheduler] Job ${jobId} has negative delay (${delay}ms), skipping`);
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
				scheduledFor: p.runAt.toISOString(),
				userId: task.userId,
			},
		});

		scheduledCount++;
		console.log(
			`[Scheduler] Scheduled job ${jobId} (delay: ${Math.round(delay / 1000)}s, runAt: ${p.runAt.toISOString()})`,
		);
	}

	console.log(`[Scheduler] Task ${task.id}: scheduled ${scheduledCount}/${points.length} jobs`);
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
	const prefix = `reminder_${targetType}_${targetId}`;

	try {
		const removedCount = await removeJobsByPrefix(prefix);
		console.log(`[Scheduler] Cancelled ${removedCount} jobs for ${targetType}:${targetId}`);
		return removedCount;
	} catch (error) {
		console.error(`[Scheduler] Error cancelling jobs: ${error.message}`);
		throw error;
	}
};

/**
 * Reschedule: Hủy job cũ + Lên lịch job mới
 * Được gọi khi task dueDate/reminderAt thay đổi
 *
 * Guard: Chỉ reschedule nếu task có dueDate/scheduledAt/reminderAt
 *
 * @param {Object} task - Task object với thông tin mới nhất
 * @param {Array<Object>} reminders - Danh sách reminder mới
 */
export const rescheduleTask = async (task, reminders = []) => {
	// Guard 1: Kiểm tra task có baseTime không
	const baseTime = task.dueDate || task.scheduledAt || task.reminderAt;
	if (!baseTime) {
		console.log(
			`[Scheduler] Task ${task.id} không có dueDate/scheduledAt/reminderAt, skip reschedule`,
		);
		await cancelAllForTarget('TASK', task.id); // Vẫn hủy job cũ nếu có
		return;
	}

	// Guard 2: Kiểm tra có reminder không
	const hasReminders =
		(Array.isArray(reminders) && reminders.length > 0) || Boolean(task.reminderAt);
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
