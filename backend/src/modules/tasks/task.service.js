import { taskRepository } from './task.repository.js';
import { NotFoundException } from '../../common/exceptions/index.js';

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
};

/**
 * Helper: Map database model → API response format
 *
 * DB format: { status: 'DONE' | 'PENDING' | 'IN_PROGRESS' }
 * API format: { completed: true | false }
 */
function mapTaskToResponse(task) {
	return {
		id: task.id,
		title: task.title,
		completed: task.status === 'DONE', // Map status → completed
		status: task.status,
		dueDate: task.dueDate, // Include due date
		description: task.description,
		priority: task.priority,
		completedAt: task.completedAt,
		createdAt: task.createdAt,
		updatedAt: task.updatedAt,
	};
}
