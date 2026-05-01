/**
 * Task Response DTO - v2
 *
 * Format response cho single task
 * Dùng cho:
 * - POST /tasks (create)
 * - GET /tasks/:id (detail)
 * - PATCH /tasks/:id (update)
 * - PATCH /tasks/:id/schedule (mark scheduled)
 *
 * v2 additions:
 * - type: 'TODO' | 'SCHEDULED'
 * - startAt: alias cho scheduledAt (SCHEDULED tasks)
 * - endAt: alias cho dueDate
 */

export class TaskResponseDto {
	constructor(task) {
		this.id = task.id;
		this.title = task.title;

		// v2: type tường minh
		this.type = task.type || 'TODO';

		this.status = task.status;
		this.completed = task.completed ?? (task.status === 'DONE');
		this.priority = task.priority;
		this.description = task.description ?? null;

		// Timestamps — giữ cả tên legacy lẫn alias v2
		this.dueDate = task.dueDate ?? null;     // legacy
		this.endAt = task.dueDate ?? null;       // v2 alias
		this.scheduledAt = task.scheduledAt ?? null;  // legacy
		this.startAt = task.scheduledAt ?? null; // v2 alias
		this.reminderAt = task.reminderAt ?? null;
		this.completedAt = task.completedAt ?? null;

		// Source info
		this.sourceType = task.sourceType ?? null;
		this.sourceId = task.sourceId ?? null;
		this.sourceLink = task.sourceLink ?? null;
		this.sourceMetadata = task.sourceMetadata ?? null;
		this.isConverted = task.isConverted ?? false;

		this.createdAt = task.createdAt;
		this.updatedAt = task.updatedAt;
	}
}

/**
 * Helper function để format single task
 */
export const formatTaskResponse = (task) => {
	return new TaskResponseDto(task);
};
