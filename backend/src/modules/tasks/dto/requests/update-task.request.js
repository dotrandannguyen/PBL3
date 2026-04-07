/**
 * Update Task Request DTO
 *
 * PATCH /tasks/:id
 * Body: { title?: string, description?: string, priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT', dueDate?: date, status?: TaskStatus }
 *
 * Cho phép update:
 * - title: sửa tiêu đề
 * - status: cập nhật trạng thái task
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
			description: z.string().max(1000).optional().nullable(),
			priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
			dueDate: z.string().date().or(z.string().datetime()).optional().nullable(),
			status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'ARCHIVED']).optional(),
		})
		.strict()
		.refine((data) => Object.values(data).some((v) => v !== undefined), {
			message: 'Phải cung cấp ít nhất một trường để update',
		}),
};
