/**
 * Create Task Request DTO
 *
 * POST /tasks
 * Body: { title: string, completed?: boolean, priority?: 'LOW'|'MEDIUM'|'HIGH', dueDate?: date, description?: string }
 */
import { z } from 'zod';

export const createTaskSchema = {
	body: z.object({
		title: z
			.string()
			.min(1, 'Title không được để trống')
			.max(255, 'Title không được vượt quá 255 ký tự'),
		completed: z.boolean().optional().default(false),
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
		dueDate: z.string().date().or(z.string().datetime()).optional().nullable(),
		description: z.string().max(1000).optional(),
	}),
};
