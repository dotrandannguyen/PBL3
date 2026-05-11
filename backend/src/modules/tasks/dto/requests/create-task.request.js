/**
 * Create Task Request DTO - v2
 *
 * POST /tasks
 * Body: {
 *   title: string,
 *   description?: string,
 *   priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT',
 *   type?: 'TODO'|'SCHEDULED'       // v2: tường minh; nếu không gửi sẻ suy diễn từ startAt
 *   dueDate?: ISO datetime | null,   // endAt alias nội bộ
 *   startAt?: ISO datetime | null,   // scheduledAt alias nội bộ (SCHEDULED only)
 *   reminderAt?: ISO datetime | null
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
			// v2: type tường minh; nếu không gửi sẻ auto-resolve từ startAt
			type: z.enum(['TODO', 'SCHEDULED']).optional(),
			dueDate: z.string().date().or(z.string().datetime()).optional().nullable(),
			startAt: z.string().datetime().optional().nullable(),
			reminderAt: z.string().datetime().optional().nullable(),
			parentId: z.string().uuid().optional().nullable(),
			workspaceId: z.string().uuid().optional().nullable(),
		})
		.strict()
		.superRefine((data, ctx) => {
			if (data.dueDate) {
				const due = new Date(data.dueDate);
				if (due < new Date()) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['dueDate'],
						message: 'Hạn chót không được ở quá khứ.',
					});
				}
			}
		}),
};
