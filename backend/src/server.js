import app from './app.js';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { connection } from './config/database.js';
import { setIO } from './common/realtime/socket.gateway.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
	try {
		await connection();

		// Tạo HTTP server từ Express app
		const server = http.createServer(app);

		// Khởi tạo Socket.io với CORS config
		const io = new Server(server, {
			cors: {
				origin: process.env.FRONTEND_URL || 'http://localhost:5173',
				methods: ['GET', 'POST'],
			},
		});

		// Khởi tạo Socket Gateway để BullMQ Worker có thể gửi event
		setIO(io);

		// Socket.io event listeners
		io.on('connection', (socket) => {
			console.log(`Client connected: ${socket.id}`);

			// Cho phép client join vào một "room" mang tên chính User ID của họ
			socket.on('join_user_room', (userId) => {
				if (!userId || typeof userId !== 'string') {
					console.warn(`Invalid join_user_room payload from ${socket.id}`);
					return;
				}

				if (socket.rooms.has(userId)) {
					console.log(`Socket ${socket.id} already in room ${userId}`);
					return;
				}

				socket.join(userId);
				console.log(`User ${userId} joined room`);
			});

			socket.on('disconnect', () => {
				console.log(`Client disconnected: ${socket.id}`);
			});
		});

		// Server listen trên HTTP port
		server.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
};
startServer();
