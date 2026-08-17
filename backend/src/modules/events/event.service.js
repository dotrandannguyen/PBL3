import { eventRepository } from './event.repository.js';
import { NotFoundException } from '../../common/exceptions/index.js';
import prisma from '../../config/database.js';
import {
	scheduleEventV2,
	rescheduleEventV2,
	cancelEventJobsV2,
} from '../notifications/notification.schedule.js';
import { taskService } from '../tasks/task.service.js';

const toDateOnly = (dateString) => new Date(`${dateString}T00:00:00.000Z`);
const DEFAULT_TASK_EVENT_COLOR = '#2383e2';
const CALENDAR_METADATA_KEY = 'calendar';
const DEFAULT_EVENT_SORT = 'date-asc';

const mapEventToResponse = (event, options = {}) => {
	// Persisted columns endDate/endTime — backward compat
	const persistedEndTime = event.endTime ?? null;
	const persistedEndDate = event.endDate
		? event.endDate.toISOString().slice(0, 10)
		: null;

	const endTime = persistedEndTime ?? options.endTime ?? null;
	const endDate = persistedEndDate ?? options.endDate ?? null;

	// v2: compute endAt từ endDate+endTime, hoặc từ event.endAt
	const resolvedEndAtInput = options.endAt ?? event.endAt ?? null;
	const parsedEndAt = resolvedEndAtInput ? new Date(resolvedEndAtInput) : null;
	const hasValidEndAt =
		parsedEndAt instanceof Date && !Number.isNaN(parsedEndAt.getTime());
	let endAt = hasValidEndAt ? parsedEndAt.toISOString() : null;
	if (!endAt && endDate && endTime) {
		endAt = new Date(`${endDate}T${endTime}:00`).toISOString();
	}

	// v2: startAt / reminderAt
	const parsedStartAt = event.startAt ? new Date(event.startAt) : null;
	const startAt =
		parsedStartAt instanceof Date && !Number.isNaN(parsedStartAt.getTime())
			? parsedStartAt.toISOString()
			: null;

	const parsedReminderAt = event.reminderAt ? new Date(event.reminderAt) : null;
	const reminderAt =
		parsedReminderAt instanceof Date && !Number.isNaN(parsedReminderAt.getTime())
			? parsedReminderAt.toISOString()
			: null;

	return {
		id: event.id,
		title: event.title,
		date: event.date.toISOString().slice(0, 10),
		time: event.time,
		endTime,
		endDate,
		endAt,
		color: event.color,
		location: event.location,
		description: event.description,
		repeat: event.repeat,
		reminder: event.reminder,
		// v2 fields
		startAt,
		eventEndAt: endAt,
		reminderAt,
		linkedTaskId: event.linkedTaskId ?? null,
		createdAt: event.createdAt,
		updatedAt: event.updatedAt,
	};
};

export const eventService = {
	getEvents: async (userId, query = {}) => {
		const shouldPaginate =
			Number.isInteger(query.page) || Number.isInteger(query.limit);
		const page = Number.isInteger(query.page) ? query.page : 1;
		const limit = Number.isInteger(query.limit) ? query.limit : 50;
		const skip = shouldPaginate ? (page - 1) * limit : undefined;
		const where = buildEventWhereClause(query);
		const orderBy = resolveEventOrderBy(query.sortBy);

		await ensureScheduledTaskEvents(userId);

		const [events, totalItems] = await Promise.all([
			eventRepository.findMany(userId, {
				where,
				skip,
				take: shouldPaginate ? limit : undefined,
				orderBy,
			}),
			shouldPaginate ? eventRepository.count(userId, where) : Promise.resolve(null),
		]);

		const taskEventEndMap = await buildTaskEventEndMap(
			userId,
			events.map((event) => event.id),
		);

		const mappedEvents = events.map((event) => {
			const endPayload = taskEventEndMap.get(event.id) || null;
			return mapEventToResponse(event, {
				endTime: endPayload?.endTime ?? null,
				endAt: endPayload?.endAt ?? null,
			});
		});

		if (!shouldPaginate) {
			return mappedEvents;
		}

		const safeTotalItems = totalItems ?? 0;
		const totalPages = safeTotalItems === 0 ? 1 : Math.ceil(safeTotalItems / limit);

		return {
			data: mappedEvents,
			pagination: {
				page,
				limit,
				totalItems: safeTotalItems,
				totalPages,
			},
		};
	},

	getEventById: async (userId, eventId) => {
		const event = await eventRepository.findById(userId, eventId);
		if (!event) {
			throw new NotFoundException('event');
		}

		const endPayload = await getTaskEventEndPayload(userId, event.id);

		return mapEventToResponse(event, {
			endTime: endPayload?.endTime ?? null,
			endAt: endPayload?.endAt ?? null,
		});
	},

	createEvent: async (userId, dto) => {
		const eventData = {
			title: dto.title,
			date: toDateOnly(dto.date),
			time: dto.time,
			endDate: dto.endDate ? toDateOnly(dto.endDate) : null,
			endTime: dto.endTime ?? null,
			location: dto.location ?? null,
			description: dto.description ?? null,
			repeat: dto.repeat ?? 'NONE',
			reminder: dto.reminder ?? 'NONE',
			// v2 fields
			startAt: dto.startAt ? new Date(dto.startAt) : null,
			endAt: dto.endAt ? new Date(dto.endAt) : null,
			reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
			linkedTaskId: dto.linkedTaskId ?? null,
		};

		if (dto.color !== undefined) {
			eventData.color = dto.color;
		}

		const createdEvent = await eventRepository.create(userId, eventData);

		// Schedule event notifications v2 (scheduler sẽ tự skip nếu linkedTaskId)
		await scheduleEventV2({ ...createdEvent, userId });

		return mapEventToResponse(createdEvent);
	},

	updateEvent: async (userId, eventId, dto) => {
		const existingEvent = await eventRepository.findById(userId, eventId);
		if (!existingEvent) {
			throw new NotFoundException('event');
		}

		// Guard: Nếu event có linkedTaskId, chặn update thờng
		// FE phải gọi updateTask thay thế (Giai đoạn D)
		// Hiện tại: vẫn cho phép nhưng log warning
		if (existingEvent.linkedTaskId) {
			console.warn(
				`[EventService] Event ${eventId} có linkedTaskId=${existingEvent.linkedTaskId}, ` +
					`nên update Task thay vì Event trực tiếp`,
			);
		}

		const updateData = {};

		if (dto.title !== undefined) updateData.title = dto.title;
		if (dto.date !== undefined) updateData.date = toDateOnly(dto.date);
		if (dto.time !== undefined) updateData.time = dto.time;
		if (dto.endDate !== undefined) {
			updateData.endDate = dto.endDate ? toDateOnly(dto.endDate) : null;
		}
		if (dto.endTime !== undefined) updateData.endTime = dto.endTime ?? null;
		if (dto.color !== undefined) updateData.color = dto.color;
		if (dto.location !== undefined) updateData.location = dto.location;
		if (dto.description !== undefined) updateData.description = dto.description;
		if (dto.repeat !== undefined) updateData.repeat = dto.repeat;
		if (dto.reminder !== undefined) updateData.reminder = dto.reminder;
		// v2 fields
		if (dto.startAt !== undefined)
			updateData.startAt = dto.startAt ? new Date(dto.startAt) : null;
		if (dto.endAt !== undefined)
			updateData.endAt = dto.endAt ? new Date(dto.endAt) : null;
		if (dto.reminderAt !== undefined)
			updateData.reminderAt = dto.reminderAt ? new Date(dto.reminderAt) : null;

		await eventRepository.update(userId, eventId, updateData);

		const updatedEvent = await eventRepository.findById(userId, eventId);
		if (!updatedEvent) {
			throw new NotFoundException('event');
		}

		// Reschedule event notifications v2 (hàm sẽ remove job cũ trước)
		await rescheduleEventV2({ ...updatedEvent, userId });

		if (existingEvent.linkedTaskId) {
			const taskUpdate = {};
			let shouldUpdateTask = false;

			if (
				dto.startAt !== undefined ||
				dto.date !== undefined ||
				dto.time !== undefined
			) {
				let startAtToSync = updatedEvent.startAt;
				if (!startAtToSync && updatedEvent.date && updatedEvent.time) {
					startAtToSync = new Date(
						`${updatedEvent.date.toISOString().slice(0, 10)}T${updatedEvent.time}:00.000Z`,
					);
				}
				taskUpdate.startAt = startAtToSync;
				shouldUpdateTask = true;
			}

			if (
				dto.endAt !== undefined ||
				dto.endDate !== undefined ||
				dto.endTime !== undefined
			) {
				let endAtToSync = updatedEvent.endAt;
				if (!endAtToSync && updatedEvent.endDate && updatedEvent.endTime) {
					endAtToSync = new Date(
						`${updatedEvent.endDate.toISOString().slice(0, 10)}T${updatedEvent.endTime}:00.000Z`,
					);
				}
				taskUpdate.dueDate = endAtToSync;
				shouldUpdateTask = true;
			}

			if (dto.title !== undefined) {
				taskUpdate.title = dto.title;
				shouldUpdateTask = true;
			}

			if (dto.description !== undefined) {
				taskUpdate.description = dto.description;
				shouldUpdateTask = true;
			}

			if (shouldUpdateTask) {
				await taskService.updateTask(
					userId,
					existingEvent.linkedTaskId,
					taskUpdate,
				);
			}
		}

		const endPayload = await getTaskEventEndPayload(userId, updatedEvent.id);

		return mapEventToResponse(updatedEvent, {
			endTime: endPayload?.endTime ?? null,
			endAt: endPayload?.endAt ?? null,
		});
	},

	deleteEvent: async (userId, eventId) => {
		const existingEvent = await eventRepository.findById(userId, eventId);
		if (!existingEvent) {
			throw new NotFoundException('event');
		}

		// Cancel event scheduler jobs v2 trước khi xóa
		await cancelEventJobsV2(eventId);

		const unlinkedTaskIds = await unlinkTasksFromEvent(userId, eventId);
		await eventRepository.delete(userId, eventId);

		return {
			id: eventId,
			message:
				unlinkedTaskIds.length > 0
					? 'Event deleted and linked tasks unscheduled successfully'
					: 'Event deleted successfully',
			unlinkedTaskIds,
		};
	},
};

const EVENT_SORT_ORDER_MAP = {
	'date-asc': [{ date: 'asc' }, { time: 'asc' }, { createdAt: 'asc' }],
	'date-desc': [{ date: 'desc' }, { time: 'desc' }, { createdAt: 'desc' }],
	'created-asc': [{ createdAt: 'asc' }],
	'created-desc': [{ createdAt: 'desc' }],
};

function buildEventWhereClause(query = {}) {
	const where = {};

	if (query.fromDate || query.toDate) {
		where.date = {};

		if (query.fromDate) {
			where.date.gte = toDateOnly(query.fromDate);
		}

		if (query.toDate) {
			where.date.lte = toDateOnly(query.toDate);
		}
	}

	if (query.search) {
		where.OR = [
			{
				title: {
					contains: query.search,
					mode: 'insensitive',
				},
			},
			{
				description: {
					contains: query.search,
					mode: 'insensitive',
				},
			},
			{
				location: {
					contains: query.search,
					mode: 'insensitive',
				},
			},
		];
	}

	if (query.repeat) {
		where.repeat = query.repeat;
	}

	if (query.reminder) {
		where.reminder = query.reminder;
	}

	return where;
}

function resolveEventOrderBy(sortBy = DEFAULT_EVENT_SORT) {
	return EVENT_SORT_ORDER_MAP[sortBy] ?? EVENT_SORT_ORDER_MAP[DEFAULT_EVENT_SORT];
}

async function getTaskEventEndPayload(userId, eventId) {
	const taskEventEndMap = await buildTaskEventEndMap(userId, [eventId]);
	return taskEventEndMap.get(eventId) ?? null;
}

async function unlinkTasksFromEvent(userId, eventId) {
	const candidateTasks = await prisma.task.findMany({
		where: {
			userId,
			deletedAt: null,
			scheduledAt: { not: null },
		},
		select: {
			id: true,
			sourceMetadata: true,
		},
	});

	const linkedTasks = candidateTasks.filter(
		(task) => getCalendarEventId(task.sourceMetadata) === eventId,
	);

	if (linkedTasks.length === 0) {
		return [];
	}

	await Promise.all(
		linkedTasks.map((task) =>
			prisma.task.updateMany({
				where: {
					id: task.id,
					userId,
					deletedAt: null,
				},
				data: {
					scheduledAt: null,
					sourceMetadata: withoutCalendarMetadata(task.sourceMetadata),
				},
			}),
		),
	);

	return linkedTasks.map((task) => task.id);
}

async function ensureScheduledTaskEvents(userId) {
	const scheduledTasks = await prisma.task.findMany({
		where: {
			userId,
			deletedAt: null,
			scheduledAt: { not: null },
		},
		select: {
			id: true,
			title: true,
			description: true,
			scheduledAt: true,
			dueDate: true,
			reminderAt: true,
			sourceMetadata: true,
		},
	});

	if (scheduledTasks.length === 0) {
		return;
	}

	const scheduledTaskIds = scheduledTasks.map((task) => task.id);
	const existingLinkedTaskEvents = await prisma.event.findMany({
		where: {
			userId,
			linkedTaskId: { in: scheduledTaskIds },
		},
		select: {
			id: true,
			linkedTaskId: true,
			updatedAt: true,
			createdAt: true,
		},
		orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
	});

	const canonicalEventByTaskId = new Map();
	const duplicateLinkedEventIds = [];

	for (const event of existingLinkedTaskEvents) {
		if (!event.linkedTaskId) {
			continue;
		}

		if (!canonicalEventByTaskId.has(event.linkedTaskId)) {
			canonicalEventByTaskId.set(event.linkedTaskId, event.id);
			continue;
		}

		duplicateLinkedEventIds.push(event.id);
	}

	if (duplicateLinkedEventIds.length > 0) {
		await prisma.event.deleteMany({
			where: {
				userId,
				id: { in: duplicateLinkedEventIds },
			},
		});
	}

	const linkedEventIds = scheduledTasks
		.map((task) => getCalendarEventId(task.sourceMetadata))
		.filter((eventId) => typeof eventId === 'string');

	const existingEvents =
		linkedEventIds.length > 0
			? await prisma.event.findMany({
					where: {
						userId,
						id: { in: linkedEventIds },
					},
					select: { id: true },
				})
			: [];

	const existingEventIdSet = new Set(existingEvents.map((event) => event.id));
	const canonicalEventIdSet = new Set(canonicalEventByTaskId.values());

	for (const task of scheduledTasks) {
		const linkedEventId = getCalendarEventId(task.sourceMetadata);
		const hasLinkedEvent =
			typeof linkedEventId === 'string' &&
			(existingEventIdSet.has(linkedEventId) ||
				canonicalEventIdSet.has(linkedEventId));
		const canonicalLinkedEventId = canonicalEventByTaskId.get(task.id) ?? null;

		if (hasLinkedEvent) {
			continue;
		}

		if (canonicalLinkedEventId) {
			await prisma.task.updateMany({
				where: {
					id: task.id,
					userId,
					deletedAt: null,
				},
				data: {
					sourceMetadata: withCalendarMetadata(
						task.sourceMetadata,
						canonicalLinkedEventId,
					),
				},
			});
			continue;
		}

		const createdEvent = await eventRepository.create(
			userId,
			buildTaskEventPayload(task),
		);

		await prisma.task.updateMany({
			where: {
				id: task.id,
				userId,
				deletedAt: null,
			},
			data: {
				sourceMetadata: withCalendarMetadata(
					task.sourceMetadata,
					createdEvent.id,
				),
			},
		});
	}
}

function buildTaskEventPayload(task) {
	const scheduledAtDate = new Date(task.scheduledAt);
	const dueDateValue = task.dueDate ? new Date(task.dueDate) : null;

	return {
		title: task.title,
		date: toDateOnlyFromDate(scheduledAtDate),
		time: toTimeHM(scheduledAtDate),
		color: DEFAULT_TASK_EVENT_COLOR,
		location: null,
		description: task.description ?? null,
		repeat: 'NONE',
		reminder: 'NONE',
		startAt: scheduledAtDate,
		endAt: dueDateValue,
		reminderAt: task.reminderAt ? new Date(task.reminderAt) : null,
		linkedTaskId: task.id,
	};
}

async function buildTaskEventEndMap(userId, targetEventIdsInput) {
	const taskEventEndMap = new Map();
	const targetEventIds =
		Array.isArray(targetEventIdsInput) && targetEventIdsInput.length > 0
			? new Set(
					targetEventIdsInput.filter(
						(eventId) => typeof eventId === 'string' && eventId.length > 0,
					),
				)
			: null;

	if (targetEventIdsInput && targetEventIdsInput.length === 0) {
		return taskEventEndMap;
	}

	const tasks = await prisma.task.findMany({
		where: {
			userId,
			deletedAt: null,
			scheduledAt: { not: null },
			dueDate: { not: null },
		},
		select: {
			scheduledAt: true,
			dueDate: true,
			sourceMetadata: true,
		},
	});

	for (const task of tasks) {
		const eventId = getCalendarEventId(task.sourceMetadata);
		if (!eventId) {
			continue;
		}

		if (targetEventIds && !targetEventIds.has(eventId)) {
			continue;
		}

		const scheduledAtDate = new Date(task.scheduledAt);
		const dueDate = new Date(task.dueDate);

		if (
			Number.isNaN(scheduledAtDate.getTime()) ||
			Number.isNaN(dueDate.getTime()) ||
			dueDate <= scheduledAtDate
		) {
			continue;
		}

		taskEventEndMap.set(eventId, {
			endTime: toTimeHM(dueDate),
			endAt: dueDate.toISOString(),
		});
	}

	return taskEventEndMap;
}

function toDateOnlyFromDate(dateObj) {
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
