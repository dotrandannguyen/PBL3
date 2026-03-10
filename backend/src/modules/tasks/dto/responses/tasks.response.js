/**
 * Task List Response DTO
 *
 * Format response cho GET /tasks với pagination
 *
 * Response structure:
 * {
 *   data: [...tasks],
 *   pagination: {
 *     page: 1,
 *     limit: 10,
 *     totalItems: 45,
 *     totalPages: 5
 *   }
 * }
 */

import { TaskResponseDto } from './task.response.js';

export class TaskListResponseDto {
	constructor(tasks, paginationMeta) {
		this.data = tasks.map((task) => new TaskResponseDto(task));
		this.pagination = {
			page: paginationMeta.page,
			limit: paginationMeta.limit,
			totalItems: paginationMeta.totalItems,
			totalPages: paginationMeta.totalPages,
		};
	}
}

/**
 * Helper function để format task list
 * Dùng trong service layer
 */
export const formatTaskListResponse = (tasks, pagination) => {
	return new TaskListResponseDto(tasks, pagination);
};
