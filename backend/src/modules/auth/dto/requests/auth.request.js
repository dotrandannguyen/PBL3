import { z } from 'zod';

export const registerSchema = {
	body: z.object({
		email: z.string().email('Email không hợp lệ'),
		password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
		name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
	}),
};

export const loginSchema = {
	body: z.object({
		email: z.string().email(),
		password: z.string().min(1),
	}),
};
