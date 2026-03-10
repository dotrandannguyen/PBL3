/**
 * Update Task Request DTO
 *
 * PATCH /tasks/:id
 * Body: { title?: string, completed?: boolean }
 *
 * Cho phép update:
 * - title: sửa tiêu đề
 * - completed: toggle trạng thái (check/uncheck)
 */
import { z } from 'zod';

export const updateTaskSchema = {
	body: z
		.object({
			title: z
				.string()
				.min(1, 'Title không được để trống')
				.max(255, 'Title không được vượt quá 255 ký tự')
				.optional(),
			completed: z.boolean().optional(),
		})
		.refine((data) => data.title !== undefined || data.completed !== undefined, {
			message: 'Phải cung cấp ít nhất title hoặc completed để update',
		}),
};
