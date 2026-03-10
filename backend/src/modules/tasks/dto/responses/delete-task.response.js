/**
 * Delete Task Response DTO
 *
 * Response cho DELETE /tasks/:id
 */

export class DeleteTaskResponseDto {
	constructor() {
		this.message = 'Task deleted successfully';
	}
}

/**
 * Helper function để format delete response
 */
export const formatDeleteResponse = () => {
	return new DeleteTaskResponseDto();
};
