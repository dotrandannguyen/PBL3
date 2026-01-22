import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg'; // Import driver native của Postgres
import dotenv from 'dotenv';

dotenv.config();

// 1. Tạo kết nối Pool (giống như mở đường ống nước)
const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
});

// 2. Gắn Adapter vào Pool (để Prisma hiểu được Postgres)
const adapter = new PrismaPg(pool);

// 3. Khởi tạo Prisma Client với Adapter
const prisma = new PrismaClient({
	adapter,
	// log: ['query', 'info', 'warn', 'error'] // Bật nếu muốn debug
});

// Hàm kiểm tra kết nối
export const connection = async () => {
	try {
		await prisma.$connect();
		console.log('Prisma 7 (Adapter Mode) Connected!');
	} catch (error) {
		console.error(' Error connecting to Database:', error);
		process.exit(1);
	}
};

export default prisma;
