import prisma from './config/database.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function createAdminUser() {
	try {
		const adminEmail = 'admin@test.com';
		const adminPassword = 'Admin@123456';

		// Hash password using bcrypt
		const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

		// Check if admin exists
		const existingAdmin = await prisma.user.findUnique({
			where: { email: adminEmail },
		});

		if (existingAdmin) {
			console.log('Admin user already exists:', existingAdmin.email);
			console.log('Email: ' + existingAdmin.email);
			console.log('Password: ' + adminPassword);
			return;
		}

		// Create admin user
		const adminUser = await prisma.user.create({
			data: {
				email: adminEmail,
				passwordHash: passwordHash,
				role: 'ADMIN',
				fullName: 'Test Admin',
				isActive: true,
			},
		});

		console.log('✅ Admin user created successfully!');
		console.log('Email: ' + adminUser.email);
		console.log('Password: ' + adminPassword);
		console.log('Role: ' + adminUser.role);
	} catch (error) {
		console.error('❌ Error creating admin user:', error.message);
	} finally {
		await prisma.$disconnect();
	}
}

createAdminUser();
