/**
 * Socket.IO Hook - Tránh duplicate 'join_user_room' event
 *
 * Vấn đề: useEffect chạy 2 lần trong React StrictMode
 * → Emit 'join_user_room' 2 lần
 *
 * Giải pháp: Dùng ref để track xem đã emit chưa
 */

import { useEffect, useRef } from "react";
import { useSocket } from "./useSocket"; // Your socket hook

export const useJoinUserRoom = (userId) => {
  const { socket } = useSocket();
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!socket || !userId) {
      console.log("[Client] useJoinUserRoom: socket or userId missing");
      return;
    }

    // Guard: Chỉ emit một lần
    if (hasJoinedRef.current) {
      console.log("[Client] useJoinUserRoom: Already joined, skip");
      return;
    }

    console.log(
      "[Client] useJoinUserRoom: Emitting join_user_room for",
      userId,
    );
    socket.emit("join_user_room", userId);
    hasJoinedRef.current = true;

    // Cleanup: Reset flag khi component unmount hoặc socket disconnect
    const handleDisconnect = () => {
      console.log("[Client] Socket disconnected, reset join flag");
      hasJoinedRef.current = false;
    };

    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, userId]); // Dependency array: chỉ gọi khi socket hoặc userId thay đổi
};

/**
 * Sử dụng trong component:
 *
 * function Dashboard() {
 *   const { user } = useAuth();
 *   useJoinUserRoom(user?.id);
 *
 *   return <div>Dashboard</div>;
 * }
 */

// ============================================

/**
 * Alternative: Dùng Set để track rooms đã join
 * Nếu muốn support multiple rooms
 */

export const useJoinRooms = () => {
  const { socket } = useSocket();
  const joinedRoomsRef = useRef(new Set());

  const joinRoom = (roomId) => {
    if (!socket || !roomId) return;

    // Guard: Chỉ join nếu chưa join
    if (joinedRoomsRef.current.has(roomId)) {
      console.log(`[Client] Already in room ${roomId}`);
      return;
    }

    console.log(`[Client] Joining room ${roomId}`);
    socket.emit("join_user_room", roomId);
    joinedRoomsRef.current.add(roomId);
  };

  const leaveRoom = (roomId) => {
    if (!socket || !roomId) return;

    if (!joinedRoomsRef.current.has(roomId)) {
      console.log(`[Client] Not in room ${roomId}`);
      return;
    }

    console.log(`[Client] Leaving room ${roomId}`);
    socket.emit("leave_user_room", roomId);
    joinedRoomsRef.current.delete(roomId);
  };

  // Reset rooms khi disconnect
  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      console.log("[Client] Socket disconnected, clearing all joined rooms");
      joinedRoomsRef.current.clear();
    };

    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  return { joinRoom, leaveRoom };
};

// ============================================

/**
 * API Debounce Hook - Tránh duplicate API calls
 */

import { useCallback, useRef } from "react";

export const useDebouncedCallback = (callback, delay = 300) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback(
    (...args) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Sử dụng:
 *
 * function TaskEditor({ taskId }) {
 *   const debouncedUpdate = useDebouncedCallback((data) => {
 *     api.patch(`/tasks/${taskId}`, data);
 *   }, 500);
 *
 *   const handleChange = (e) => {
 *     const newData = { [e.target.name]: e.target.value };
 *     debouncedUpdate(newData);
 *   };
 *
 *   return <input onChange={handleChange} />;
 * }
 */
