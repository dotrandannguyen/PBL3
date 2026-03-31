import { z } from 'zod';

const repeatValues = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const reminderValues = ['NONE', 'MINUTES_5', 'MINUTES_15', 'HOUR_1'];

export const updateEventSchema = {
	params: z.object({
		id: z.string().uuid('Invalid event id'),
	}),
	body: z
		.object({
			title: z
				.string()
				.min(1, 'Title cannot be empty')
				.max(255, 'Title must be less than 256 characters')
				.optional(),
			date: z.string().date('Date must be in YYYY-MM-DD format').optional(),
			time: z
				.string()
				.regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format')
				.optional(),
			color: z
				.string()
				.regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Color must be a valid HEX code')
				.optional(),
			location: z
				.string()
				.max(255, 'Location must be less than 256 characters')
				.optional()
				.nullable(),
			description: z.string().max(10000).optional().nullable(),
			repeat: z.enum(repeatValues).optional(),
			reminder: z.enum(reminderValues).optional(),
		})
		.refine((data) => Object.values(data).some((value) => value !== undefined), {
			message: 'At least one field is required for update',
		}),
};
