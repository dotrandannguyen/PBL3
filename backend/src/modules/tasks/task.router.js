/**
 * Task Router - REST API Routes
 *
 * Base path: /v1/api/tasks
 *
 * Tất cả routes đều yêu cầu authentication (authGuard)
 */

import { Router } from 'express';
import { taskController } from './task.controller.js';
import { authGuard, validateRequestMiddleware } from '../../common/middleware/index.js';
import { createTaskSchema } from './dto/requests/create-task.request.js';
import { updateTaskSchema } from './dto/requests/update-task.request.js';
import { getTasksSchema } from './dto/requests/get-tasks.request.js';

const taskRouter = Router();

// Apply authentication cho tất cả task routes
taskRouter.use(authGuard);

/**
 * GET /tasks
 * List tasks với pagination & filter
 *
 * Query params:
 * - page=1
 * - limit=10
 * - completed=true|false
 * - search=keyword
 */
taskRouter.get('/', validateRequestMiddleware(getTasksSchema), taskController.getAll);

/**
 * GET /tasks/:id
 * Lấy chi tiết 1 task
 */
taskRouter.get('/:id', taskController.getOne);

/**
 * POST /tasks
 * Tạo task mới
 *
 * Body: { title: string, completed?: boolean }
 */
taskRouter.post('/', validateRequestMiddleware(createTaskSchema), taskController.create);

/**
 * PATCH /tasks/:id
 * Update task (title hoặc completed)
 *
 * Body: { title?: string, completed?: boolean }
 */
taskRouter.patch(
	'/:id',
	validateRequestMiddleware(updateTaskSchema),
	taskController.update,
);

/**
 * DELETE /tasks/:id
 * Xóa task (soft delete)
 */
taskRouter.delete('/:id', taskController.delete);

export default taskRouter;
