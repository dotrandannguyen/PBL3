import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

import { OptionalException } from '../exceptions/index.js';

export const validateRequestMiddleware = (schema) => {
	return (req, _res, next) => {
		try {
			for (const key in schema) {
				const zodSchema = schema[key];

				if (!zodSchema) continue;

				const value = req[key];
				//Gán lại giá trị đã clean vào req
				if (Array.isArray(zodSchema)) {
					zodSchema.forEach((s) => s.parse(value));
				} else {
					const parsedValue = zodSchema.parse(value);
					if (key === 'query' || key === 'params') {
						// Với query và params giữ nguyên object reference, chỉ cập nhật nội dung
						Object.assign(req[key], parsedValue);
					} else {
						// Với body gán đè bình thường
						req[key] = parsedValue;
					}
				}
			}

			next();
		} catch (err) {
			if (err instanceof ZodError) {
				const message = err.issues
					.map((e) => `${e.path.join('.')} ${e.message}`)
					.join('; ');
				// Ném lỗi ra để errorHandler bắt
				return next(
					new OptionalException(StatusCodes.UNPROCESSABLE_ENTITY, message),
				);
			}

			return next(err);
		}
	};
};
