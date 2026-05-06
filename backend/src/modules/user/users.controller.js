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
	async getMe(req, res, next) {
		try {
			const userId = req.user?.id;
			const user = await usersService.getMe(userId);
			return new HttpResponse(res).success(user);
		} catch (error) {
			next(error);
		}
	}
	async updateMe(req, res, next) {
		try {
			const userId = req.user?.id;
			const updated = await usersService.updateMe(userId, req.body);
			return new HttpResponse(res).success(updated);
		} catch (error) {
			next(error);
		}
	}
	async deleteUser(req, res, next) {
		try {
			const userId = req.params.id;
			const result = await usersService.deleteUserService(userId);
			return new HttpResponse(res).success(result);
		} catch (err) {
			next(err);
		}
	}

	async getNotificationPreferences(req, res, next) {
		try {
			const userId = req.user?.id;
			const prefs = await usersService.getNotificationPreferences(userId);
			return new HttpResponse(res).success(prefs);
		} catch (error) {
			next(error);
		}
	}

	async updateNotificationPreferences(req, res, next) {
		try {
			const userId = req.user?.id;
			const prefs = await usersService.updateNotificationPreferences(userId, req.body);
			return new HttpResponse(res).success(prefs);
		} catch (error) {
			next(error);
		}
	}
}

export default new UserController();
