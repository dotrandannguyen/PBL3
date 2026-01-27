import { z } from 'zod';

export const loginSchema = {
	body: z.object({
		email: z.string().email('Email không hợp lệ'),
		password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
	}),
};
