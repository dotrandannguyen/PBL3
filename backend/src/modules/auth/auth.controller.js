import { HttpResponse } from '../../common/dtos/index.js';
import { authService } from './auth.service.js';

export const authController = {
	register: async (req, res, next) => {
		try {
			const data = await authService.register(req.body);
			return new HttpResponse(res).created(data);
		} catch (error) {
			next(error);
		}
	},

	login: async (req, res, next) => {
		try {
			const data = await authService.login(req.body);
			return new HttpResponse(res).success(data);
		} catch (error) {
			next(error);
		}
	},
};
