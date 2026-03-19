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
	async deleteUser(req,res,next){
		try {
			const userId = req.params.id;
			const result = await usersService.deleteUserService(userId);
			return new HttpResponse(res).success(result);

		}catch (err){
			next(err);
		}
	}
}

export default new UserController();
