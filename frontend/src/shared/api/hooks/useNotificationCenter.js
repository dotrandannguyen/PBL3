/**
 * useNotificationCenter - Integrated hook kết hợp API + WebSocket
 *
 * Cung cấp một interface hoàn chỉnh để:
 * 1. Fetch notifications từ API
 * 2. Listen real-time updates từ WebSocket
 * 3. Tự động update local state
 * 4. Emit mark-as-read requests
 *
 * Usage:
 * const { notifications, unreadCount, fetchUnread, markAsRead } = useNotificationCenter();
 *
 * useEffect(() => {
 *   fetchUnread();
 * }, []);
 */

import { useCallback, useEffect, useRef } from "react";
import { useNotifications } from "./useNotifications";
import { useNotificationListener } from "./useNotificationListener";

export const useNotificationCenter = (options = {}) => {
  const { feed = "unread", pageSize = 20 } = options;

  const {
    notifications,
    unreadCount,
    pagination,
    loading,
    error,
    fetchUnreadCount,
    fetchUnreadNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  const syncTimerRef = useRef(null);
  const isSyncingRef = useRef(false);
  const pendingReadIdsRef = useRef(new Set());
  const pendingMarkAllRef = useRef(false);

  // DB là source of truth, socket chỉ dùng để trigger sync
  const syncFromServer = useCallback(async () => {
    if (isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    try {
      const syncListPromise =
        feed === "all"
          ? fetchNotifications({ page: 1, limit: pageSize })
          : fetchUnreadNotifications(1, pageSize);

      await Promise.all([syncListPromise, fetchUnreadCount({ silent: true })]);
    } finally {
      isSyncingRef.current = false;
    }
  }, [
    feed,
    pageSize,
    fetchNotifications,
    fetchUnreadNotifications,
    fetchUnreadCount,
  ]);

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) {
      return;
    }

    syncTimerRef.current = setTimeout(async () => {
      syncTimerRef.current = null;
      await syncFromServer();
    }, 250);
  }, [syncFromServer]);

  // Handlers for socket events
  const handleNewNotification = useCallback(
    (notification) => {
      console.log("[useNotificationCenter] New notification:", notification);

      // Socket chỉ trigger sync, DB mới là source of truth.
      scheduleSync();
    },
    [scheduleSync],
  );

  const handleNotificationRead = useCallback(
    (notificationId) => {
      console.log("[useNotificationCenter] Notification read:", notificationId);

      if (pendingReadIdsRef.current.has(notificationId)) {
        pendingReadIdsRef.current.delete(notificationId);
        return;
      }

      // Socket chỉ trigger sync, DB mới là source of truth.
      scheduleSync();
    },
    [scheduleSync],
  );

  const handleAllRead = useCallback(
    (count, newUnreadCount = 0) => {
      console.log(
        "[useNotificationCenter] All marked as read, count:",
        count,
        "remaining unread:",
        newUnreadCount,
      );

      if (pendingMarkAllRef.current) {
        pendingMarkAllRef.current = false;
        return;
      }

      // Socket chỉ trigger sync, DB mới là source of truth.
      scheduleSync();
    },
    [scheduleSync],
  );

  const markAsReadSafe = useCallback(
    async (notificationId) => {
      pendingReadIdsRef.current.add(notificationId);
      try {
        const result = await markAsRead(notificationId);
        await syncFromServer();
        return result;
      } catch (error) {
        pendingReadIdsRef.current.delete(notificationId);
        throw error;
      }
    },
    [markAsRead, syncFromServer],
  );

  const markAllAsReadSafe = useCallback(async () => {
    pendingMarkAllRef.current = true;
    try {
      const result = await markAllAsRead();
      await syncFromServer();
      return result;
    } catch (error) {
      pendingMarkAllRef.current = false;
      throw error;
    }
  }, [markAllAsRead, syncFromServer]);

  // Setup socket listeners
  const { isListening } = useNotificationListener(
    handleNewNotification,
    handleNotificationRead,
    handleAllRead,
  );

  // Fetch unread on component mount
  useEffect(() => {
    console.log(
      "[useNotificationCenter] Component mounted, syncing notifications",
    );
    syncFromServer();

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [syncFromServer]);

  return {
    // State
    notifications,
    unreadCount,
    pagination,
    loading,
    error,
    isListening,
    refreshNotifications: syncFromServer,

    // Actions
    fetchUnreadCount,
    fetchUnreadNotifications,
    fetchNotifications,
    markAsRead: markAsReadSafe,
    markAllAsRead: markAllAsReadSafe,
    deleteNotification,
    deleteAllNotifications,
  };
};
