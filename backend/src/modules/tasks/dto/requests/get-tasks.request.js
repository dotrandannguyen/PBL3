/**
 * Get Tasks Request DTO
 *
 * Validate query params cho GET /tasks
 * - page: số trang (phải là số dương)
 * - limit: items per page (1-100)
 * - completed: 'true' hoặc 'false'
 * - search: keyword tìm kiếm
 */
import { z } from 'zod';

export const getTasksSchema = {
	query: z.object({
		// Pagination
		page: z
			.string()
			.optional()
			.transform((val) => (val ? parseInt(val) : 1))
			.refine((val) => val > 0, { message: 'Page phải lớn hơn 0' }),

		limit: z
			.string()
			.optional()
			.transform((val) => (val ? parseInt(val) : 10))
			.refine((val) => val >= 1 && val <= 100, {
				message: 'Limit phải từ 1 đến 100',
			}),

		// Filter by completed status
		completed: z
			.enum(['true', 'false'])
			.optional()
			.describe('Filter tasks: true = done, false = pending'),

		// Search by title
		search: z
			.string()
			.min(1, 'Search keyword không được rỗng')
			.max(255, 'Search keyword quá dài')
			.optional()
			.describe('Tìm kiếm task theo title (case-insensitive)'),
	}),
};
