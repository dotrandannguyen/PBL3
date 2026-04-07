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
import { scheduleTaskSchema } from './dto/requests/schedule-task.request.js';

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
 * GET /tasks/inbox
 * Lấy danh sách INBOX tasks (chờ duyệt từ Webhook/Fetch API)
 *
 * Query params:
 * - page=1
 * - limit=10
 */
taskRouter.get('/inbox', taskController.getInbox);

/**
 * GET /tasks/:id
 * Lấy chi tiết 1 task
 */
taskRouter.get('/:id', taskController.getOne);

/**
 * POST /tasks
 * Tạo task mới
 *
 * Body: { title: string, description?: string, priority?: string, dueDate?: string, startAt?: string | null }
 */
taskRouter.post('/', validateRequestMiddleware(createTaskSchema), taskController.create);

/**
 * PATCH /tasks/:id
 * Update task (title, description, priority, dueDate, status)
 *
 * Body: { title?: string, description?: string, priority?: string, dueDate?: string, status?: string }
 */
taskRouter.patch(
	'/:id',
	validateRequestMiddleware(updateTaskSchema),
	taskController.update,
);

/**
 * PATCH /tasks/:id/confirm
 * Xác nhận INBOX task - chuyển từ INBOX → PENDING
 * Người dùng bấm "Thêm vào công việc" từ Inbox sẽ gọi endpoint này
 */
taskRouter.patch('/:id/confirm', taskController.confirmInbox);

/**
 * PATCH /tasks/:id/schedule
 * Set schedule start time cho task
 *
 * Body: { startAt: string | null }
 */
taskRouter.patch(
	'/:id/schedule',
	validateRequestMiddleware(scheduleTaskSchema),
	taskController.markScheduled,
);

/**
 * DELETE /tasks/:id
 * Xóa task (soft delete)
 */
taskRouter.delete('/:id', taskController.delete);

export default taskRouter;
