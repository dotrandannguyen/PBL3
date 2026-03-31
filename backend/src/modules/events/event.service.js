import { eventRepository } from './event.repository.js';
import { NotFoundException } from '../../common/exceptions/index.js';

const toDateOnly = (dateString) => new Date(`${dateString}T00:00:00.000Z`);

const mapEventToResponse = (event) => {
	return {
		id: event.id,
		title: event.title,
		date: event.date.toISOString().slice(0, 10),
		time: event.time,
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
	getEvents: async (userId) => {
		const events = await eventRepository.findMany(userId);
		return events.map(mapEventToResponse);
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
		return mapEventToResponse(createdEvent);
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

		return mapEventToResponse(updatedEvent);
	},
};
