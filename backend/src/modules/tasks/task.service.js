import { taskRepository } from './task.repository.js';
import { NotFoundException } from '../../common/exceptions/index.js';
import { eventRepository } from '../events/event.repository.js';

const DEFAULT_TASK_EVENT_COLOR = '#2383e2';
const CALENDAR_METADATA_KEY = 'calendar';

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
		const taskData = {
			title: data.title,
			description: data.description ?? null,
			priority: data.priority ?? 'MEDIUM',
			dueDate: data.dueDate ? new Date(data.dueDate) : null,
			scheduledAt: data.startAt ? new Date(data.startAt) : null,
			status: 'PENDING',
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

		return mapTask(createdTask);
	},

	/**
	 * Cập nhật task (title, description, priority, dueDate, status)
	 *
	 * @param {String} userId
	 * @param {String} taskId
	 * @param {Object} data - { title?, description?, priority?, dueDate?, status? }
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
		if (data.dueDate !== undefined) {
			updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
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

		await taskRepository.update(userId, taskId, updateData);
		const updatedTask = await taskRepository.findById(userId, taskId);

		if (
			updatedTask?.scheduledAt &&
			(data.title !== undefined || data.description !== undefined)
		) {
			await upsertScheduledTaskEvent(
				userId,
				updatedTask,
				new Date(updatedTask.scheduledAt),
			);
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
		return mapTask(updatedTask);
	},

	/**
	 * Xóa task (soft delete)
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

		await taskRepository.softDelete(userId, taskId);

		return { message: 'Task deleted successfully' };
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
		description: task.description,
		completed: task.status === 'DONE',
		priority: task.priority,
		dueDate: task.dueDate,
		scheduledAt: task.scheduledAt,
		createdAt: task.createdAt,
	};
}
