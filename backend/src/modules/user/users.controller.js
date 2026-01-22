import { HttpResponse } from '../../common/dtos/index.js';
import usersService from './users.service.js';

class UserController {
	async getAllUser(req, res, next) {
		try {
			const allUser = await usersService.getAllUserService();
			return new HttpResponse(res).success(allUser);
		} catch (error) {
			next(error);
		}
	}
}

export default new UserController();
