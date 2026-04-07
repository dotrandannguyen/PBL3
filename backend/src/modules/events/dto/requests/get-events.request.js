import { z } from 'zod';

const repeatValues = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const reminderValues = ['NONE', 'MINUTES_5', 'MINUTES_15', 'HOUR_1'];
const sortValues = ['date-asc', 'date-desc', 'created-asc', 'created-desc'];

export const getEventsSchema = {
	query: z
		.object({
			page: z
				.string()
				.optional()
				.transform((val) =>
					val !== undefined ? Number.parseInt(val, 10) : undefined,
				)
				.refine((val) => val === undefined || Number.isInteger(val), {
					message: 'Page must be a valid number',
				})
				.refine((val) => val === undefined || val > 0, {
					message: 'Page must be greater than 0',
				}),
			limit: z
				.string()
				.optional()
				.transform((val) =>
					val !== undefined ? Number.parseInt(val, 10) : undefined,
				)
				.refine((val) => val === undefined || Number.isInteger(val), {
					message: 'Limit must be a valid number',
				})
				.refine((val) => val === undefined || (val >= 1 && val <= 200), {
					message: 'Limit must be between 1 and 200',
				}),
			fromDate: z.string().date('fromDate must be in YYYY-MM-DD format').optional(),
			toDate: z.string().date('toDate must be in YYYY-MM-DD format').optional(),
			search: z
				.string()
				.min(1, 'Search keyword cannot be empty')
				.max(255, 'Search keyword is too long')
				.optional(),
			repeat: z.enum(repeatValues).optional(),
			reminder: z.enum(reminderValues).optional(),
			sortBy: z.enum(sortValues).optional(),
		})
		.refine(
			(data) => {
				if (!data.fromDate || !data.toDate) {
					return true;
				}

				return data.fromDate <= data.toDate;
			},
			{ message: 'fromDate must be before or equal to toDate' },
		),
};
