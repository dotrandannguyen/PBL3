/**
 * Notification Controller - HTTP Request Handlers
 *
 * Endpoints:
 * GET    /notifications           - Lấy tất cả notifications
 * GET    /notifications/unread    - Lấy chỉ unread
 * GET    /notifications/count     - Lấy count unread
 * PATCH  /notifications/:id       - Mark 1 notification đã đọc
 * PATCH  /notifications/bulk/read - Mark tất cả đã đọc
 * DELETE /notifications/:id       - Xóa 1 notification
 * DELETE /notifications/all       - Xóa tất cả notifications
 */

import { notificationService } from './notification.service.js';
import { ClientException } from '../../common/exceptions/index.js';
import { HttpResponse } from '../../common/dtos/index.js';

const getValidatedUserId = (req) => {
	const userId = req.user?.id;
	if (!userId) {
		throw new ClientException(400, 'User ID không hợp lệ');
	}
	return userId;
};

export const notificationController = {
	/**
	 * GET /api/notifications
	 * Lấy danh sách tất cả notifications
	 * Query params: page, limit, isRead (true/false)
	 */
	getNotifications: async (req, res, next) => {
		try {
			const userId = getValidatedUserId(req);
			const query = req.query;

			const result = await notificationService.getNotifications(userId, query);

			return new HttpResponse(res).success({
				data: result.data,
				pagination: result.pagination,
			});
		} catch (error) {
			next(error);
		}
	},

	/**
	 * GET /api/notifications/unread
	 * Lấy chỉ notifications chưa đọc
	 * Query params: page, limit
	 */
	getUnreadNotifications: async (req, res, next) => {
		try {
			const userId = getValidatedUserId(req);
			const query = req.query;

			const result = await notificationService.getUnreadNotifications(
				userId,
				query,
			);

			return new HttpResponse(res).success({
				data: result.data,
				pagination: result.pagination,
			});
		} catch (error) {
			next(error);
		}
	},

	/**
	 * GET /api/notifications/count
	 * Lấy tổng số unread notifications
	 */
	getUnreadCount: async (req, res, next) => {
		try {
			const userId = getValidatedUserId(req);

			const result = await notificationService.getUnreadCount(userId);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * PATCH /api/notifications/:id
	 * Mark 1 notification đã đọc
	 * FIX: Accept socketId để prevent duplicate socket event
	 */
	markAsRead: async (req, res, next) => {
		try {
			const userId = getValidatedUserId(req);
			const { id: notificationId } = req.params;
			const socketId =
				typeof req.body?.socketId === 'string' ? req.body.socketId : null;

			if (!notificationId) {
				throw new ClientException(400, 'Notification ID không hợp lệ');
			}

			const result = await notificationService.markAsRead(
				userId,
				notificationId,
				socketId,
			);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * PATCH /api/notifications/bulk/read
	 * Mark tất cả notifications của user đã đọc
	 * FIX: Accept socketId để prevent duplicate socket event
	 */
	markAllAsRead: async (req, res, next) => {
		try {
			const userId = getValidatedUserId(req);
			const socketId =
				typeof req.body?.socketId === 'string' ? req.body.socketId : null;

			const result = await notificationService.markAllAsRead(userId, socketId);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * DELETE /api/notifications/:id
	 * Xóa 1 notification
	 */
	deleteNotification: async (req, res, next) => {
		try {
			const userId = getValidatedUserId(req);
			const { id: notificationId } = req.params;

			if (!notificationId) {
				throw new ClientException(400, 'Notification ID không hợp lệ');
			}

			const result = await notificationService.deleteNotification(
				userId,
				notificationId,
			);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	/**
	 * DELETE /api/notifications/all
	 * Xóa tất cả notifications của user
	 */
	deleteAllNotifications: async (req, res, next) => {
		try {
			const userId = getValidatedUserId(req);

			const result = await notificationService.deleteAllNotifications(userId);

			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},
};
