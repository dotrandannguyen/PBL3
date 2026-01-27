import prisma from '../../config/database.js';

export const authRepository = {
	findUserByEmail: async (email) => {
		return await prisma.user.findUnique({
			where: { email },
		});
	},

	findUserById: async (id) => {
		return await prisma.user.findUnique({
			where: { id },
		});
	},

	// Tạo user mới (Local Register)
	createUser: async (data) => {
		return await prisma.user.create({
			data: {
				// ID tự động sinh UUID do @default(uuid()) trong schema
				email: data.email,
				passwordHash: data.passwordHash,
				fullName: data.fullName,
				isActive: true,
				// Không tạo bản ghi trong bảng Accounts vì đây là Local Auth đơn giản
				// Password đã nằm trong User table theo thiết kế DBML
			},
		});
	},
};
