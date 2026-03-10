/**
 * Task Response DTO
 *
 * Format response cho single task
 * Dùng cho:
 * - POST /tasks (create)
 * - GET /tasks/:id (detail)
 * - PATCH /tasks/:id (update)
 */

export class TaskResponseDto {
	constructor(task) {
		this.id = task.id;
		this.title = task.title;
		this.completed = task.completed;
		this.createdAt = task.createdAt;
		this.updatedAt = task.updatedAt;
	}
}

/**
 * Helper function để format single task
 * Dùng trong service layer
 */
export const formatTaskResponse = (task) => {
	return new TaskResponseDto(task);
};
