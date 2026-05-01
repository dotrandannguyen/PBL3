/**
 * Notification Worker v2 - Xử lý job BullMQ gửi thông báo
 *
 * Nhiệm vụ:
 * 1. Lắng nghe job từ notification-reminder queue
 * 2. Phân loại job theo source (TASK | EVENT) hoặc legacy (targetType)
 * 3. Validate entity còn hiệu lực
 * 4. Tạo notification record (idempotent via notifKey unique)
 * 5. Emit socket event chuẩn NOTIFICATION_CREATED với đầy đủ metadata
 *
 * Idempotency:
 * - v2 notifKey: "notif:{source}:{sourceId}:{type}"
 * - v1 notifKey: "task:{id}:{phase}:{offset}" (legacy)
 * - Unique constraint DB là safety net cuối cùng
 *
 * Backward compat:
 * - Job payload v1 có targetType/targetId/phase/offset → map sang v2 format
 * - Job payload v2 có source/sourceId/type → xử lý trực tiếp
 * - Socket event cũ TASK_EVENT_REMINDER vẫn emit song song trong giai đoạn chuyển đổi
 */

import { Worker } from 'bullmq';
import connection from '../../config/redis.js';
import prisma from '../../config/database.js';
import { getIO } from '../../common/realtime/socket.gateway.js';

const STALE_DRIFT_MS = 60 * 1000; // 1 phút

// ============================================================
// UTILS
// ============================================================

const toValidDate = (value) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// ============================================================
// PAYLOAD NORMALIZATION
// Chuẩn hóa payload v1/v2 về format nội bộ thống nhất
// ============================================================

/**
 * Normalize job.data thành payload chuẩn v2
 * Hỗ trợ cả v1 (targetType/phase/offset) và v2 (source/sourceId/type)
 */
const normalizePayload = (data) => {
	// v2 format: source, sourceId, type đã rõ ràng
	if (data.source && data.sourceId && data.type) {
		return {
			source: data.source,          // 'TASK' | 'EVENT'
			sourceId: data.sourceId,       // entity ID
			type: data.type,               // NotifType enum string
			runAt: data.runAt,
			userId: data.userId,
			// v1 compat fields (có thể undefined)
			phase: data.phase,
			offset: data.offset,
			scheduledFor: data.scheduledFor,
			targetType: data.targetType,
			targetId: data.targetId,
		};
	}

	// v1 format: targetType/targetId/phase/offset → map sang v2
	if (data.targetType && data.targetId) {
		const type = phaseToNotifType(data.phase);
		return {
			source: data.targetType,       // 'TASK'
			sourceId: data.targetId,
			type,
			runAt: data.scheduledFor,
			userId: data.userId,
			// giữ v1 refs
			phase: data.phase,
			offset: data.offset,
			scheduledFor: data.scheduledFor,
			targetType: data.targetType,
			targetId: data.targetId,
		};
	}

	return null; // payload không hợp lệ
};

// ============================================================
// NOTIF KEY BUILDER
// ============================================================

/**
 * Build notifKey v2 (chuẩn mới)
 * "notif:{source}:{sourceId}:{type}"
 */
const buildNotifKeyV2 = (source, sourceId, type) =>
	`notif:${source.toLowerCase()}:${sourceId}:${type}`;

/**
 * Build notifKey v1 (legacy) — dùng khi job từ scheduler cũ
 * "task:{taskId}:{phase}:{offset}"
 */
const buildNotifKeyV1 = (targetId, phase, offset) =>
	`task:${targetId}:${phase}:${offset}`;

// ============================================================
// PHASE → NotifType MAPPING (v1 compat)
// ============================================================

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
			return 'TASK_DUE';
	}
};

// ============================================================
// STALE CHECK
// ============================================================

const resolveTaskBaseTime = (task) =>
	toValidDate(task?.dueDate) ||
	toValidDate(task?.scheduledAt) ||
	toValidDate(task?.reminderAt);

/**
 * Kiểm tra job có bị stale không (task đã update sau khi job được schedule)
 * Chỉ áp dụng cho v1 jobs có offset
 */
const shouldSkipStaleV1Job = (task, offset, scheduledFor) => {
	const baseTime = resolveTaskBaseTime(task);
	if (!baseTime) return true;

	if (typeof offset !== 'number' || Number.isNaN(offset)) return false;

	const expectedRunAt = new Date(baseTime.getTime() + offset * 60000);
	const payloadRunAt = toValidDate(scheduledFor);

	if (payloadRunAt) {
		return Math.abs(payloadRunAt.getTime() - expectedRunAt.getTime()) > STALE_DRIFT_MS;
	}

	return expectedRunAt.getTime() - Date.now() > STALE_DRIFT_MS;
};

// ============================================================
// MESSAGE BUILDER
// ============================================================

const buildMessageForType = (item, type, source) => {
	if (!item?.title) return null;
	const t = item.title;

	switch (type) {
		case 'TASK_START':
			return `"${t}" đã bắt đầu!`;
		case 'TASK_DUE':
			return `"${t}" đã đến hạn - hãy kiểm tra ngay!`;
		case 'TASK_REMINDER':
			return item.reminderAt
				? `Nhắc nhở: "${t}" sắp đến hạn`
				: `Nhắc nhở: "${t}"`;
		case 'EVENT_START':
			return `Sự kiện "${t}" đã bắt đầu!`;
		case 'EVENT_END':
			return `Sự kiện "${t}" đã kết thúc`;
		case 'EVENT_REMINDER':
			return `Sắp đến: "${t}"`;
		default:
			return `Thông báo về "${t}"`;
	}
};

/**
 * Build message cho v1 jobs (phase-based) — backward compat
 */
const buildMessageLegacy = (item, phase, offset) => {
	if (!item?.title) return null;
	const t = item.title;

	switch (phase) {
		case 'PRE_EVENT': {
			const min = Math.abs(offset);
			if (min < 60) return `"${t}" sắp diễn ra trong ${min} phút`;
			const h = Math.round(min / 60);
			if (h < 24) return `"${t}" sắp diễn ra trong ${h} giờ`;
			return `"${t}" sắp diễn ra trong ${Math.round(h / 24)} ngày`;
		}
		case 'ON_TIME':
			return `"${t}" đã đến hạn - hãy kiểm tra ngay!`;
		case 'START_TIME':
			return `"${t}" đã bắt đầu!`;
		case 'OVERDUE': {
			const min = Math.abs(offset);
			if (min === 0) return `"${t}" đã quá hạn`;
			if (min < 60) return `"${t}" đã quá hạn ${min} phút`;
			const h = Math.round(min / 60);
			if (h < 24) return `"${t}" đã quá hạn hơn ${h} giờ`;
			return `"${t}" đã quá hạn hơn ${Math.round(h / 24)} ngày`;
		}
		case 'CUSTOM':
			return offset === 0
				? `Đã đến giờ nhắc cho "${t}"`
				: `"${t}" - reminder: ${offset < 0 ? `trước ${Math.abs(offset)} phút` : `sau ${offset} phút`}`;
		default:
			return `Thông báo về "${t}"`;
	}
};

// ============================================================
// ENTITY RESOLVER
// ============================================================

/**
 * Fetch entity và validate còn hiệu lực
 * Returns { entity, skip: boolean }
 */
const resolveEntity = async (source, sourceId) => {
	if (source === 'TASK') {
		const task = await prisma.task.findUnique({
			where: { id: sourceId },
			select: {
				id: true, title: true, status: true,
				userId: true, dueDate: true,
				scheduledAt: true, reminderAt: true, deletedAt: true,
				type: true,
			},
		});

		if (!task) {
			console.log(`[WorkerV2] Task ${sourceId} không tồn tại, skipped`);
			return { entity: null, skip: true };
		}
		if (task.deletedAt) {
			console.log(`[WorkerV2] Task ${sourceId} đã deleted, skipped`);
			return { entity: null, skip: true };
		}
		if (task.status === 'DONE') {
			console.log(`[WorkerV2] Task ${sourceId} đã DONE, skipped`);
			return { entity: null, skip: true };
		}

		return { entity: task, skip: false };
	}

	if (source === 'EVENT') {
		const event = await prisma.event.findUnique({
			where: { id: sourceId },
			select: {
				id: true, title: true, userId: true,
				startAt: true, endAt: true, reminderAt: true,
				linkedTaskId: true,
			},
		});

		if (!event) {
			console.log(`[WorkerV2] Event ${sourceId} không tồn tại, skipped`);
			return { entity: null, skip: true };
		}

		// Rule cứng: event có linkedTask thì worker cũng skip
		// (scheduler đã không schedule, nhưng để an toàn kiểm tra lại)
		if (event.linkedTaskId) {
			console.log(`[WorkerV2] Event ${sourceId} có linkedTaskId, skipped`);
			return { entity: null, skip: true };
		}

		return { entity: event, skip: false };
	}

	console.warn(`[WorkerV2] Unknown source: ${source}`);
	return { entity: null, skip: true };
};

// ============================================================
// WORKER
// ============================================================

const worker = new Worker(
	'notification-reminder',
	async (job) => {
		const jobId = job.opts?.jobId || job.id;
		const rawData = job.data;

		console.log(`[WorkerV2] Processing job ${jobId}`);

		try {
			// 1. Normalize payload v1/v2
			const payload = normalizePayload(rawData);
			if (!payload) {
				console.warn(`[WorkerV2] Job ${jobId} có payload không hợp lệ, skipped`);
				return;
			}

			const { source, sourceId, type, userId } = payload;

			// 2. Fetch entity + validate
			const { entity, skip } = await resolveEntity(source, sourceId);
			if (skip) return;

			// 3. Stale check cho v1 jobs
			if (source === 'TASK' && payload.phase && typeof payload.offset === 'number') {
				if (shouldSkipStaleV1Job(entity, payload.offset, payload.scheduledFor)) {
					console.log(`[WorkerV2] Job ${jobId} stale, skipped`);
					return;
				}
			}

			// 4. Build message
			const isLegacyJob = Boolean(payload.phase);
			const message = isLegacyJob
				? buildMessageLegacy(entity, payload.phase, payload.offset)
				: buildMessageForType(entity, type, source);

			if (!message) {
				console.warn(`[WorkerV2] Không build được message cho job ${jobId}`);
				return;
			}

			// 5. Build notifKey (v2 preferred, v1 fallback cho legacy jobs)
			const notifKey = isLegacyJob && typeof payload.offset === 'number'
				? buildNotifKeyV1(sourceId, payload.phase, payload.offset)
				: buildNotifKeyV2(source, sourceId, type);

			// 6. Idempotency check
			const existing = await prisma.notification.findUnique({
				where: { notifKey },
				select: { id: true },
			});

			if (existing) {
				console.log(`[WorkerV2] Notification ${notifKey} đã tồn tại (dedup), skipped`);
				return;
			}

			// 7. Tạo notification record
			const targetUserId = entity?.userId || userId;
			let notification;

			try {
				notification = await prisma.notification.create({
					data: {
						userId: targetUserId,
						// v2 fields
						source,
						sourceId,
						// backward compat: giữ taskId nếu source=TASK
						taskId: source === 'TASK' ? sourceId : null,
						type,
						title: entity?.title || null,
						content: message,
						notifKey,
						scheduledAt: new Date(),
						sentAt: new Date(),
						status: 'SENT',
					},
				});
			} catch (dbError) {
				// Race condition: another worker created it first
				if (dbError?.code === 'P2002' || dbError?.message?.includes('Unique constraint')) {
					console.log(`[WorkerV2] Duplicate (race) for ${notifKey}, skipped`);
					return;
				}
				throw dbError;
			}

			console.log(`[WorkerV2] Created notification ${notification.id} (key: ${notifKey}) for user ${targetUserId}`);

			// 8. Emit socket events
			const io = getIO();
			if (io) {
				// v2: socket event chuẩn — FE phân loại theo type
				io.to(targetUserId).emit('NOTIFICATION_CREATED', {
					id: notification.id,
					source,
					sourceId,
					type,
					title: entity?.title || null,
					message,
					isRead: false,
					createdAt: notification.createdAt,
					// backward compat fields cho FE chưa migrate
					taskId: source === 'TASK' ? sourceId : null,
					eventType: type,
					taskTitle: source === 'TASK' ? entity?.title : null,
					dueDate: source === 'TASK' ? entity?.dueDate : null,
					phase: payload.phase || null,
					offset: payload.offset ?? null,
				});

				// v1 legacy emit — giữ trong giai đoạn chuyển đổi để FE không bị gãy
				// TODO: Xóa sau khi FE đã migrate sang NOTIFICATION_CREATED
				if (source === 'TASK') {
					io.to(targetUserId).emit('TASK_EVENT_REMINDER', {
						id: notification.id,
						eventType: 'TASK_REMINDER',
						type: notification.type,
						taskTitle: entity?.title || null,
						dueDate: entity?.dueDate || null,
						message,
						taskId: sourceId,
						phase: payload.phase || null,
						offset: payload.offset ?? null,
						createdAt: notification.createdAt,
					});
				}

				console.log(`[WorkerV2] Emitted NOTIFICATION_CREATED (+ legacy) to user ${targetUserId}`);
			} else {
				console.warn('[WorkerV2] Socket.io not initialized, skipped emit');
			}
		} catch (error) {
			console.error(`[WorkerV2] Error processing job ${jobId}:`, error);
			throw error; // BullMQ retry
		}
	},
	{
		connection,
		settings: { maxStalledCount: 2 },
		concurrency: 5,
	},
);

// Worker event listeners
worker.on('completed', (job) => {
	console.log(`[WorkerV2] Job ${job.opts?.jobId || job.id} completed`);
});

worker.on('failed', (job, err) => {
	console.error(`[WorkerV2] Job ${job?.opts?.jobId || job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
	console.error('[WorkerV2] Worker error:', err);
});

export default worker;
