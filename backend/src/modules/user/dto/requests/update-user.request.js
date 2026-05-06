import { z } from 'zod';

const THEME_VALUES = ['light', 'dark'];
const LANGUAGE_VALUES = ['vi', 'ja', 'en'];
const TIME_FORMAT_VALUES = ['24h', '12h'];
const TIMEZONE_VALUES = [
	'Asia/Ho_Chi_Minh',
	'Asia/Tokyo',
	'UTC',
	'Europe/London',
	'America/Los_Angeles',
	'America/New_York',
];

export const updateUserSchema = {
	body: z
		.object({
			fullName: z
				.string()
				.min(2, 'Tên phải có ít nhất 2 ký tự')
				.max(255)
				.optional()
				.nullable(),
			bio: z.string().max(1000, 'Bio quá dài').optional().nullable(),
			avatarUrl: z.string().min(1, 'Avatar URL không hợp lệ').optional().nullable(),
			theme: z.enum(THEME_VALUES).optional().nullable(),
			language: z.enum(LANGUAGE_VALUES).optional().nullable(),
			timeFormat: z.enum(TIME_FORMAT_VALUES).optional().nullable(),
			timezone: z.enum(TIMEZONE_VALUES).optional().nullable(),
		})
		.strict()
		.refine((data) => Object.values(data).some((value) => value !== undefined), {
			message: 'Phải cung cấp ít nhất một trường để update',
		}),
};
