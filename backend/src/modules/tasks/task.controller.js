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
	 * Body: { title: string, completed?: boolean }
	 */
	create: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const result = await taskService.createTask(userId, req.body);
			console.log(req.body);

			return new HttpResponse(res).created(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * PATCH /tasks/:id
	 * Update task (title hoặc completed status)
	 *
	 * Body: { title?: string, completed?: boolean }
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

	/**
	 * GET /tasks/inbox
	 * Lấy danh sách INBOX tasks (chờ duyệt)
	 *
	 * Query params:
	 * - page: số trang (default: 1)
	 * - limit: items per page (default: 10)
	 */
	getInbox: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const result = await taskService.getInboxTasks(userId, req.query);
			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * PATCH /tasks/:id/confirm
	 * Xác nhận INBOX task - chuyển từ INBOX → PENDING
	 * Người dùng bấm "Thêm vào công việc" từ Inbox sẽ gọi endpoint này
	 */
	confirmInbox: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const taskId = req.params.id;

			const result = await taskService.confirmInboxTask(userId, taskId);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},
};
