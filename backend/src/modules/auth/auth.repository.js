import prisma from '../../config/database.js';

export const authRepository = {
	findUserByEmail: async (email) => {
		return await prisma.user.findUnique({
			// Prisma generate model là User (PascalCase)
			where: { email },
		});
	},

	createUser: async (data) => {
		return await prisma.user.create({
			data: {
				email: data.email,
				passwordHash: data.passwordHash,
				fullName: data.fullName,
				avatarUrl: data.avatarUrl,
				isActive: true,
			},
		});
	},
};
