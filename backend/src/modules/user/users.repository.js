import prisma from '../../config/database.js';
class UserRepository {
	async getAllUserRepository() {
		return prisma.user.findMany({
			
		});
	}
	async findUserByID(userId) {
		return await prisma.user.findUnique({
			where: { id: userId },
		});
	}
	async deleteUserById(userId) {
		return await prisma.user.delete({
			where: { id: userId },
		});
	}
}

export default new UserRepository();
