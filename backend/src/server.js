import app from './app.js';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { connection } from './config/database.js';
import { setIO } from './common/realtime/socket.gateway.js';
import './modules/notifications/notification.worker.js';
import {
	recoverPendingNotifications,
	processMissedNotifications,
	recoverPendingEventNotifications,
} from './modules/notifications/notification.recovery.js';

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
		app.set('socketio', io);

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
		server.listen(PORT, async () => {
			console.log(`Server is running on port ${PORT}`);

			// Startup Recovery: Re-queue notification jobs cho tasks có thời gian tương lai
			// Chạy SAU khi server đã listen (không block startup)
			try {
				console.log('[Startup] Running notification recovery...');
				await recoverPendingNotifications();
				await processMissedNotifications();
				await recoverPendingEventNotifications();
				console.log('[Startup] Notification recovery complete');
			} catch (recoveryError) {
				console.error(
					'[Startup] Notification recovery failed:',
					recoveryError.message,
				);
			}
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
};
startServer();
