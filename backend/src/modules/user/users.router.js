import { Router } from 'express';
import usersController from './users.controller.js';
import { adminGuard } from '../../common/middleware/adminGuard.middeware.js';
import { authGuard } from '../../common/middleware/auth.middleware.js';

const userRouter = Router();

userRouter.get('/', authGuard, adminGuard, usersController.getAllUser);
userRouter.delete('/:id', authGuard, adminGuard, usersController.deleteUser);
export default userRouter;
