import { eventRepository } from './event.repository.js';
import { NotFoundException } from '../../common/exceptions/index.js';
import prisma from '../../config/database.js';

const toDateOnly = (dateString) => new Date(`${dateString}T00:00:00.000Z`);
const DEFAULT_TASK_EVENT_COLOR = '#2383e2';
const CALENDAR_METADATA_KEY = 'calendar';
const DEFAULT_EVENT_SORT = 'date-asc';

const mapEventToResponse = (event, options = {}) => {
	const endTime = options.endTime ?? null;
	const endAt = options.endAt ?? null;

	return {
		id: event.id,
		title: event.title,
		date: event.date.toISOString().slice(0, 10),
		time: event.time,
		endTime,
		endAt,
		color: event.color,
		location: event.location,
		description: event.description,
		repeat: event.repeat,
		reminder: event.reminder,
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
			location: dto.location ?? null,
			description: dto.description ?? null,
			repeat: dto.repeat ?? 'NONE',
			reminder: dto.reminder ?? 'NONE',
		};

		if (dto.color !== undefined) {
			eventData.color = dto.color;
		}

		const createdEvent = await eventRepository.create(userId, eventData);
		return mapEventToResponse(createdEvent, {
			endTime: null,
			endAt: null,
		});
	},

	updateEvent: async (userId, eventId, dto) => {
		const existingEvent = await eventRepository.findById(userId, eventId);
		if (!existingEvent) {
			throw new NotFoundException('event');
		}

		const updateData = {};

		if (dto.title !== undefined) updateData.title = dto.title;
		if (dto.date !== undefined) updateData.date = toDateOnly(dto.date);
		if (dto.time !== undefined) updateData.time = dto.time;
		if (dto.color !== undefined) updateData.color = dto.color;
		if (dto.location !== undefined) updateData.location = dto.location;
		if (dto.description !== undefined) updateData.description = dto.description;
		if (dto.repeat !== undefined) updateData.repeat = dto.repeat;
		if (dto.reminder !== undefined) updateData.reminder = dto.reminder;

		await eventRepository.update(userId, eventId, updateData);

		const updatedEvent = await eventRepository.findById(userId, eventId);
		if (!updatedEvent) {
			throw new NotFoundException('event');
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
			sourceMetadata: true,
		},
	});

	if (scheduledTasks.length === 0) {
		return;
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

	for (const task of scheduledTasks) {
		const linkedEventId = getCalendarEventId(task.sourceMetadata);
		const hasLinkedEvent =
			typeof linkedEventId === 'string' && existingEventIdSet.has(linkedEventId);

		if (hasLinkedEvent) {
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

	return {
		title: task.title,
		date: toDateOnlyFromDate(scheduledAtDate),
		time: toTimeHM(scheduledAtDate),
		color: DEFAULT_TASK_EVENT_COLOR,
		location: null,
		description: task.description ?? null,
		repeat: 'NONE',
		reminder: 'NONE',
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
