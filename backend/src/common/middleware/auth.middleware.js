import jwt from 'jsonwebtoken';
import { UnauthorizedException, ForbiddenException } from '../exceptions/index.js';
import prisma from '../../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-pbl3';

export const authGuard = async (req, res, next) => {
	try {
		// 1. Lấy token từ Header (Format: "Bearer <token>")
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('Bạn chưa đăng nhập (Thiếu Token).');
		}

		const token = authHeader.split(' ')[1];

		// 2. Verify Token (Kiểm tra chữ ký và hạn dùng)
		let decoded;
		try {
			decoded = jwt.verify(token, JWT_SECRET);
		} catch (err) {
			if (err.name === 'TokenExpiredError') {
				throw new UnauthorizedException(
					'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
				);
			}
			throw new UnauthorizedException('Token không hợp lệ.');
		}

		// 3. Kiểm tra User trong DB (Bắt buộc)
		// Tại sao verify xong rồi vẫn phải query DB?
		// -> Để đề phòng trường hợp User vừa bị Admin xóa hoặc Khóa tài khoản tức thì.
		const user = await prisma.user.findUnique({
			where: { id: decoded.sub }, // 'sub' chứa UUID user
			select: {
				id: true,
				email: true,
				isActive: true,
				role: true,
				// Không lấy password hay field nhạy cảm
			},
		});

		if (!user) {
			throw new UnauthorizedException('Người dùng không còn tồn tại.');
		}

		// 4. Kiểm tra trạng thái hoạt động
		if (!user.isActive) {
			throw new ForbiddenException('Tài khoản của bạn đã bị khóa.');
		}

		// 5. GẮN USER VÀO REQUEST (Quan trọng nhất)
		// Nhờ bước này mà ở TaskController ta mới dùng được `req.user.id`
		req.user = user;

		next(); // Cho phép đi tiếp vào Controller
	} catch (error) {
		next(error);
	}
};
