import { eventService } from './event.service.js';
import { HttpResponse } from '../../common/dtos/index.js';

export const eventController = {
	getAll: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const result = await eventService.getEvents(userId);
			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	create: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const result = await eventService.createEvent(userId, req.body);
			return new HttpResponse(res).created(result);
		} catch (error) {
			next(error);
		}
	},

	update: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const eventId = req.params.id;
			const result = await eventService.updateEvent(userId, eventId, req.body);
			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},
};
