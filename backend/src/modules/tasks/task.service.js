import prisma from '../../config/database.js';
import { taskRepository } from './task.repository.js';
import { NotFoundException, OptionalException } from '../../common/exceptions/index.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Task Service - Business Logic Layer
 *
 * Nhiệm vụ:
 * 1. Xử lý logic nghiệp vụ
 * 2. Map giữa API format (completed: boolean) và DB format (status: enum)
 * 3. Validate business rules
 * 4. Gọi repository để thao tác database
 */
export const taskService = {
	/**
	 * Lấy danh sách tasks với pagination, filter, search
	 *
	 * @param {String} userId - ID của user
	 * @param {Object} query - { page, limit, completed, search }
	 * @returns {Object} { data: [], pagination: {} }
	 */
	getTasks: async (userId, query) => {
		// Parse pagination params
		const page = parseInt(query.page) || 1;
		const limit = parseInt(query.limit) || 10;
		const skip = (page - 1) * limit;

		// Parse filter params
		const filters = {
			completed: query.completed, // 'true' | 'false' | undefined
			search: query.search || undefined,
		};

		// Fetch data từ repository
		const [tasks, totalItems] = await Promise.all([
			taskRepository.findMany(userId, filters, { skip, limit }),
			taskRepository.countTasks(userId, filters),
		]);

		// Map database format → API format
		const mappedTasks = tasks.map((task) => mapTaskToResponse(task));

		// Calculate pagination metadata
		const totalPages = Math.ceil(totalItems / limit);

		return {
			data: mappedTasks,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
			},
		};
	},

	/**
	 * Lấy chi tiết 1 task
	 */
	getTaskById: async (userId, taskId) => {
		const task = await taskRepository.findById(userId, taskId);

		if (!task) {
			throw new NotFoundException('Task không tồn tại.');
		}

		return mapTaskToResponse(task);
	},

	/**
	 * Tạo task mới
	 *
	 * @param {String} userId
	 * @param {Object} dto - { title, completed?, dueDate? }
	 */
	createTask: async (userId, dto) => {
		// Map API format → DB format
		const taskData = {
			title: dto.title,
			status: dto.completed === true ? 'DONE' : 'PENDING',
		};

		// Add dueDate if provided
		if (dto.dueDate) {
			taskData.dueDate = new Date(dto.dueDate);
		}

		// Add description if provided
		if (dto.description) {
			taskData.description = dto.description;
		}

		// Add priority if provided
		if (dto.priority) {
			taskData.priority = dto.priority;
		}

		// Nếu task được tạo với completed=true, set completedAt
		if (dto.completed === true) {
			taskData.completedAt = new Date();
		}

		const task = await taskRepository.create(userId, taskData);

		return mapTaskToResponse(task);
	},

	/**
	 * Cập nhật task (title, completed, dueDate, etc.)
	 *
	 * @param {String} userId
	 * @param {String} taskId
	 * @param {Object} dto - { title?, completed?, dueDate?, description?, priority? }
	 */
	updateTask: async (userId, taskId, dto) => {
		// Check task tồn tại
		const existingTask = await taskRepository.findById(userId, taskId);
		if (!existingTask) {
			throw new NotFoundException('Task không tồn tại.');
		}

		const updateData = {};

		// Update title nếu có
		if (dto.title !== undefined) {
			updateData.title = dto.title;
		}

		// Update dueDate nếu có
		if (dto.dueDate !== undefined) {
			updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
		}

		// Update description nếu có
		if (dto.description !== undefined) {
			updateData.description = dto.description;
		}

		// Update priority nếu có
		if (dto.priority !== undefined) {
			updateData.priority = dto.priority;
		}

		// Update completed status
		if (dto.completed !== undefined) {
			if (dto.completed === true) {
				// Mark as completed
				updateData.status = 'DONE';
				updateData.completedAt = new Date();
			} else {
				// Mark as incomplete
				updateData.status = 'PENDING';
				updateData.completedAt = null;
			}
		}

		// Thực hiện update
		await taskRepository.update(userId, taskId, updateData);

		// Fetch lại task đã update để trả về
		const updatedTask = await taskRepository.findById(userId, taskId);

		return mapTaskToResponse(updatedTask);
	},

	/**
	 * Xóa task (soft delete)
	 */
	deleteTask: async (userId, taskId) => {
		// Check task tồn tại
		const task = await taskRepository.findById(userId, taskId);
		if (!task) {
			throw new NotFoundException('Task không tồn tại.');
		}

		// Soft delete
		await taskRepository.softDelete(userId, taskId);

		return { message: 'Task deleted successfully' };
	},

	/**
	 * Lấy danh sách INBOX tasks (chờ duyệt từ Webhook/Fetch API)
	 * ✅ QUAN TRỌNG: Fetch TẤT CẢ tasks từ sourceType GMAIL/GITHUB (không filter status)
	 * Để frontend có thể lookup và merge isConverted flag cho tất cả tasks (kể cả PENDING/DONE)
	 *
	 * @param {String} userId - ID của user
	 * @param {Object} query - { page, limit, search }
	 * @returns {Object} { data: [], pagination: {} }
	 */
	getInboxTasks: async (userId, query) => {
		// Parse pagination params
		const page = parseInt(query.page) || 1;
		const limit = parseInt(query.limit) || 100; // Tăng limit để lấy đủ tasks
		const skip = (page - 1) * limit;

		// ✅ Fetch TẤT CẢ tasks từ sourceType GMAIL/GITHUB (bất kể status)
		// Không dùng findInbox() vì nó chỉ lấy status=INBOX
		const tasks = await prisma.task.findMany({
			where: {
				userId,
				sourceType: {
					in: ['GMAIL', 'GITHUB'],
				},
				deletedAt: null,
			},
			skip,
			take: limit,
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

		const totalItems = await prisma.task.count({
			where: {
				userId,
				sourceType: {
					in: ['GMAIL', 'GITHUB'],
				},
				deletedAt: null,
			},
		});

		// Map database format → API format
		const mappedTasks = tasks.map((task) => mapTaskToResponse(task));

		// Calculate pagination metadata
		const totalPages = Math.ceil(totalItems / limit);

		return {
			data: mappedTasks,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
			},
		};
	},

	/**
	 * Xác nhận INBOX task - chuyển từ INBOX → PENDING
	 * Người dùng bấm "Thêm vào công việc" ở Inbox sẽ gọi endpoint này
	 * ✅ Set is_converted = true để tránh sync lại tạo duplicate
	 *
	 * @param {String} userId
	 * @param {String} taskId
	 * @returns {Object} Updated task
	 */
	confirmInboxTask: async (userId, taskId) => {
		// Check task tồn tại và có status = INBOX
		const task = await taskRepository.findById(userId, taskId);
		if (!task) {
			throw new NotFoundException('Task không tồn tại.');
		}

		if (task.status !== 'INBOX') {
			throw new OptionalException(
				StatusCodes.BAD_REQUEST,
				'Chỉ có thể xác nhận INBOX tasks. Task này không trong Inbox.',
			);
		}

		// Chuyển từ INBOX → PENDING + Mark as converted
		await taskRepository.update(userId, taskId, {
			status: 'PENDING',
			isConverted: true,
		});

		// Fetch lại task đã update
		const updatedTask = await taskRepository.findById(userId, taskId);
		return mapTaskToResponse(updatedTask);
	},
};

/**
 * Helper: Map database model → API response format
 *
 * DB format: { status: 'DONE' | 'PENDING' | 'IN_PROGRESS' }
 * API format: { completed: true | false }
 * Include tất cả fields cho Inbox view
 */
function mapTaskToResponse(task) {
	return {
		id: task.id,
		title: task.title,
		completed: task.status === 'DONE',
		status: task.status,
		description: task.description,
		priority: task.priority,
		dueDate: task.dueDate,
		completedAt: task.completedAt,
		sourceType: task.sourceType,
		sourceId: task.sourceId,
		sourceLink: task.sourceLink,
		sourceMetadata: task.sourceMetadata,
		isConverted: task.isConverted || false, // ✅ Include isConverted flag
		createdAt: task.createdAt,
		updatedAt: task.updatedAt,
	};
}
