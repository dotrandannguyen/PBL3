import prisma from '../../config/database.js';
class UserRepository {
	async getAllUserRepository() {
		return prisma.users.findMany({});
	}
}

export default new UserRepository();
