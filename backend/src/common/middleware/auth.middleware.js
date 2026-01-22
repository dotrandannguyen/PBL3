import jwt from 'jsonwebtoken';
import { UnauthorizedException } from '../exceptions/unauthorized.exception.js';
import dotenv from 'dotenv';

dotenv.config();

export const authMiddleware = (req, res, next) => {
	try {
		// 1. Lấy header Authorization
		const authHeader = req.headers.authorization;

		// 2. Kiểm tra xem có header không và có bắt đầu bằng Bearer không
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException(
				'Bạn chưa đăng nhập hoặc Token không hợp lệ.',
			);
		}

		// 3. Lấy token ra (bỏ chữ 'Bearer ' đi)
		const token = authHeader.split(' ')[1];

		if (!token) {
			throw new UnauthorizedException('Token không tồn tại.');
		}

		// 4. Xác thực token (Verify)
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// 5. Gán thông tin user đã giải mã vào request để dùng ở Controller
		// decoded thường chứa { id: '...', iat: ..., exp: ... }
		req.user = decoded;

		// 6. Cho phép đi tiếp
		next();
	} catch (error) {
		// Nếu jwt hết hạn hoặc sai chữ ký, nó sẽ throw error
		// Ta bắt lại và ném ra UnauthorizedException chuẩn của dự án
		throw new UnauthorizedException('Phiên đăng nhập hết hạn hoặc không hợp lệ.');
	}
};
