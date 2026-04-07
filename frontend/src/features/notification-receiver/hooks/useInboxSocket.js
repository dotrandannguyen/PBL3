import { useEffect } from "react";
import socketService from "../../../shared/api/socket.service";

/**
 * Custom hook để lắng nghe real-time inbox notifications qua Socket.io
 *
 * Cách dùng:
 * const InboxComponent = ({ userId }) => {
 *   useInboxSocket(userId, (data) => {
 *     console.log('Item mới:', data.task);
 *     // Refresh danh sách inbox hoặc thêm item new vào UI
 *   });
 * };
 *
 * @param {string} userId - ID của user hiện tại (để join vào room đúng)
 * @param {function} onNewItem - Callback được gọi khi nhận sự kiện NEW_INBOX_ITEM
 *                               Nhận parameter: { message, task }
 */
export const useInboxSocket = (userId, onNewItem) => {
  useEffect(() => {
    if (!userId) {
      console.warn(
        "⚠️ [useInboxSocket] userId is empty, skipping socket setup",
      );
      return;
    }

    console.log(`🔌 [useInboxSocket] Setting up socket for userId: ${userId}`);

    // ✅ 1. Join vào room của user này
    socketService.joinUserRoom(userId);

    // ✅ 2. Lắng nghe sự kiện NEW_INBOX_ITEM
    socketService.onNewInboxItem((data) => {
      console.log("📢 [useInboxSocket] New inbox item received:", data);
      if (onNewItem && typeof onNewItem === "function") {
        onNewItem(data);
      }
    });

    // ✅ 3. Cleanup: Bỏ lắng nghe khi component unmount
    return () => {
      console.log("🧹 [useInboxSocket] Cleaning up socket listeners");
      socketService.offNewInboxItem();
    };
  }, [userId, onNewItem]);
};

export default useInboxSocket;
