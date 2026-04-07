/**
 * Create Task Request DTO
 *
 * POST /tasks
 * Body: {
 *   title: string,
 *   description?: string,
 *   priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT',
 *   dueDate?: date,
 *   startAt?: ISO datetime | null
 * }
 */
import { z } from 'zod';

export const createTaskSchema = {
	body: z
		.object({
			title: z
				.string()
				.min(1, 'Title không được để trống')
				.max(255, 'Title không được vượt quá 255 ký tự'),
			description: z.string().max(1000).optional().nullable(),
			priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
			dueDate: z.string().date().or(z.string().datetime()).optional().nullable(),
			startAt: z.string().datetime().optional().nullable(),
		})
		.strict(),
};
