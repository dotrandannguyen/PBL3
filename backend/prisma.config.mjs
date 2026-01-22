// prisma.config.mjs
import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Load file .env
dotenv.config();

export default defineConfig({
	// Chỉ định file schema nằm ở đâu
	schema: 'prisma/schema.prisma',
	// Chỉ định đường dẫn DB cho các lệnh Migration
	datasource: {
		url: process.env.DATABASE_URL,
	},
});
