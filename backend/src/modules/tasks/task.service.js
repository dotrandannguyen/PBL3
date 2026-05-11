import { taskRepository } from './task.repository.js';
import { NotFoundException, OptionalException } from '../../common/exceptions/index.js';
import { StatusCodes } from 'http-status-codes';
import { eventRepository } from '../events/event.repository.js';
import {
	scheduleForTask,
	cancelAllForTarget,
	rescheduleTask,
	scheduleTaskV2,
	rescheduleTaskV2,
	cancelTaskJobsV2,
} from '../notifications/notification.schedule.js';

const DEFAULT_TASK_EVENT_COLOR = '#2383e2';
const CALENDAR_METADATA_KEY = 'calendar';

const parseDateValue = (value) => {
	if (!value) {
		return null;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed;
};

const isSameInstant = (a, b) => {
	const dateA = parseDateValue(a);
	const dateB = parseDateValue(b);

	if (!dateA && !dateB) {
		return true;
	}

	if (!dateA || !dateB) {
		return false;
	}

	return dateA.getTime() === dateB.getTime();
};

const hasScheduleSource = (task) =>
	Boolean(task?.dueDate || task?.scheduledAt || task?.reminderAt);

/**
 * Resolve TaskType từ task data
 * - Có scheduledAt (startAt) -> SCHEDULED
 * - Không có -> TODO
 */
const resolveTaskType = (task) => (task?.scheduledAt ? 'SCHEDULED' : 'TODO');

const hasSchedulingChange = (beforeTask, afterTask) =>
	!isSameInstant(beforeTask?.dueDate, afterTask?.dueDate) ||
	!isSameInstant(beforeTask?.scheduledAt, afterTask?.scheduledAt) ||
	!isSameInstant(beforeTask?.reminderAt, afterTask?.reminderAt);

/**
 * Task Service - Business Logic Layer
 *
 * Nhiệm vụ:
 * 1. Xử lý logic nghiệp vụ
 * 2. Map giữa API format (completed: boolean) và DB format (status: enum)
 * 3. Validate business rules
 * 4. Gọi repository để thao tác database
 */
export const taskService = {
	/**
	 * Lấy danh sách tasks với pagination, filter, search
	 *
	 * @param {String} userId - ID của user
	 * @param {Object} query - { page, limit, completed, search }
	 * @returns {Object} { data: [], pagination: {} }
	 */
	getTasks: async (userId, query) => {
		const page = Number.parseInt(query.page, 10) || 1;
		const limit = Number.parseInt(query.limit, 10) || 10;
		const skip = (page - 1) * limit;
		const repositoryQuery = {
			completed: query.completed,
			search: query.search || undefined,
			workspaceId: query.workspaceId,
			skip,
			take: limit,
		};

		const [tasks, totalItems] = await Promise.all([
			taskRepository.findMany(userId, repositoryQuery),
			taskRepository.countTasks(userId, repositoryQuery),
		]);
		const totalPages = Math.ceil(totalItems / limit);

		return {
			data: tasks.map(mapTask),
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
			},
		};
	},

	/**
	 * Lấy chi tiết 1 task
	 */
	getTaskById: async (userId, taskId) => {
		const task = await taskRepository.findById(userId, taskId);

		if (!task) {
			throw new NotFoundException('Task không tồn tại.');
		}

		return mapTask(task);
	},

	/**
	 * Tạo task mới
	 *
	 * @param {String} userId
	 * @param {Object} data - { title, description?, priority?, dueDate?, startAt? }
	 */
	createTask: async (userId, data) => {
		const dueDate = parseDateValue(data.dueDate);
		const scheduledAt = parseDateValue(data.startAt);
		const reminderAt = parseDateValue(data.reminderAt);

		if (reminderAt && reminderAt.getTime() <= Date.now()) {
			throw new OptionalException('Thời gian nhắc nhở phải ở tương lai.');
		}

		if (dueDate && dueDate.getTime() < Date.now()) {
			throw new OptionalException('Hạn chót không được ở quá khứ.');
		}

		const taskData = {
			title: data.title,
			description: data.description ?? null,
			priority: data.priority ?? 'MEDIUM',
			dueDate,
			reminderAt,
			scheduledAt,
			status: 'PENDING',
			type: scheduledAt ? 'SCHEDULED' : 'TODO',
			parentId: data.parentId ?? null,
			workspaceId: data.workspaceId ?? null,
		};

		const task = await taskRepository.create(userId, taskData);

		if (task.scheduledAt) {
			const calendarEventId = await upsertScheduledTaskEvent(
				userId,
				task,
				task.scheduledAt,
			);

			await taskRepository.update(userId, task.id, {
				sourceMetadata: withCalendarMetadata(
					task.sourceMetadata,
					calendarEventId,
				),
			});
		}

		const createdTask = await taskRepository.findById(userId, task.id);

		if (hasScheduleSource(createdTask)) {
			// v2: schedule theo type
			await scheduleTaskV2(createdTask);
		}

		return mapTask(createdTask);
	},

	/**
	 * Cập nhật task (title, description, priority, dueDate, startAt, status, type)
	 *
	 * @param {String} userId
	 * @param {String} taskId
	 * @param {Object} data - v2: { title?, description?, priority?, dueDate?, startAt?, reminderAt?, status?, type? }
	 */
	updateTask: async (userId, taskId, data) => {
		const existingTask = await taskRepository.findById(userId, taskId);
		if (!existingTask) {
			throw new NotFoundException('Task không tồn tại.');
		}

		const updateData = {};

		if (data.title !== undefined) {
			updateData.title = data.title;
		}
		if (data.description !== undefined) {
			updateData.description = data.description;
		}
		if (data.priority !== undefined) {
			updateData.priority = data.priority;
		}
		if (data.parentId !== undefined) {
			updateData.parentId = data.parentId;
		}
		if (data.workspaceId !== undefined) {
			updateData.workspaceId =
				data.workspaceId === 'null' ? null : data.workspaceId;
		}
		if (data.dueDate !== undefined) {
			updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
		}
		// v2: startAt là alias của scheduledAt
		if (data.startAt !== undefined) {
			updateData.scheduledAt = data.startAt ? new Date(data.startAt) : null;
		}
		if (data.reminderAt !== undefined) {
			const nextReminderAt = parseDateValue(data.reminderAt);
			if (nextReminderAt && nextReminderAt.getTime() <= Date.now()) {
				throw new OptionalException('Thời gian nhắc nhở phải ở tương lai.');
			}
			updateData.reminderAt = nextReminderAt;
		}

		if (data.dueDate !== undefined || data.startAt !== undefined) {
			const checkDueDate =
				data.dueDate !== undefined
					? parseDateValue(data.dueDate)
					: existingTask.dueDate;

			if (checkDueDate && checkDueDate.getTime() < Date.now()) {
				throw new OptionalException('Hạn chót không được ở quá khứ.');
			}
		}

		if (data.status !== undefined) {
			updateData.status = data.status;

			if (existingTask.status !== 'DONE' && data.status === 'DONE') {
				updateData.completedAt = new Date();
			}

			if (existingTask.status === 'DONE' && data.status !== 'DONE') {
				updateData.completedAt = null;
			}
		}

		// v2: type — FE có thể gửi tường minh, hoặc auto-resolve từ scheduledAt
		if (data.type !== undefined) {
			updateData.type = data.type;
		} else if (updateData.scheduledAt !== undefined) {
			// Auto-resolve type từ scheduledAt nếu FE không gửi type
			updateData.type = updateData.scheduledAt ? 'SCHEDULED' : 'TODO';
		}

		await taskRepository.update(userId, taskId, updateData);
		const updatedTask = await taskRepository.findById(userId, taskId);

		// Sync linked Calendar Event nếu task đã có scheduledAt
		// (title/description thay đổi hoặc startAt/dueDate thay đổi)
		const scheduleTimingChanged =
			data.startAt !== undefined || data.dueDate !== undefined;
		const metadataChanged =
			data.title !== undefined || data.description !== undefined;

		if (updatedTask?.scheduledAt && (scheduleTimingChanged || metadataChanged)) {
			await upsertScheduledTaskEvent(
				userId,
				updatedTask,
				new Date(updatedTask.scheduledAt),
			);
		}

		const becameDone =
			existingTask.status !== 'DONE' && updatedTask.status === 'DONE';
		const reopened = existingTask.status === 'DONE' && updatedTask.status !== 'DONE';
		const scheduleChanged = hasSchedulingChange(existingTask, updatedTask);

		if (becameDone) {
			console.log(
				`[TaskService] Cancelling jobs for task ${updatedTask.id} (status=DONE)`,
			);
			await cancelTaskJobsV2(updatedTask.id);
			await cancelAllForTarget('TASK', updatedTask.id); // legacy
		} else if (
			(scheduleChanged || reopened) &&
			hasScheduleSource(updatedTask) &&
			updatedTask.status !== 'DONE'
		) {
			console.log(`[TaskService] Rescheduling task ${updatedTask.id}`);
			await rescheduleTaskV2(updatedTask);
		} else if (scheduleChanged && !hasScheduleSource(updatedTask)) {
			console.log(
				`[TaskService] Cancelling jobs for task ${updatedTask.id} (no schedule)`,
			);
			await cancelTaskJobsV2(updatedTask.id);
			await cancelAllForTarget('TASK', updatedTask.id); // legacy
		}

		return mapTask(updatedTask);
	},

	/**
	 * Đánh dấu task đã được schedule cho thời điểm startAt
	 */
	markTaskScheduled: async (userId, taskId, startAt) => {
		const existingTask = await taskRepository.findById(userId, taskId);
		if (!existingTask) {
			throw new NotFoundException('Task không tồn tại.');
		}
		const nextScheduledAt = startAt ? new Date(startAt) : null;

		if (isSameInstant(existingTask.scheduledAt, nextScheduledAt)) {
			return mapTask(existingTask);
		}

		const currentCalendarEventId = getCalendarEventId(existingTask.sourceMetadata);

		if (nextScheduledAt) {
			const calendarEventId = await upsertScheduledTaskEvent(
				userId,
				existingTask,
				nextScheduledAt,
				currentCalendarEventId,
			);

			await taskRepository.update(userId, taskId, {
				scheduledAt: nextScheduledAt,
				sourceMetadata: withCalendarMetadata(
					existingTask.sourceMetadata,
					calendarEventId,
				),
			});
		} else {
			if (currentCalendarEventId) {
				await eventRepository.delete(userId, currentCalendarEventId);
			}

			await taskRepository.update(userId, taskId, {
				scheduledAt: null,
				sourceMetadata: withoutCalendarMetadata(existingTask.sourceMetadata),
			});
		}

		const updatedTask = await taskRepository.findById(userId, taskId);
		// Reschedule v2
		if (updatedTask.status !== 'DONE' && hasScheduleSource(updatedTask)) {
			await rescheduleTaskV2(updatedTask);
		} else {
			await cancelTaskJobsV2(updatedTask.id);
			await cancelAllForTarget('TASK', updatedTask.id); // legacy
		}
		return mapTask(updatedTask);
	},

	/**
	 * Xóa task:
	 * - Task MANUAL: soft delete như hiện tại
	 * - Task từ GMAIL/GITHUB: dismiss khỏi app bằng status=ARCHIVED (không xóa dữ liệu gốc ở nguồn ngoài)
	 */
	deleteTask: async (userId, taskId) => {
		const task = await taskRepository.findById(userId, taskId);
		if (!task) {
			throw new NotFoundException('Task không tồn tại.');
		}

		const calendarEventId = getCalendarEventId(task.sourceMetadata);
		if (calendarEventId) {
			await eventRepository.delete(userId, calendarEventId);
		}

		// Hủy tất cả notification jobs liên quan tới task này
		await cancelTaskJobsV2(taskId);
		await cancelAllForTarget('TASK', taskId); // legacy

		const isExternalTask =
			task.sourceType === 'GMAIL' || task.sourceType === 'GITHUB';

		if (isExternalTask) {
			await taskRepository.update(userId, taskId, {
				status: 'ARCHIVED',
				isConverted: true,
				scheduledAt: null,
			});

			return { message: 'Inbox item archived successfully' };
		}

		await taskRepository.softDelete(userId, taskId);

		return { message: 'Task deleted successfully' };
	},

	/**
	 * Lấy danh sách tasks đã xoá (trash)
	 */
	getTrashTasks: async (userId, query) => {
		const page = parseInt(query.page, 10) || 1;
		const limit = parseInt(query.limit, 10) || 50;
		const skip = (page - 1) * limit;

		const repositoryQuery = {
			search: query.search || undefined,
			skip,
			take: limit,
		};

		const [tasks, totalItems] = await Promise.all([
			taskRepository.findDeleted(userId, repositoryQuery),
			taskRepository.countDeleted(userId, repositoryQuery),
		]);
		const totalPages = Math.ceil(totalItems / limit);

		return {
			data: tasks.map(mapTask),
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
			},
		};
	},

	/**
	 * Khôi phục task đã xoá
	 */
	restoreTask: async (userId, taskId) => {
		const task = await taskRepository.findDeletedById(userId, taskId);
		if (!task) {
			throw new NotFoundException('Task không tồn tại trong Thùng rác.');
		}

		await taskRepository.restore(userId, taskId);
		const restoredTask = await taskRepository.findById(userId, taskId);

		return mapTask(restoredTask);
	},

	/**
	 * Xoá vĩnh viễn task
	 */
	permanentDeleteTask: async (userId, taskId) => {
		const task = await taskRepository.findDeletedById(userId, taskId);
		if (!task) {
			throw new NotFoundException('Task không tồn tại trong Thùng rác.');
		}

		await taskRepository.hardDelete(userId, taskId);

		return { message: 'Task deleted permanently' };
	},

	/**
	 * Lấy danh sách INBOX tasks (chờ duyệt từ Webhook/Fetch API)
	 * QUAN TRỌNG: Fetch TẤT CẢ tasks từ sourceType GMAIL/GITHUB (không filter status)
	 * Để frontend có thể lookup và merge isConverted flag cho tất cả tasks (kể cả PENDING/DONE)
	 *
	 * @param {String} userId - ID của user
	 * @param {Object} query - { page, limit, search }
	 * @returns {Object} { data: [], pagination: {} }
	 */
	getInboxTasks: async (userId, query) => {
		// Parse pagination params
		//FIX BUG-04: Thêm tham số radix 10 để parseInt luôn hoạt động đúng
		const page = parseInt(query.page, 10) || 1;
		const limit = parseInt(query.limit, 10) || 20;
		const skip = (page - 1) * limit;

		// Fetch TẤT CẢ tasks từ sourceType GMAIL/GITHUB (bất kể status)
		// FIX BUG-15: Dùng repository methods thay vì duplicate prisma query trực tiếp
		const [tasks, totalItems] = await Promise.all([
			taskRepository.findInbox(userId, { skip, limit }),
			taskRepository.countInbox(userId),
		]);

		// Map database format → API format
		const mappedTasks = tasks.map((task) => mapTask(task));

		// Calculate pagination metadata
		const totalPages = Math.ceil(totalItems / limit);

		return {
			data: mappedTasks,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
			},
		};
	},

	/**
	 * Xác nhận INBOX task - chuyển từ INBOX → PENDING
	 * Người dùng bấm "Thêm vào công việc" ở Inbox sẽ gọi endpoint này
	 * Set is_converted = true để tránh sync lại tạo duplicate
	 *
	 * @param {String} userId
	 * @param {String} taskId
	 * @returns {Object} Updated task
	 */
	confirmInboxTask: async (userId, taskId, workspaceId) => {
		// Check task tồn tại và có status = INBOX
		const task = await taskRepository.findById(userId, taskId);
		if (!task) {
			throw new NotFoundException('Task không tồn tại.');
		}

		console.log('[CONFIRM] Task details:', {
			id: task.id,
			title: task.title,
			status: task.status,
			sourceType: task.sourceType,
			isConverted: task.isConverted,
		});

		if (task.status !== 'INBOX') {
			throw new OptionalException(
				StatusCodes.BAD_REQUEST,
				`Chỉ có thể xác nhận INBOX tasks. Task này không trong Inbox. (Current status: ${task.status})`,
			);
		}

		// Chuyển từ INBOX → PENDING + Mark as converted + Gán workspace
		const updateData = {
			status: 'PENDING',
			isConverted: true,
		};

		if (workspaceId) {
			updateData.workspaceId = workspaceId;
		}

		await taskRepository.update(userId, taskId, updateData);

		// Fetch lại task đã update
		const updatedTask = await taskRepository.findById(userId, taskId);

		// Schedule notification jobs khi confirm INBOX task
		if (hasScheduleSource(updatedTask)) {
			await scheduleTaskV2(updatedTask);
		}

		return mapTask(updatedTask);
	},
};

async function upsertScheduledTaskEvent(
	userId,
	task,
	scheduledAt,
	existingEventId = getCalendarEventId(task.sourceMetadata),
) {
	const payload = buildTaskEventPayload(task, scheduledAt);

	if (existingEventId) {
		const updateResult = await eventRepository.update(
			userId,
			existingEventId,
			payload,
		);
		if (updateResult.count > 0) {
			return existingEventId;
		}
	}

	const createdEvent = await eventRepository.create(userId, payload);
	return createdEvent.id;
}

function buildTaskEventPayload(task, scheduledAt) {
	return {
		title: task.title,
		date: toDateOnly(scheduledAt),
		time: toTimeHM(scheduledAt),
		color: DEFAULT_TASK_EVENT_COLOR,
		location: null,
		description: task.description ?? null,
		repeat: 'NONE',
		reminder: 'NONE',
		// v2: timestamp fields + link back to task
		startAt: scheduledAt,
		endAt: task.dueDate ? new Date(task.dueDate) : null,
		reminderAt: task.reminderAt ? new Date(task.reminderAt) : null,
		linkedTaskId: task.id, // Rule D: event dẫn xuất từ task
	};
}

function toDateOnly(dateObj) {
	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, '0');
	const day = String(dateObj.getDate()).padStart(2, '0');
	return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function toTimeHM(dateObj) {
	const hours = String(dateObj.getHours()).padStart(2, '0');
	const minutes = String(dateObj.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

function getCalendarEventId(sourceMetadata) {
	const metadata = normalizeMetadata(sourceMetadata);
	const calendarMetadata = metadata[CALENDAR_METADATA_KEY];

	if (
		!calendarMetadata ||
		typeof calendarMetadata !== 'object' ||
		Array.isArray(calendarMetadata)
	) {
		return null;
	}

	return typeof calendarMetadata.eventId === 'string' ? calendarMetadata.eventId : null;
}

function withCalendarMetadata(sourceMetadata, eventId) {
	const metadata = normalizeMetadata(sourceMetadata);
	const baseCalendarMetadata =
		typeof metadata[CALENDAR_METADATA_KEY] === 'object' &&
		metadata[CALENDAR_METADATA_KEY] !== null &&
		!Array.isArray(metadata[CALENDAR_METADATA_KEY])
			? metadata[CALENDAR_METADATA_KEY]
			: {};

	metadata[CALENDAR_METADATA_KEY] = {
		...baseCalendarMetadata,
		eventId,
		source: 'TASK_SCHEDULE',
	};

	return metadata;
}

function withoutCalendarMetadata(sourceMetadata) {
	const metadata = normalizeMetadata(sourceMetadata);
	if (Object.prototype.hasOwnProperty.call(metadata, CALENDAR_METADATA_KEY)) {
		delete metadata[CALENDAR_METADATA_KEY];
	}

	return Object.keys(metadata).length > 0 ? metadata : null;
}

function normalizeMetadata(sourceMetadata) {
	if (
		sourceMetadata &&
		typeof sourceMetadata === 'object' &&
		!Array.isArray(sourceMetadata)
	) {
		return { ...sourceMetadata };
	}

	return {};
}

/**
 * Helper: map task entity -> response contract
 */
function mapTask(task) {
	return {
		id: task.id,
		title: task.title,
		type: task.type || 'TODO',
		status: task.status,
		description: task.description,
		completed: task.status === 'DONE',
		priority: task.priority,
		dueDate: task.dueDate,
		reminderAt: task.reminderAt,
		scheduledAt: task.scheduledAt,
		completedAt: task.completedAt,
		sourceType: task.sourceType,
		sourceId: task.sourceId,
		sourceLink: task.sourceLink,
		sourceMetadata: task.sourceMetadata,
		isConverted: task.isConverted || false,
		parentId: task.parentId,
		workspaceId: task.workspaceId,
		createdAt: task.createdAt,
		updatedAt: task.updatedAt,
	};
}
