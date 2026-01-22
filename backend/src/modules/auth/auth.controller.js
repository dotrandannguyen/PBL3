import { HttpResponse } from '../../common/dtos/index.js';
import authService from './auth.service.js';
import { AuthResponse } from './dto/responses/auth.response.js';

class AuthController {
	async register(req, res, next) {
		try {
			const user = await authService.register(req.body);
			const data = new AuthResponse(user);
			return new HttpResponse(res).created(data);
		} catch (error) {
			next(error);
		}
	}
	async login(req, res, next) {
		try {
			const { user, token } = await authService.login(req.body);
			const data = new AuthResponse(user, token);
			return new HttpResponse(res).success(data);
		} catch (error) {
			next(error);
		}
	}
}

export default new AuthController();
