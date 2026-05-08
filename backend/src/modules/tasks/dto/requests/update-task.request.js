/**
 * Update Task Request DTO - v2
 *
 * PATCH /tasks/:id
 * Body (tất cả optional, ít nhất 1 field):
 * - title: sửa tiêu đề
 * - description: thay đổi mô tả
 * - priority: thay đổi độ ưu tiên
 * - status: cập nhật trạng thái task
 * - dueDate: thay đổi ngày hết hạn (endAt alias)
 * - startAt: thay đổi thời điểm bắt đầu (scheduledAt alias, null = unschedule)
 * - reminderAt: thay đổi thời gian nhắc nhở
 * - type: v2 - cập nhật loại task (TODO|SCHEDULED); thường auto-resolved từ startAt
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
			status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'ARCHIVED']).optional(),
			dueDate: z.string().date().or(z.string().datetime()).optional().nullable(),
			// v2: startAt alias cho scheduledAt — null = unschedule task
			startAt: z.string().datetime().optional().nullable(),
			reminderAt: z.string().datetime().optional().nullable(),
			// v2: type tường minh (nếu không gửi sẽ auto-resolve từ startAt)
			type: z.enum(['TODO', 'SCHEDULED']).optional(),
			parentId: z.string().uuid().optional().nullable(),
			workspaceId: z.string().uuid().optional().nullable(),
		})
		.strict()
		.refine((data) => Object.values(data).some((v) => v !== undefined), {
			message: 'Phải cung cấp ít nhất một trường để update',
		}),
};
