/**
 * Socket.io Gateway - Quản lý kết nối Socket realtime
 *
 * Nhiệm vụ:
 * - Lưu trữ instance Socket.io từ server.js
 * - Cung cấp hàm emit event tới user room
 * - Hỗ trợ broadcast notification realtime
 */

let ioInstance = null;

/**
 * Thiết lập Socket.io instance
 * Được gọi từ server.js khi khởi động
 *
 * @param {Server} io - Socket.io Server instance
 */
export const setIO = (io) => {
	if (!io) {
		console.warn(' [Socket.Gateway] Trying to set null io instance');
		return;
	}
	ioInstance = io;
	console.log(' [Socket.Gateway] IO instance set successfully');
};

/**
 * Lấy Socket.io instance
 * @returns {Server|null} Socket.io instance hoặc null nếu chưa khởi tạo
 */
export const getIO = () => {
	if (!ioInstance) {
		console.warn(' [Socket.Gateway] IO instance not initialized yet!');
		return null;
	}
	return ioInstance;
};

/**
 * Emit event tới user room (realtime notification)
 *
 * @param {string} userId - User ID (room name)
 * @param {string} eventName - Tên sự kiện
 * @param {Object} data - Dữ liệu event
 *
 * @example
 * emitToUser('user-123', 'TASK_EVENT_REMINDER', { message: 'Task sắp hết hạn' });
 */
export const emitToUser = (userId, eventName, data) => {
	const io = getIO();
	if (!io) {
		console.error(' [Socket.Gateway] Cannot emit: IO not initialized');
		return false;
	}

	try {
		io.to(userId).emit(eventName, data);
		console.log(
			` [Socket.Gateway] Emitted ${eventName} to user ${userId}`
		);
		return true;
	} catch (error) {
		console.error(
			` [Socket.Gateway] Error emitting event: ${error.message}`
		);
		return false;
	}
};

/**
 * Emit event tới user room nhưng bỏ qua socket cụ thể
 * Dùng để tránh duplicate event ở tab/client vừa gọi API
 *
 * @param {string} userId - User ID (room name)
 * @param {string} excludedSocketId - Socket ID cần loại trừ
 * @param {string} eventName - Tên sự kiện
 * @param {Object} data - Dữ liệu event
 */
export const emitToUserExceptSocket = (
	userId,
	excludedSocketId,
	eventName,
	data,
) => {
	const io = getIO();
	if (!io) {
		console.error(' [Socket.Gateway] Cannot emit: IO not initialized');
		return false;
	}

	if (!excludedSocketId) {
		return emitToUser(userId, eventName, data);
	}

	try {
		io.to(userId).except(excludedSocketId).emit(eventName, data);
		console.log(
			` [Socket.Gateway] Emitted ${eventName} to user ${userId} except socket ${excludedSocketId}`,
		);
		return true;
	} catch (error) {
		console.error(
			` [Socket.Gateway] Error emitting event with exclusion: ${error.message}`,
		);
		return false;
	}
};

/**
 * Emit event tới toàn bộ users (broadcast)
 *
 * @param {string} eventName - Tên sự kiện
 * @param {Object} data - Dữ liệu event
 *
 * @example
 * broadcastEvent('SYSTEM_MAINTENANCE', { message: 'Server sẽ bảo trì lúc 2AM' });
 */
export const broadcastEvent = (eventName, data) => {
	const io = getIO();
	if (!io) {
		console.error(' [Socket.Gateway] Cannot broadcast: IO not initialized');
		return false;
	}

	try {
		io.emit(eventName, data);
		console.log(` [Socket.Gateway] Broadcasted ${eventName} to all users`);
		return true;
	} catch (error) {
		console.error(
			` [Socket.Gateway] Error broadcasting event: ${error.message}`
		);
		return false;
	}
};
