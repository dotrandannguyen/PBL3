/**
 * Task Controller - HTTP Request Handler Layer
 *
 * Nhiệm vụ:
 * 1. Nhận HTTP request
 * 2. Extract data từ req (body, params, query, user)
 * 3. Gọi service layer để xử lý business logic
 * 4. Trả về HTTP response (success/error)
 */

import { taskService } from './task.service.js';
import { HttpResponse } from '../../common/dtos/index.js';

export const taskController = {
	/**
	 * GET /tasks
	 * List tasks với pagination, filter, search
	 *
	 * Query params:
	 * - page: số trang (default: 1)
	 * - limit: items per page (default: 10)
	 * - completed: 'true' | 'false' (filter)
	 * - search: search by title
	 */
	getAll: async (req, res, next) => {
		try {
			const userId = req.user.id; // From authGuard middleware
			const result = await taskService.getTasks(userId, req.query);
			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * GET /tasks/:id
	 * Lấy chi tiết 1 task
	 */
	getOne: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const taskId = req.params.id;

			const result = await taskService.getTaskById(userId, taskId);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * POST /tasks
	 * Tạo task mới
	 *
	 * Body: { title: string, description?: string, priority?: string, dueDate?: string, startAt?: string | null }
	 */
	create: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const result = await taskService.createTask(userId, req.body);

			return new HttpResponse(res).created(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * PATCH /tasks/:id
	 * Update task (title, description, priority, dueDate, status)
	 *
	 * Body: { title?: string, description?: string, priority?: string, dueDate?: string, status?: string }
	 */
	update: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const taskId = req.params.id;

			const result = await taskService.updateTask(userId, taskId, req.body);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * PATCH /tasks/:id/schedule
	 * Set scheduled start time for task
	 *
	 * Body: { startAt: string | null }
	 */
	markScheduled: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const taskId = req.params.id;
			const { startAt } = req.body;

			const result = await taskService.markTaskScheduled(userId, taskId, startAt);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * DELETE /tasks/:id
	 * Xóa task (soft delete)
	 */
	delete: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const taskId = req.params.id;

			const result = await taskService.deleteTask(userId, taskId);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},
};
