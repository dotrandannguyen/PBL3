import { Router } from 'express';
import usersController from './users.controller.js';

const userRouter = Router();

userRouter.get('/', usersController.getAllUser);

export default userRouter;
