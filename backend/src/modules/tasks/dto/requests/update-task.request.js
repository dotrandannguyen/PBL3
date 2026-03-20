/**
 * Update Task Request DTO
 *
 * PATCH /tasks/:id
 * Body: { title?: string, completed?: boolean, priority?: 'LOW'|'MEDIUM'|'HIGH', dueDate?: date, description?: string }
 *
 * Cho phép update:
 * - title: sửa tiêu đề
 * - completed: toggle trạng thái (check/uncheck)
 * - priority: thay đổi độ ưu tiên
 * - dueDate: thay đổi ngày hết hạn
 * - description: thay đổi mô tả
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
			priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
			dueDate: z.string().date().or(z.string().datetime()).optional().nullable(),
			description: z.string().max(1000).optional(),
		})
		.refine((data) => Object.values(data).some((v) => v !== undefined), {
			message: 'Phải cung cấp ít nhất một trường để update',
		}),
};
