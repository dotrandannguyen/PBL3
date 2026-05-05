import prisma from '../../config/database.js';
import { TaskStatus, TaskSource } from '@prisma/client';

const taskSelect = {
	id: true,
	userId: true,
	title: true,
	description: true,
	type: true,
	status: true,
	priority: true,
	dueDate: true,
	reminderAt: true,
	scheduledAt: true,
	sourceType: true,
	sourceId: true,
	sourceLink: true,
	sourceMetadata: true,
	isConverted: true,
	completedAt: true,
	createdAt: true,
	updatedAt: true,
};

/**
 * Task Repository - Database Access Layer
 * Clean architecture: Repository chỉ giao tiếp với database
 */
export const taskRepository = {
	buildTasksWhere: (userId, query = {}) => {
		const where = {
			userId,
			deletedAt: null,
			AND: [
				{
					OR: [{ sourceType: TaskSource.MANUAL }, { isConverted: true }],
				},
			],
		};

		if (query.completed !== undefined) {
			where.AND.push({
				status:
					query.completed === true || query.completed === 'true'
						? TaskStatus.DONE
						: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
			});
		} else {
			where.AND.push({
				status: {
					in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DONE],
				},
			});
		}

		if (query.search) {
			where.AND.push({
				title: {
					contains: query.search,
					mode: 'insensitive',
				},
			});
		}

		return where;
	},
	/**
	 * Lấy danh sách tasks với pagination và filter
	 * @param {String} userId
	 * @param {Object} query - { completed, search, skip, take }
	 */
	findMany: async (userId, query = {}) => {
		const where = taskRepository.buildTasksWhere(userId, query);

		return await prisma.task.findMany({
			where,
			skip: query.skip ?? 0,
			take: query.take ?? 10,
			orderBy: [
				{ scheduledAt: { sort: 'asc', nulls: 'last' } },
				{ dueDate: { sort: 'asc', nulls: 'last' } },
				{ createdAt: 'desc' },
			],
			select: taskSelect,
		});
	},

	/**
	 * Đếm tổng số tasks (cho pagination metadata)
	 */
	countTasks: async (userId, query = {}) => {
		const where = taskRepository.buildTasksWhere(userId, query);

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
			select: taskSelect,
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
				description: taskData.description ?? null,
				status: taskData.status ?? 'PENDING',
				priority: taskData.priority ?? 'MEDIUM',
				type: taskData.type ?? 'TODO',
				dueDate: taskData.dueDate ?? null,
				reminderAt: taskData.reminderAt ?? null,
				scheduledAt: taskData.scheduledAt ?? null,
				sourceMetadata: taskData.sourceMetadata ?? null,
			},
			select: taskSelect,
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
				scheduledAt: null,
			},
		});
	},

	/**
	 * Lấy danh sách tasks đã xoá (trash)
	 * @param {String} userId - ID của user
	 * @param {Object} query - { search, skip, take }
	 * @returns {Array} Tasks có deletedAt != null
	 */
	findDeleted: async (userId, query = {}) => {
		const where = {
			userId,
			deletedAt: { not: null },
		};

		if (query.search) {
			where.title = {
				contains: query.search,
				mode: 'insensitive',
			};
		}

		return await prisma.task.findMany({
			where,
			skip: query.skip ?? 0,
			take: query.take ?? 50,
			orderBy: [{ deletedAt: 'desc' }],
			select: {
				...taskSelect,
				deletedAt: true,
			},
		});
	},

	/**
	 * Đếm tổng số tasks đã xoá (cho pagination)
	 * @param {String} userId
	 * @param {Object} query - { search }
	 * @returns {Number} Total count
	 */
	countDeleted: async (userId, query = {}) => {
		const where = {
			userId,
			deletedAt: { not: null },
		};

		if (query.search) {
			where.title = {
				contains: query.search,
				mode: 'insensitive',
			};
		}

		return await prisma.task.count({ where });
	},

	/**
	 * Khôi phục task đã xoá (set deletedAt = null)
	 * @param {String} userId
	 * @param {String} taskId
	 */
	restore: async (userId, taskId) => {
		return await prisma.task.updateMany({
			where: {
				id: taskId,
				userId,
				deletedAt: { not: null },
			},
			data: {
				deletedAt: null,
			},
		});
	},

	/**
	 * Xoá vĩnh viễn task khỏi database
	 * @param {String} userId
	 * @param {String} taskId
	 */
	hardDelete: async (userId, taskId) => {
		return await prisma.task.deleteMany({
			where: {
				id: taskId,
				userId,
				deletedAt: { not: null },
			},
		});
	},

	/**
	 * Lấy 1 task đã xoá theo ID (cho restore/permanent delete)
	 * @param {String} userId
	 * @param {String} taskId
	 */
	findDeletedById: async (userId, taskId) => {
		return await prisma.task.findFirst({
			where: {
				id: taskId,
				userId,
				deletedAt: { not: null },
			},
			select: {
				...taskSelect,
				deletedAt: true,
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
					in: ['GMAIL', 'GITHUB', 'SLACK'],
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
					in: ['GMAIL', 'GITHUB', 'SLACK'],
				},
				deletedAt: null,
			},
		});
	},

	/**
	 * UPSERT task vào INBOX
	 * Nếu task với (userId + sourceId) tồn tại → SKIP nếu đã converted, nếu còn INBOX thì update
	 * Nếu không tồn tại → create mới
	 * Tránh overwrite PENDING/DONE tasks khi re-sync
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
				// Nếu task đã được convert (isConverted = true), skip update để giữ status PENDING/DONE
				if (existing.isConverted) {
					console.log(
						`[UPSERT] Task "${existing.title}" đã được convert, skip re-sync.`,
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
