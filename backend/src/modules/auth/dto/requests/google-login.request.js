import { z } from 'zod';

export const googleCallbackSchema = {
	query: z.object({
		code: z.string().min(1, 'Authorization Code is missing'),
		error: z.string().optional(), // Google có thể trả về lỗi nếu user từ chối
	}),
};
