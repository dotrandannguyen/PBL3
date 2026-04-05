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
			// completed: false → status: PENDING, IN_PROGRESS (loại bỏ INBOX - chỉ xem ở /tasks/inbox)
			where.status =
				filters.completed === 'true'
					? 'DONE'
					: { in: ['PENDING', 'IN_PROGRESS'] };
		} else {
			// Default: Hiển thị tasks (PENDING, IN_PROGRESS, DONE - không bao gồm INBOX)
			where.OR = [
				{ status: TaskStatus.PENDING },
				{ status: TaskStatus.IN_PROGRESS },
				{ status: TaskStatus.DONE },
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
			// completed: false → status: PENDING, IN_PROGRESS (loại bỏ INBOX - chỉ xem ở /tasks/inbox)
			if (filters.completed === 'true') {
				where.status = TaskStatus.DONE;
			} else {
				where.OR = [
					{ status: TaskStatus.PENDING },
					{ status: TaskStatus.IN_PROGRESS },
				];
			}
		} else {
			// Default: Đếm tasks (PENDING, IN_PROGRESS, DONE - không bao gồm INBOX)
			where.OR = [
				{ status: TaskStatus.PENDING },
				{ status: TaskStatus.IN_PROGRESS },
				{ status: TaskStatus.DONE },
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
	 * Lấy danh sách INBOX tasks (chờ duyệt + đã thêm vào task)
	 * Trả về TẤT CẢ tasks từ external sources để hiển thị status
	 * @param {String} userId - ID của user
	 * @param {Object} pagination - { skip, limit }
	 * @returns {Array} Tasks từ external sources (cả converted và unconverted)
	 */
	findInbox: async (userId, pagination = {}) => {
		return await prisma.task.findMany({
			where: {
				userId,
				sourceType: {
					in: ['GMAIL', 'GITHUB'],
				},
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
				isConverted: true,
				dueDate: true,
				completedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	},

	/**
	 * Đếm tổng số INBOX tasks (tất cả tasks từ external)
	 * @param {String} userId - ID của user
	 * @returns {Number} Total count
	 */
	countInbox: async (userId) => {
		return await prisma.task.count({
			where: {
				userId,
				sourceType: {
					in: ['GMAIL', 'GITHUB'],
				},
				deletedAt: null,
			},
		});
	},

	/**
	 * UPSERT task vào INBOX
	 * Nếu task với (userId + sourceId) tồn tại → SKIP nếu đã converted, nếu còn INBOX thì update
	 * Nếu không tồn tại → create mới
	 * ✅ Tránh overwrite PENDING/DONE tasks khi re-sync
	 * @param {String} userId - ID của user
	 * @param {Object} taskData - { title, description, priority, sourceType, sourceId, sourceLink, sourceMetadata }
	 * @returns {Object} Task object từ database
	 */
	upsertTaskToInbox: async (userId, taskData) => {
		// Tìm xem task với userId + sourceId đã tồn tại chưa
		// Nếu sourceId không có, luôn create mới (không UPSERT)
		if (taskData.sourceId) {
			const existing = await prisma.task.findFirst({
				where: {
					userId,
					sourceId: taskData.sourceId,
				},
			});

			if (existing) {
				// ✅ Nếu task đã được convert (isConverted = true), skip update để giữ status PENDING/DONE
				if (existing.isConverted) {
					console.log(
						`⏭️  [UPSERT] Task "${existing.title}" đã được convert, skip re-sync.`,
					);
					return existing;
				}

				// Cập nhật task hiện có (chỉ update nếu còn INBOX)
				return await prisma.task.update({
					where: { id: existing.id },
					data: {
						title: taskData.title,
						description: taskData.description,
						priority: taskData.priority || 'MEDIUM',
						sourceLink: taskData.sourceLink,
						sourceMetadata: taskData.sourceMetadata,
						updatedAt: new Date(),
					},
				});
			}
		}

		// Nếu không tồn tại hoặc sourceId null → tạo task mới
		return await prisma.task.create({
			data: {
				userId,
				title: taskData.title,
				description: taskData.description,
				status: 'INBOX',
				priority: taskData.priority || 'MEDIUM',
				sourceType: taskData.sourceType,
				sourceId: taskData.sourceId,
				sourceLink: taskData.sourceLink,
				sourceMetadata: taskData.sourceMetadata,
				isConverted: false,
			},
		});
	},
};
