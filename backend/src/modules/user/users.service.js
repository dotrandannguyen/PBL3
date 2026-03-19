import usersRepository from './users.repository.js';
import { ClientException, NotFoundException } from '../../common/exceptions/index.js';

class UserService {
	async getAllUserService() {
		const allUser = await usersRepository.getAllUserRepository();
		return allUser;
	}
	async deleteUserService(userId) {
		if (!userId) {
			throw new ClientException(400, 'User ID is required');
		}
		const user = await usersRepository.findUserByID(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return await usersRepository.deleteUserById(userId);
	}
}
export default new UserService();
