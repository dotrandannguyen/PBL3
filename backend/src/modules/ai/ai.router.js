/**
 * AI Router - Khai báo API Endpoint và Rate Limiting
 *
 * File: backend/src/modules/ai/ai.router.js
 *
 * Endpoint: POST /v1/api/ai/chat
 * - Yêu cầu đăng nhập (authGuard)
 * - Rate Limit: 10 requests/phút/IP (chống spam)
 * - BYOK: API Key nhận từ Header 'x-gemini-key'
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { aiService } from './ai.service.js';
import { authGuard } from '../../common/middleware/index.js';

const aiRouter = Router();

// Rate Limit: Chống Spam - Chỉ cho phép 10 requests mỗi phút mỗi user
const aiLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 phút
	max: 10,
	keyGenerator: (req) => req.user?.id || req.ip, // Rate limit theo userId
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		message: 'Bạn đang chat quá nhanh! Vui lòng thử lại sau 1 phút.',
	},
	// Bỏ qua rate limit cho SSE (response đã bắt đầu)
	skip: (req, res) => res.headersSent,
});

aiRouter.post('/chat', authGuard, aiLimiter, async (req, res, next) => {
	try {
		// BYOK: Lấy API Key từ Custom Header (không lưu vào DB)
		const apiKey = req.headers['x-gemini-key'];
		const modelName = req.headers['x-gemini-model'];

		if (!apiKey) {
			return res.status(400).json({
				message: 'Vui lòng cung cấp Gemini API Key trong header "x-gemini-key".',
			});
		}

		const { messages } = req.body;

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return res.status(400).json({ message: 'Tin nhắn không hợp lệ.' });
		}

		await aiService.chatStream(req.user.id, apiKey, modelName, messages, res);
	} catch (error) {
		next(error);
	}
});

export default aiRouter;
