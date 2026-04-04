import prisma from '../../config/database.js';

const taskSelect = {
	id: true,
	title: true,
	description: true,
	status: true,
	priority: true,
	dueDate: true,
	scheduledAt: true,
	sourceMetadata: true,
	completedAt: true,
	createdAt: true,
	updatedAt: true,
};

/**
 * Task Repository - Database Access Layer
 * Clean architecture: Repository chỉ giao tiếp với database
 */
export const taskRepository = {
	/**
	 * Lấy danh sách tasks với pagination và filter
	 * @param {String} userId
	 * @param {Object} query - { completed, search, skip, take }
	 */
	findMany: async (userId, query = {}) => {
		const where = {
			userId,
			deletedAt: null,
		};

		if (query.completed !== undefined) {
			where.status =
				query.completed === true || query.completed === 'true'
					? 'DONE'
					: { not: 'DONE' };
		}

		if (query.search) {
			where.title = {
				contains: query.search,
				mode: 'insensitive',
			};
		}

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
		const where = {
			userId,
			deletedAt: null,
		};

		if (query.completed !== undefined) {
			where.status =
				query.completed === true || query.completed === 'true'
					? 'DONE'
					: { not: 'DONE' };
		}

		if (query.search) {
			where.title = {
				contains: query.search,
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
				dueDate: taskData.dueDate ?? null,
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
};
