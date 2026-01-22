import usersRepository from './users.repository.js';

class UserService {
	async getAllUserService() {
		const allUser = await usersRepository.getAllUserRepository();
		return allUser;
	}
}

export default new UserService();
