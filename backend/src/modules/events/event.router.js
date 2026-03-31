import { Router } from 'express';
import { eventController } from './event.controller.js';
import { authGuard, validateRequestMiddleware } from '../../common/middleware/index.js';
import { createEventSchema } from './dto/requests/create-event.request.js';
import { updateEventSchema } from './dto/requests/update-event.request.js';

const eventRouter = Router();

eventRouter.use(authGuard);

eventRouter.get('/', eventController.getAll);
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

export default eventRouter;
