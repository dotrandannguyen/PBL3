import prisma from '../../config/database.js';
class UserRepository {
	async getAllUserRepository() {
		return prisma.user.findMany({});
	}
	async getUserProfileById(userId) {
		return prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				fullName: true,
				avatarUrl: true,
				bio: true,
				theme: true,
				language: true,
				timeFormat: true,
				timezone: true,
				role: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
				accounts: {
					select: {
						provider: true,
						type: true,
					},
				},
			},
		});
	}
	async findUserByID(userId) {
		return await prisma.user.findUnique({
			where: { id: userId },
		});
	}
	async updateUserProfile(userId, data) {
		return prisma.user.update({
			where: { id: userId },
			data,
			select: {
				id: true,
				email: true,
				fullName: true,
				avatarUrl: true,
				bio: true,
				theme: true,
				language: true,
				timeFormat: true,
				timezone: true,
				role: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
				accounts: {
					select: {
						provider: true,
						type: true,
					},
				},
			},
		});
	}
	async deleteUserById(userId) {
		return await prisma.user.delete({
			where: { id: userId },
		});
	}

	async getNotificationPreferences(userId) {
		return prisma.notificationPreference.upsert({
			where: { userId },
			update: {},
			create: { userId },
		});
	}

	async updateNotificationPreferences(userId, data) {
		return prisma.notificationPreference.upsert({
			where: { userId },
			update: data,
			create: { userId, ...data },
		});
	}
}

export default new UserRepository();
