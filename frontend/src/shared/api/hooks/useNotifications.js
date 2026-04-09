/**
 * useNotifications - Custom hook để fetch và manage notifications
 *
 * Features:
 * - Fetch unread notifications
 * - Mark notification as read
 * - Mark all as read
 * - Delete notification
 * - Real-time updates via WebSocket
 */

import { useState, useCallback } from "react";
import apiClient from "../apiClient";
import socketService from "../socket.service";

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

const unwrapApiData = (response) => response?.data?.data ?? null;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch unread notifications (tổng số)
  const fetchUnreadCount = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await apiClient.get("/notifications/count");
      const payload = unwrapApiData(response);
      setUnreadCount(payload?.unreadCount || 0);
    } catch (err) {
      console.error("[useNotifications] Error fetching unread count:", err);
      setError(err.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch danh sách unread notifications
  const fetchUnreadNotifications = useCallback(async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/notifications/unread", {
        params: { page, limit },
      });
      const payload = unwrapApiData(response) || {};
      setNotifications(Array.isArray(payload.data) ? payload.data : []);
      setPagination(payload.pagination || DEFAULT_PAGINATION);
      return payload;
    } catch (err) {
      console.error(
        "[useNotifications] Error fetching unread notifications:",
        err,
      );
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tất cả notifications (với filter)
  const fetchNotifications = useCallback(async (query = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/notifications", {
        params: query,
      });
      const payload = unwrapApiData(response) || {};
      setNotifications(Array.isArray(payload.data) ? payload.data : []);
      setPagination(payload.pagination || DEFAULT_PAGINATION);
      return payload;
    } catch (err) {
      console.error("[useNotifications] Error fetching notifications:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark 1 notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const socketId = socketService.getSocket()?.id || null;
        const response = await apiClient.patch(
          `/notifications/${notificationId}`,
          {
            socketId,
          },
        );
        // Cập nhật local state theo semantics "đã đọc"
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? {
                  ...n,
                  isRead: true,
                }
              : n,
          ),
        );

        // Decrement unread count tạm thời trước khi sync count thực
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await fetchUnreadCount({ silent: true });
        return unwrapApiData(response);
      } catch (err) {
        console.error("[useNotifications] Error marking as read:", err);
        throw err;
      }
    },
    [fetchUnreadCount],
  );

  // Mark tất cả as read
  const markAllAsRead = useCallback(async () => {
    try {
      const socketId = socketService.getSocket()?.id || null;
      const response = await apiClient.patch("/notifications/bulk/read", {
        socketId,
      });
      const payload = unwrapApiData(response) || {};
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(payload.newUnreadCount || 0);
      return payload;
    } catch (err) {
      console.error("[useNotifications] Error marking all as read:", err);
      throw err;
    }
  }, []);

  // Delete 1 notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      try {
        const response = await apiClient.delete(
          `/notifications/${notificationId}`,
        );
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        await fetchUnreadCount({ silent: true });
        return unwrapApiData(response);
      } catch (err) {
        console.error("[useNotifications] Error deleting notification:", err);
        throw err;
      }
    },
    [fetchUnreadCount],
  );

  // Delete tất cả notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await apiClient.delete("/notifications/all");
      setNotifications([]);
      await fetchUnreadCount({ silent: true });
      return unwrapApiData(response);
    } catch (err) {
      console.error(
        "[useNotifications] Error deleting all notifications:",
        err,
      );
      throw err;
    }
  }, [fetchUnreadCount]);

  return {
    // State
    notifications,
    unreadCount,
    pagination,
    loading,
    error,

    // Actions
    fetchUnreadCount,
    fetchUnreadNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,

    // Inline mutations
    setNotifications,
    setUnreadCount,
  };
};
