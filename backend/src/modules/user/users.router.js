import { Router } from 'express';
import usersController from './users.controller.js';
import { adminGuard } from '../../common/middleware/adminGuard.middeware.js';
import { authGuard, validateRequestMiddleware } from '../../common/middleware/index.js';
import { updateUserSchema } from './dto/requests/update-user.request.js';

const userRouter = Router();

userRouter.get('/me', authGuard, usersController.getMe);
userRouter.patch(
	'/me',
	authGuard,
	validateRequestMiddleware(updateUserSchema),
	usersController.updateMe,
);

userRouter.get(
	'/me/notification-preferences',
	authGuard,
	usersController.getNotificationPreferences,
);
userRouter.patch(
	'/me/notification-preferences',
	authGuard,
	usersController.updateNotificationPreferences,
);

userRouter.get('/', authGuard, adminGuard, usersController.getAllUser);
userRouter.delete('/:id', authGuard, adminGuard, usersController.deleteUser);
export default userRouter;
