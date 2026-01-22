import prisma from '../../config/database.js';

class AuthRepository {
	async findUserByEmail(email) {
		return await prisma.users.findUnique({
			where: {
				email,
			},
			include: {
				account: true,
			},
		});
	}

	async createUser(data) {
		try {
			return await prisma.$transaction(async (tx) => {
				const user = await tx.users.create({
					data: {
						email: data.email,
						name: data.name,
					},
				});

				const account = await tx.accounts.create({
					data: {
						userId: user.id,
						password: data.password,
					},
				});

				console.log(account);
				return user;
			});
		} catch (err) {
			// Handle the rollback...
		}
	}
}

export default new AuthRepository();
