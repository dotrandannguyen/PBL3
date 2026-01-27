import { authService } from './auth.service.js';
import { HttpResponse } from '../../common/dtos/httpResponse.dto.js';

export const authController = {
	register: async (req, res, next) => {
		try {
			const result = await authService.register(req.body);
			return new HttpResponse(res).created(result);
		} catch (error) {
			next(error);
		}
	},

	login: async (req, res, next) => {
		try {
			const result = await authService.login(req.body);
			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},
};
