import { z } from 'zod';

export const RegisterSchema = {
	body: z.object({
		email: z.string().email('Email không đúng định dạng'),
		name: z.string().min(2, 'Username không được ít hơn 2 kí tự'),
		password: z
			.string()
			.min(2, 'Password không được ít hơn 2 kí tự')
			.max(50, 'Password không được dài hơn 50 kí tự'),
	}),
};

export const LoginSchema = {
	body: z.object({
		email: z.string().email('Email không đúng định dạng'),
		password: z
			.string()
			.min(2, 'Password không được ít hơn 2 kí tự')
			.max(50, 'Password không được dài hơn 50 kí tự'),
	}),
};
