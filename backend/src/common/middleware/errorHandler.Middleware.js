import { HttpResponse } from '../dtos/index.js';
import { StatusCodes } from 'http-status-codes';
export const errorHandlerMiddleware = (err, req, res, next) => {
	if (err && err.status) {
		return new HttpResponse(res).exception(err);
	}
	console.error('INTERNAL ERROR:', err);
	return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		success: false,
		message: 'Internal Server Error. Please try again later.',
		// Chỉ hiện chi tiết lỗi nếu đang ở môi trường dev
		error: process.env.NODE_ENV === 'development' ? err.message : undefined,
	});
};

//Lỗi: Dòng return next(err) ở cuối cùng. Nếu lỗi đó là lỗi DB (Prisma) hoặc code bị crash (không có status), server sẽ không trả về JSON mà có thể treo hoặc trả về HTML lỗi của Express.
