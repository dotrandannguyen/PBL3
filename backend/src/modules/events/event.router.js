import { Router } from 'express';
import { eventController } from './event.controller.js';
import { authGuard, validateRequestMiddleware } from '../../common/middleware/index.js';
import { getEventsSchema } from './dto/requests/get-events.request.js';
import { getEventSchema } from './dto/requests/get-event.request.js';
import { createEventSchema } from './dto/requests/create-event.request.js';
import { updateEventSchema } from './dto/requests/update-event.request.js';
import { deleteEventSchema } from './dto/requests/delete-event.request.js';

const eventRouter = Router();

eventRouter.use(authGuard);

eventRouter.get('/', validateRequestMiddleware(getEventsSchema), eventController.getAll);
eventRouter.get(
	'/:id',
	validateRequestMiddleware(getEventSchema),
	eventController.getOne,
);
eventRouter.post(
	'/',
	validateRequestMiddleware(createEventSchema),
	eventController.create,
);
eventRouter.put(
	'/:id',
	validateRequestMiddleware(updateEventSchema),
	eventController.update,
);
eventRouter.patch(
	'/:id',
	validateRequestMiddleware(updateEventSchema),
	eventController.update,
);
eventRouter.delete(
	'/:id',
	validateRequestMiddleware(deleteEventSchema),
	eventController.delete,
);

export default eventRouter;
