/**
 * Notification Scheduler v2 - Type-based scheduling
 *
 * Architecture:
 * - Task Scheduler v2: type-based (TASK_START, TASK_DUE, TASK_REMINDER)
 * - Event Scheduler v2: độc lập, skip nếu linkedTaskId != null
 *
 * Job ID format chuẩn:
 * - TASK-{taskId}-{TYPE}     → TASK-abc123-TASK_DUE
 * - EVENT-{eventId}-{TYPE}   → EVENT-xyz456-EVENT_START
 *
 * (giữ lại hàm cũ scheduleForTask/cancelAllForTarget/rescheduleTask
 *  để backward compat với code chưa migrate)
 */

import { addNotificationJob, removeJobsByPrefix } from './notification.queue.js';

// ============================================================
// UTILS
// ============================================================

const toValidDate = (value) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const EVENT_REMINDER_OFFSETS = {
	NONE: null,
	MINUTES_5: 5,
	MINUTES_15: 15,
	HOUR_1: 60,
};

const toEventStartAtFromLegacy = (event) => {
	const directStartAt = toValidDate(event?.startAt);
	if (directStartAt) {
		return directStartAt;
	}

	if (!event?.date || typeof event?.time !== 'string') {
		return null;
	}

	const datePart =
		event.date instanceof Date
			? event.date.toISOString().slice(0, 10)
			: `${event.date}`.slice(0, 10);

	const parsed = new Date(`${datePart}T${event.time}:00`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toEventReminderAtFromLegacy = (event, resolvedStartAt) => {
	const directReminderAt = toValidDate(event?.reminderAt);
	if (directReminderAt) {
		return directReminderAt;
	}

	if (!resolvedStartAt) {
		return null;
	}

	const reminderOffset = EVENT_REMINDER_OFFSETS[event?.reminder] ?? null;
	if (reminderOffset === null) {
		return null;
	}

	return new Date(resolvedStartAt.getTime() - reminderOffset * 60000);
};

/**
 * Build job ID v2 (chuẩn mới)
 * Format: {SOURCE}-{sourceId}-{TYPE}
 * @example buildJobIdV2('TASK', 'abc123', 'TASK_DUE') => 'TASK-abc123-TASK_DUE'
 */
export const buildJobIdV2 = (source, sourceId, type) => `${source}-${sourceId}-${type}`;

/**
 * Build idempotency key v2 cho DB
 * Format: notif:{source}:{sourceId}:{type}
 */
export const buildNotifKeyV2 = (source, sourceId, type) =>
	`notif:${source.toLowerCase()}:${sourceId}:${type}`;

/**
 * Xóa tất cả jobs v2 của 1 source entity
 * Prefix: TASK-{taskId} hoặc EVENT-{eventId}
 */
export const removeJobsV2 = async (source, sourceId) => {
	const prefix = `${source}-${sourceId}`;
	try {
		const removedCount = await removeJobsByPrefix(prefix);
		console.log(
			`[SchedulerV2] Removed ${removedCount} jobs for ${source}:${sourceId}`,
		);
		return removedCount;
	} catch (error) {
		console.error(
			`[SchedulerV2] Error removing jobs for ${source}:${sourceId}:`,
			error.message,
		);
		throw error;
	}
};

/**
 * Helper: schedule 1 job nếu runAt trong tương lai
 */
const scheduleJobIfFuture = async (jobId, payload, runAt) => {
	const delay = runAt.getTime() - Date.now();
	if (delay < 0) {
		console.log(`[SchedulerV2] Job ${jobId} đã qua (delay=${delay}ms), skipped`);
		return false;
	}

	await addNotificationJob({ jobId, payload, delay });
	console.log(`[SchedulerV2] Scheduled ${jobId} (delay: ${Math.round(delay / 1000)}s)`);
	return true;
};

// ============================================================
// TASK SCHEDULER V2
// ============================================================

/**
 * Schedule notifications cho Task theo type
 *
 * Rules:
 * - TODO: TASK_DUE tại dueDate; TASK_REMINDER tại reminderAt (nếu có)
 * - SCHEDULED: TASK_START tại scheduledAt; TASK_DUE tại dueDate; TASK_REMINDER tại reminderAt
 *
 * Alias nội bộ: startAt = scheduledAt, endAt = dueDate
 *
 * @param {Object} task - Task object với id, userId, type, dueDate, scheduledAt, reminderAt
 */
export const scheduleTaskV2 = async (task) => {
	if (!task?.id || !task?.userId) {
		console.warn('[SchedulerV2] scheduleTaskV2: task thiếu id hoặc userId');
		return;
	}

	// Alias v2
	const startAt = toValidDate(task.scheduledAt); // startAt = scheduledAt
	const endAt = toValidDate(task.dueDate); // endAt   = dueDate
	const reminderAt = toValidDate(task.reminderAt);

	// Resolve type: ưu tiên task.type, fallback suy diễn từ scheduledAt
	const taskType =
		task.type === 'SCHEDULED'
			? 'SCHEDULED'
			: task.type === 'TODO'
				? 'TODO'
				: startAt
					? 'SCHEDULED' // backward compat: có scheduledAt -> SCHEDULED
					: 'TODO';

	let scheduledCount = 0;

	// TODO: TASK_DUE + TASK_REMINDER
	// SCHEDULED: TASK_START + TASK_DUE + TASK_REMINDER
	const jobs = [];

	if (taskType === 'SCHEDULED' && startAt) {
		jobs.push({
			jobId: buildJobIdV2('TASK', task.id, 'TASK_START'),
			type: 'TASK_START',
			runAt: startAt,
		});
	}

	if (endAt) {
		jobs.push({
			jobId: buildJobIdV2('TASK', task.id, 'TASK_DUE'),
			type: 'TASK_DUE',
			runAt: endAt,
		});
	}

	if (reminderAt) {
		jobs.push({
			jobId: buildJobIdV2('TASK', task.id, 'TASK_REMINDER'),
			type: 'TASK_REMINDER',
			runAt: reminderAt,
		});
	}

	if (jobs.length === 0) {
		console.log(
			`[SchedulerV2] Task ${task.id} không có mốc thời gian nào để schedule`,
		);
		return;
	}

	for (const j of jobs) {
		const ok = await scheduleJobIfFuture(
			j.jobId,
			{
				source: 'TASK',
				sourceId: task.id,
				type: j.type,
				runAt: j.runAt.toISOString(),
				userId: task.userId,
			},
			j.runAt,
		);
		if (ok) scheduledCount++;
	}

	console.log(
		`[SchedulerV2] Task ${task.id} (${taskType}): scheduled ${scheduledCount}/${jobs.length} jobs`,
	);
};

/**
 * Reschedule Task v2: xóa job cũ → schedule mới
 * Gọi khi task được create/update/restore
 */
export const rescheduleTaskV2 = async (task) => {
	await removeJobsV2('TASK', task.id);
	await scheduleTaskV2(task);
	console.log(`[SchedulerV2] Rescheduled task ${task.id}`);
};

/**
 * Cancel tất cả jobs của 1 task (khi DONE hoặc delete)
 */
export const cancelTaskJobsV2 = async (taskId) => {
	return await removeJobsV2('TASK', taskId);
};

// ============================================================
// EVENT SCHEDULER V2
// ============================================================

/**
 * Schedule notifications cho Event theo type
 *
 * Rules:
 * - Nếu event.linkedTaskId != null → SKIP (Task Scheduler chịu trách nhiệm)
 * - EVENT_START tại startAt (nếu có)
 * - EVENT_END tại endAt (nếu có)
 * - EVENT_REMINDER tại reminderAt (nếu có)
 *
 * @param {Object} event - Event object với id, userId, linkedTaskId, startAt, endAt, reminderAt
 */
export const scheduleEventV2 = async (event) => {
	if (!event?.id || !event?.userId) {
		console.warn('[SchedulerV2] scheduleEventV2: event thiếu id hoặc userId');
		return;
	}

	// Rule cứng: Event linked Task -> SKIP
	if (event.linkedTaskId) {
		console.log(
			`[SchedulerV2] Event ${event.id} có linkedTaskId=${event.linkedTaskId}, skip event scheduling`,
		);
		return;
	}

	const startAt = toEventStartAtFromLegacy(event);
	const endAt = toValidDate(event.endAt);
	const reminderAt = toEventReminderAtFromLegacy(event, startAt);

	if (!startAt && !endAt && !reminderAt) {
		console.log(
			`[SchedulerV2] Event ${event.id} không có startAt/endAt/reminderAt, skipped`,
		);
		return;
	}

	const jobs = [];

	if (startAt) {
		jobs.push({
			jobId: buildJobIdV2('EVENT', event.id, 'EVENT_START'),
			type: 'EVENT_START',
			runAt: startAt,
		});
	}

	if (endAt) {
		jobs.push({
			jobId: buildJobIdV2('EVENT', event.id, 'EVENT_END'),
			type: 'EVENT_END',
			runAt: endAt,
		});
	}

	if (reminderAt) {
		jobs.push({
			jobId: buildJobIdV2('EVENT', event.id, 'EVENT_REMINDER'),
			type: 'EVENT_REMINDER',
			runAt: reminderAt,
		});
	}

	let scheduledCount = 0;

	for (const j of jobs) {
		const ok = await scheduleJobIfFuture(
			j.jobId,
			{
				source: 'EVENT',
				sourceId: event.id,
				type: j.type,
				runAt: j.runAt.toISOString(),
				userId: event.userId,
			},
			j.runAt,
		);
		if (ok) scheduledCount++;
	}

	console.log(
		`[SchedulerV2] Event ${event.id}: scheduled ${scheduledCount}/${jobs.length} jobs`,
	);
};

/**
 * Reschedule Event v2: xóa job cũ → schedule mới
 * Gọi khi event create/update
 */
export const rescheduleEventV2 = async (event) => {
	await removeJobsV2('EVENT', event.id);
	await scheduleEventV2(event);
	console.log(`[SchedulerV2] Rescheduled event ${event.id}`);
};

/**
 * Cancel tất cả jobs của 1 event (khi delete)
 */
export const cancelEventJobsV2 = async (eventId) => {
	return await removeJobsV2('EVENT', eventId);
};

// ============================================================
// LEGACY COMPAT — giữ nguyên API cũ, delegate sang v2 khi có thể
// ============================================================

// Legacy: buildSchedulePoints từ notification.policy.js
import { buildSchedulePoints } from './notification.policy.js';

const DEFAULT_TASK_REMINDERS = [{ phase: 'ON_TIME', offset: 0 }];

const resolveFallbackPoint = (task, baseDate) => {
	const reminderAt = toValidDate(task?.reminderAt);
	if (!reminderAt || reminderAt.getTime() <= Date.now()) return null;

	const offset = Math.round((reminderAt.getTime() - baseDate.getTime()) / 60000);
	const hasTaskTimeline = Boolean(task?.dueDate || task?.scheduledAt);

	let phase = 'CUSTOM';
	if (hasTaskTimeline) {
		if (offset < 0) phase = 'PRE_EVENT';
		else if (offset === 0) phase = 'ON_TIME';
		else phase = 'OVERDUE';
	}

	return { phase, offset, runAt: reminderAt };
};

const dedupeAndSortPoints = (points = []) => {
	const seen = new Set();
	return points
		.filter((p) => p?.runAt instanceof Date)
		.filter((p) => {
			const key = `${p.phase}:${p.offset}:${p.runAt.getTime()}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
};

const resolveSchedulePoints = (task, reminders = []) => {
	const dueDate = toValidDate(task?.dueDate);
	const scheduledAt = toValidDate(task?.scheduledAt);
	const reminderAt = toValidDate(task?.reminderAt);

	const timelineBaseDate = dueDate || scheduledAt;
	const baseDate = timelineBaseDate || reminderAt;

	if (!baseDate) return { baseDate: null, points: [] };

	if (Array.isArray(reminders) && reminders.length > 0) {
		const pts = buildSchedulePoints(baseDate, reminders);
		if (pts.length > 0) return { baseDate, points: dedupeAndSortPoints(pts) };
	}

	const points = [];
	if (timelineBaseDate) {
		points.push(...buildSchedulePoints(timelineBaseDate, DEFAULT_TASK_REMINDERS));
	}

	const fallback = resolveFallbackPoint(task, timelineBaseDate || baseDate);
	if (fallback) points.push(fallback);

	return { baseDate, points: dedupeAndSortPoints(points) };
};

const buildJobId = (type, id, phase, offset) =>
	`reminder_${type}_${id}_${phase}_${offset}`;

/**
 * @deprecated Dùng scheduleTaskV2() thay thế
 * Giữ lại để backward compat với task.service.js hiện tại
 * Đồng thời schedule cả v2 jobs để dual-write trong giai đoạn chuyển đổi
 */
export const scheduleForTask = async (task, reminders = []) => {
	// Schedule v2 jobs (luồng mới)
	await scheduleTaskV2(task);

	// Schedule v1 jobs (legacy fallback)
	const { baseDate, points } = resolveSchedulePoints(task, reminders);
	if (!baseDate || points.length === 0) return;

	for (const p of points) {
		const jobId = buildJobId('TASK', task.id, p.phase, p.offset);
		const delay = p.runAt.getTime() - Date.now();
		if (delay < 0) continue;

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
				// v2 fields (backward compat trong payload)
				source: 'TASK',
				sourceId: task.id,
				type:
					p.phase === 'START_TIME'
						? 'TASK_START'
						: p.phase === 'PRE_EVENT' || p.phase === 'CUSTOM'
							? 'TASK_REMINDER'
							: 'TASK_DUE',
			},
		});
	}
};

/**
 * @deprecated Dùng cancelTaskJobsV2() thay thế
 */
export const cancelAllForTarget = async (targetType, targetId) => {
	const prefix = `reminder_${targetType}_${targetId}`;
	try {
		const v1Count = await removeJobsByPrefix(prefix);
		// Cũng xóa v2 jobs nếu targetType = TASK
		let v2Count = 0;
		if (targetType === 'TASK') {
			v2Count = await removeJobsV2('TASK', targetId);
		} else if (targetType === 'EVENT') {
			v2Count = await removeJobsV2('EVENT', targetId);
		}
		console.log(
			`[Scheduler] Cancelled ${v1Count} v1 + ${v2Count} v2 jobs for ${targetType}:${targetId}`,
		);
		return v1Count + v2Count;
	} catch (error) {
		console.error(`[Scheduler] Error cancelling jobs:`, error.message);
		throw error;
	}
};

/**
 * @deprecated Dùng rescheduleTaskV2() thay thế
 */
export const rescheduleTask = async (task, reminders = []) => {
	const baseTime = task.dueDate || task.scheduledAt || task.reminderAt;
	if (!baseTime) {
		await cancelAllForTarget('TASK', task.id);
		return;
	}

	const hasReminders =
		(Array.isArray(reminders) && reminders.length > 0) || Boolean(task.reminderAt);
	if (!hasReminders) {
		await cancelAllForTarget('TASK', task.id);
		return;
	}

	await cancelAllForTarget('TASK', task.id);
	await scheduleForTask(task, reminders);
	console.log(`[Scheduler] Rescheduled task ${task.id}`);
};
