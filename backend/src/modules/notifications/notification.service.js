/**
 * Notification Service - Business Logic
 *
 * Nhiệm vụ:
 * 1. Fetch notifications chưa đọc
 * 2. Mark notification đã đọc
 * 3. Xóa notification
 * 4. Lấy lịch sử thông báo
 */

import prisma from '../../config/database.js';
import { NotFoundException } from '../../common/exceptions/index.js';
import {
	emitToUser,
	emitToUserExceptSocket,
} from '../../common/realtime/socket.gateway.js';

const buildPagination = (totalItems, page, limit) => ({
	page,
	limit,
	totalItems,
	totalPages: Math.ceil(totalItems / limit),
});

const parsePaginationQuery = (query = {}) => {
	const rawPage = Number.parseInt(query.page, 10);
	const rawLimit = Number.parseInt(query.limit, 10);

	const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
	const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);

	return {
		page,
		limit,
		skip: (page - 1) * limit,
	};
};

export const notificationService = {
	/**
	 * Lấy danh sách notifications chưa đọc (mới nhất trước)
	 *
	 * @param {String} userId - User ID
	 * @param {Object} query - { page, limit }
	 * @returns {Object} { data: [], pagination: {} }
	 */
	getUnreadNotifications: async (userId, query = {}) => {
		const { page, limit, skip } = parsePaginationQuery(query);

		const [notifications, totalItems] = await Promise.all([
			prisma.notification.findMany({
				where: {
					userId,
					isRead: false,
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit,
				select: {
					id: true,
					taskId: true,
					type: true,
					title: true,
					content: true,
					sentAt: true,
					createdAt: true,
					task: {
						select: {
							id: true,
							title: true,
							dueDate: true,
						},
					},
				},
			}),
			prisma.notification.count({
				where: {
					userId,
					isRead: false,
				},
			}),
		]);

		return {
			data: notifications,
			pagination: buildPagination(totalItems, page, limit),
		};
	},

	/**
	 * Lấy all notifications (có pagination + filter)
	 *
	 * @param {String} userId - User ID
	 * @param {Object} query - { page, limit, isRead }
	 * @returns {Object} { data: [], pagination: {} }
	 */
	getNotifications: async (userId, query = {}) => {
		const { page, limit, skip } = parsePaginationQuery(query);
		const isRead = query.isRead !== undefined ? query.isRead === 'true' : undefined;

		const whereClause = {
			userId,
			...(isRead !== undefined && { isRead }),
		};

		const [notifications, totalItems] = await Promise.all([
			prisma.notification.findMany({
				where: whereClause,
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit,
				select: {
					id: true,
					taskId: true,
					type: true,
					title: true,
					content: true,
					isRead: true,
					sentAt: true,
					createdAt: true,
					task: {
						select: {
							id: true,
							title: true,
							dueDate: true,
						},
					},
				},
			}),
			prisma.notification.count({ where: whereClause }),
		]);

		return {
			data: notifications,
			pagination: buildPagination(totalItems, page, limit),
		};
	},

	/**
	 * Mark notification đã đọc
	 * FIX: Thêm socketId để tránh duplicate socket event
	 *
	 * @param {String} userId - User ID
	 * @param {String} notificationId - Notification ID
	 * @param {String} socketId - Socket ID của requester (optional)
	 * @returns {Object} Updated notification
	 */
	markAsRead: async (userId, notificationId, socketId = null) => {
		const notification = await prisma.notification.findFirst({
			where: {
				id: notificationId,
				userId,
			},
			select: {
				id: true,
				isRead: true,
				createdAt: true,
			},
		});

		if (!notification) {
			throw new NotFoundException('Notification không tồn tại');
		}

		// FIX: Idempotency - nếu đã read, return luôn (tránh double update)
		if (notification.isRead) {
			console.log(
				`[NotificationService] Notification ${notificationId} đã read rồi`,
			);
			return notification;
		}

		const updateResult = await prisma.notification.updateMany({
			where: {
				id: notificationId,
				userId,
				isRead: false,
			},
			data: { isRead: true },
		});

		const updated = await prisma.notification.findUnique({
			where: { id: notificationId },
			select: {
				id: true,
				isRead: true,
				createdAt: true,
			},
		});

		if (!updated) {
			throw new NotFoundException('Notification không tồn tại');
		}

		if (updateResult.count === 0) {
			return updated;
		}

		console.log(
			`[NotificationService] Marked notification ${notificationId} as read`,
		);

		// FIX: Broadcast only to OTHER users (exclude requester socket)
		if (socketId) {
			emitToUserExceptSocket(userId, socketId, 'NOTIFICATION_READ', {
				notificationId,
				isRead: true,
			});
		} else {
			emitToUser(userId, 'NOTIFICATION_READ', {
				notificationId,
				isRead: true,
			});
		}

		return updated;
	},

	/**
	 * Mark tất cả notifications của user đã đọc
	 * FIX: Use Prisma transaction để prevent race condition
	 *
	 * @param {String} userId - User ID
	 * @param {String} socketId - Socket ID của requester (optional)
	 * @returns {Object} { count: số notification được update, newUnreadCount: number }
	 */
	markAllAsRead: async (userId, socketId = null) => {
		// FIX: Transaction ensures atomicity
		// Nếu scheduler emit notification cùng lúc, count vẫn đúng
		const [result, newUnreadCount] = await prisma.$transaction([
			prisma.notification.updateMany({
				where: {
					userId,
					isRead: false,
				},
				data: { isRead: true },
			}),
			// Re-count để get newUnreadCount
			prisma.notification.count({
				where: {
					userId,
					isRead: false,
				},
			}),
		]);

		console.log(
			`[NotificationService] Marked ${result.count} notifications as read for user ${userId}, remaining: ${newUnreadCount}`,
		);

		// FIX: Broadcast only to OTHER users (exclude requester socket)
		if (result.count > 0 && socketId) {
			emitToUserExceptSocket(userId, socketId, 'NOTIFICATIONS_MARKED_ALL_READ', {
				count: result.count,
				newUnreadCount,
			});
		} else if (result.count > 0) {
			emitToUser(userId, 'NOTIFICATIONS_MARKED_ALL_READ', {
				count: result.count,
				newUnreadCount,
			});
		}

		return { count: result.count, newUnreadCount };
	},

	/**
	 * Xóa 1 notification
	 *
	 * @param {String} userId - User ID
	 * @param {String} notificationId - Notification ID
	 * @returns {Object} { message: 'Deleted' }
	 */
	deleteNotification: async (userId, notificationId) => {
		const notification = await prisma.notification.findFirst({
			where: {
				id: notificationId,
				userId,
			},
		});

		if (!notification) {
			throw new NotFoundException('Notification không tồn tại');
		}

		await prisma.notification.delete({
			where: { id: notificationId },
		});

		console.log(`[NotificationService] Deleted notification ${notificationId}`);
		return { message: 'Notification deleted successfully' };
	},

	/**
	 * Xóa tất cả notifications của user
	 *
	 * @param {String} userId - User ID
	 * @returns {Object} { count: số notification bị xóa }
	 */
	deleteAllNotifications: async (userId) => {
		const result = await prisma.notification.deleteMany({
			where: { userId },
		});

		console.log(
			`[NotificationService] Deleted ${result.count} notifications for user ${userId}`,
		);
		return { count: result.count };
	},

	/**
	 * Lấy tổng số notifications chưa đọc
	 *
	 * @param {String} userId - User ID
	 * @returns {Object} { unreadCount: number }
	 */
	getUnreadCount: async (userId) => {
		const count = await prisma.notification.count({
			where: {
				userId,
				isRead: false,
			},
		});

		return { unreadCount: count };
	},
};
