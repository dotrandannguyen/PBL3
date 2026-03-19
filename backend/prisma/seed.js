import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// Setup Prisma with Postgres adapter (như trong config/database.js)
const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

async function main() {
	try {
		// Tạo admin user nếu chưa tồn tại
		const adminEmail = 'admin@test.com';
		const adminPassword = 'Admin@123456';

		const existingAdmin = await prisma.user.findUnique({
			where: { email: adminEmail },
		});

		if (!existingAdmin) {
			const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

			const admin = await prisma.user.create({
				data: {
					email: adminEmail,
					passwordHash: passwordHash,
					role: 'ADMIN',
					fullName: 'Test Admin',
					isActive: true,
				},
			});

			console.log('✅ Admin user created:', admin.email);
			console.log('   Email: admin@test.com');
			console.log('   Password: Admin@123456');
		} else {
			console.log('✅ Admin user already exists:', adminEmail);
		}

		// Tạo test user nếu cần
		const testUserEmail = 'user@test.com';
		const testUserPassword = 'User@123456';

		const existingUser = await prisma.user.findUnique({
			where: { email: testUserEmail },
		});

		if (!existingUser) {
			const passwordHash = await bcrypt.hash(testUserPassword, SALT_ROUNDS);

			const user = await prisma.user.create({
				data: {
					email: testUserEmail,
					passwordHash: passwordHash,
					role: 'USER',
					fullName: 'Test User',
					isActive: true,
				},
			});

			console.log('✅ Test user created:', user.email);
			console.log('   Email: user@test.com');
			console.log('   Password: User@123456');
		}
	} catch (error) {
		console.error('❌ Seed error:', error);
	} finally {
		await prisma.$disconnect();
	}
}

main();
