import prisma from '../../config/database.js';
import { TaskStatus } from '@prisma/client';

/**
 * Task Repository - Database Access Layer
 * Clean architecture: Repository chỉ giao tiếp với database
 */
export const taskRepository = {
	/**
	 * Lấy danh sách tasks với pagination và filter
	 * @param {String} userId - ID của user
	 * @param {Object} filters - { completed, search }
	 * @param {Object} pagination - { page, limit, skip }
	 */
	findMany: async (userId, filters = {}, pagination = {}) => {
		const where = {
			userId,
			deletedAt: null, // Không lấy task đã xóa
		};

		// Filter by completed status
		if (filters.completed !== undefined) {
			// completed: true → status: DONE
			// completed: false → status: PENDING, IN_PROGRESS, INBOX (từ webhook)
			where.status =
				filters.completed === 'true'
					? 'DONE'
					: { in: ['PENDING', 'IN_PROGRESS', 'INBOX'] };
		} else {
			// Default: Hiển thị tất cả tasks (kể cả INBOX)
			where.OR = [
				{ status: TaskStatus.PENDING },
				{ status: TaskStatus.IN_PROGRESS },
				{ status: TaskStatus.DONE },
				{ status: TaskStatus.INBOX }
			];
		}

		// Search by title (case-insensitive)
		if (filters.search) {
			where.title = {
				contains: filters.search,
				mode: 'insensitive',
			};
		}

		return await prisma.task.findMany({
			where,
			skip: pagination.skip || 0,
			take: pagination.limit || 10,
			orderBy: [{ createdAt: 'desc' }],
			select: {
				id: true,
				title: true,
				description: true,
				status: true,
				priority: true,
				dueDate: true,
				completedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	},

	/**
	 * Đếm tổng số tasks (cho pagination metadata)
	 */
	countTasks: async (userId, filters = {}) => {
		const where = {
			userId,
			deletedAt: null,
		};

		if (filters.completed !== undefined) {
			// completed: true → status: DONE
			// completed: false → status: PENDING, IN_PROGRESS, INBOX (từ webhook)
			if (filters.completed === 'true') {
				where.status = TaskStatus.DONE;
			} else {
				where.OR = [
					{ status: TaskStatus.PENDING },
					{ status: TaskStatus.IN_PROGRESS },
					{ status: TaskStatus.INBOX }
				];
			}
		} else {
			// Default: Đếm tất cả tasks (kể cả INBOX)
			where.OR = [
				{ status: TaskStatus.PENDING },
				{ status: TaskStatus.IN_PROGRESS },
				{ status: TaskStatus.DONE },
				{ status: TaskStatus.INBOX }
			];
		}

		if (filters.search) {
			where.title = {
				contains: filters.search,
				mode: 'insensitive',
			};
		}

		return await prisma.task.count({ where });
	},

	/**
	 * Lấy chi tiết 1 task theo ID
	 * Security: Phải check userId để user chỉ xem được task của mình
	 */
	findById: async (userId, taskId) => {
		return await prisma.task.findFirst({
			where: {
				id: taskId,
				userId,
				deletedAt: null,
			},
			select: {
				id: true,
				title: true,
				description: true,
				status: true,
				priority: true,
				dueDate: true,
				completedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	},

	/**
	 * Tạo task mới
	 */
	create: async (userId, taskData) => {
		return await prisma.task.create({
			data: {
				userId,
				title: taskData.title,
				description: taskData.description || null,
				status: taskData.status || 'PENDING',
				priority: taskData.priority || 'MEDIUM',
				dueDate: taskData.dueDate || null,
			},
			select: {
				id: true,
				title: true,
				description: true,
				status: true,
				priority: true,
				dueDate: true,
				completedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	},

	/**
	 * Cập nhật task
	 * Security: Phải check userId
	 */
	update: async (userId, taskId, updateData) => {
		return await prisma.task.updateMany({
			where: {
				id: taskId,
				userId, // Security check
				deletedAt: null,
			},
			data: updateData,
		});
	},

	/**
	 * Xóa mềm task (soft delete)
	 * Chỉ set deletedAt, không xóa vật lý khỏi database
	 */
	softDelete: async (userId, taskId) => {
		return await prisma.task.updateMany({
			where: {
				id: taskId,
				userId,
				deletedAt: null,
			},
			data: {
				deletedAt: new Date(),
			},
		});
	},

	/**
	 * Lấy danh sách INBOX tasks (chờ duyệt)
	 * @param {String} userId - ID của user
	 * @param {Object} pagination - { skip, limit }
	 * @returns {Array} INBOX tasks
	 */
	findInbox: async (userId, pagination = {}) => {
		return await prisma.task.findMany({
			where: {
				userId,
				status: 'INBOX',
				deletedAt: null,
			},
			skip: pagination.skip || 0,
			take: pagination.limit || 10,
			orderBy: [{ createdAt: 'desc' }],
			select: {
				id: true,
				title: true,
				description: true,
				status: true,
				priority: true,
				sourceType: true,
				sourceId: true,
				sourceLink: true,
				sourceMetadata: true,
				dueDate: true,
				completedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	},

	/**
	 * Đếm tổng số INBOX tasks
	 * @param {String} userId - ID của user
	 * @returns {Number} Total count
	 */
	countInbox: async (userId) => {
		return await prisma.task.count({
			where: {
				userId,
				status: 'INBOX',
				deletedAt: null,
			},
		});
	},
};
