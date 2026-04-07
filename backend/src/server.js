import app from './app.js';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { connection } from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
	try {
		await connection();

		// ✅ Tạo HTTP server từ Express app
		const server = http.createServer(app);

		// ✅ Khởi tạo Socket.io với CORS config
		const io = new Server(server, {
			cors: {
				origin: process.env.FRONTEND_URL || 'http://localhost:5173',
				methods: ['GET', 'POST'],
			},
		});

		// ✅ Socket.io event listeners
		io.on('connection', (socket) => {
			console.log(`🟢 Client connected: ${socket.id}`);

			// Cho phép client join vào một "room" mang tên chính User ID của họ
			socket.on('join_user_room', (userId) => {
				socket.join(userId);
				console.log(`👤 User ${userId} joined room`);
			});

			socket.on('disconnect', () => {
				console.log(`🔴 Client disconnected: ${socket.id}`);
			});
		});

		// ✅ Gắn io vào app để các Controller có thể lấy ra dùng
		app.set('socketio', io);

		// ✅ Server listen trên HTTP port
		server.listen(PORT, () => {
			console.log(`🚀 Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
};
startServer();
