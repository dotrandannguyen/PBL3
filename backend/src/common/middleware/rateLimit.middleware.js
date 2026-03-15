import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';

// Rate limit cho login: 5 lần cố gắng trong 15 phút
export const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 phút
	max: 5, // Tối đa 5 request
	message: 'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút.',
	standardHeaders: true, // Trả về thông tin rate limit ở header
	legacyHeaders: false, // Vô hiệu hóa header `X-RateLimit-*`
	// skip: (req) => {
	// 	// Không áp dụng rate limit cho các request từ localhost (dev)
	// 	return req.ip === '::1' || req.ip === '127.0.0.1';
	// },
	keyGenerator: (req, res) => {
		// Rate limit theo IP address + email để ngăn chặn brute force từng email cụ thể
		const ipKey = ipKeyGenerator(req, res);
		return `${ipKey}-${req.body?.email || 'unknown'}`;
	},
	handler: (req, res) => {
		return res.status(429).json({
			message:
				'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút.',
			statusCode: 429,
			data: null,
		});
	},
});

// Rate limit cho refresh token: 10 lần trong 1 phút
export const refreshLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 phút
	max: 10, // Tối đa 10 request
	message: 'Quá nhiều lần refresh token. Vui lòng thử lại sau 1 phút.',
	standardHeaders: true,
	legacyHeaders: false,
	// skip: (req) => {
	// 	// Không áp dụng rate limit cho localhost (dev)
	// 	return req.ip === '::1' || req.ip === '127.0.0.1';
	// },
	keyGenerator: ipKeyGenerator,
	handler: (req, res) => {
		return res.status(429).json({
			message: 'Quá nhiều lần refresh token. Vui lòng thử lại sau 1 phút.',
			statusCode: 429,
			data: null,
		});
	},
});

// Rate limit chung cho auth: 10 request/phút
export const generalAuthLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 phút
	max: 10,
	message: 'Quá nhiều request. Vui lòng thử lại sau.',
	standardHeaders: true,
	legacyHeaders: false,
});
