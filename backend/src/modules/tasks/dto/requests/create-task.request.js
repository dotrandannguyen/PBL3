// Create Task Request DTO
import { z } from 'zod';

export const createTaskSchema = {
	body: z.object({
		title: z.string().min(1, 'Tiêu đề không được để trống').max(255),
		description: z.string().optional(),
		status: z
			.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'ARCHIVED'])
			.optional()
			.default('PENDING'),
		priority: z
			.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
			.optional()
			.default('MEDIUM'),
		// DateTime chuẩn ISO (VD: "2026-01-30T10:00:00Z")
		dueDate: z
			.string()
			.datetime({ message: 'Ngày hết hạn không hợp lệ' })
			.nullable()
			.optional(),
		reminderAt: z.string().datetime().nullable().optional(),
	}),
};
