import { io } from "socket.io-client";

// Khởi tạo Socket.io connection tới backend
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const joinedRooms = new Set(); // bộ nhớ các room đã join để tự động re-join khi reconnect

const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Lắng nghe sự kiện kết nối
socket.on("connect", () => {
  console.log("[SOCKET.IO] Connected to server:", socket.id);

  // Tự re-join các room đã đăng ký trước đó sau khi reconnect
  joinedRooms.forEach((roomId) => {
    socket.emit("join_user_room", roomId);
    console.log(`[SOCKET.IO] Re-joined room: ${roomId}`);
  });
});

socket.on("disconnect", () => {
  console.log("[SOCKET.IO] Disconnected from server");
});

socket.on("connect_error", (error) => {
  console.error("[SOCKET.IO] Connection error:", error);
});

// Export hàm để các component có thể sử dụng
export const socketService = {
  /**
   * Join vào một room mang tên User ID để nhận sự kiện riêng
   * @param {string} userId - ID của user hiện tại
   */
  joinUserRoom: (userId) => {
    if (!userId) {
      return;
    }

    if (joinedRooms.has(userId)) {
      console.log(`[SOCKET.IO] Already joined room: ${userId}`);
      return;
    }

    joinedRooms.add(userId);

    // Chỉ emit khi đã connected để tránh buffered duplicate emits.
    if (!socket.connected) {
      console.log(
        `[SOCKET.IO] Deferred join_user_room until connect: ${userId}`,
      );
      return;
    }

    socket.emit("join_user_room", userId);
    console.log(`[SOCKET.IO] Emitted join_user_room with userId: ${userId}`);
  },

  /**
   * Lắng nghe sự kiện NEW_INBOX_ITEM từ server
   * @param {function} callback - Hàm được gọi khi nhận sự kiện (nhận { message, task })
   */
  onNewInboxItem: (callback) => {
    socket.on("NEW_INBOX_ITEM", (data) => {
      console.log("[SOCKET.IO] Received NEW_INBOX_ITEM:", data);
      callback(data);
    });
  },

  /**
   * Bỏ lắng nghe sự kiện NEW_INBOX_ITEM
   */
  offNewInboxItem: () => {
    socket.off("NEW_INBOX_ITEM");
  },

  onEvent: (eventName, callback) => {
    socket.on(eventName, callback);
  },

  offEvent: (eventName, callback) => {
    socket.off(eventName, callback);
  },

  /**
   * Export raw socket instance nếu cần advanced usage
   */
  getSocket: () => socket,
};

export default socketService;
