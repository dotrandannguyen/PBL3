import { Router } from 'express';
import usersController from './users.controller.js';
import { authMiddleware } from '../../common/middleware/index.js';

const userRouter = Router();

userRouter.get('/', authMiddleware, usersController.getAllUser);

export default userRouter;
