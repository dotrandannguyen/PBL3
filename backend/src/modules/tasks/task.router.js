// Task Router

import { Router } from 'express';
import { taskController } from './task.controller.js';
import { authGuard, validateRequestMiddleware } from '../../common/middleware/index.js';
import { createTaskSchema } from './dto/requests/create-task.request.js';


const taskRouter = Router();


taskRouter.use(authGuard);
taskRouter.post('/', validateRequestMiddleware(createTaskSchema), taskController.create);

export default taskRouter;
