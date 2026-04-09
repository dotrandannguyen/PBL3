/**
 * useNotificationListener - Custom hook để listen socket events từ server
 *
 * Features:
 * - Listen "TASK_EVENT_REMINDER" event
 * - Listen "NOTIFICATION_READ" event
 * - Listen "NOTIFICATIONS_MARKED_ALL_READ" event
 * - Real-time update notifications list
 * - Auto-increment/decrement unread count
 */

import { useEffect, useRef } from "react";
import socketService from "../socket.service";

export const useNotificationListener = (
  onNewNotification,
  onNotificationRead,
  onAllRead,
) => {
  const onNewNotificationRef = useRef(onNewNotification);
  const onNotificationReadRef = useRef(onNotificationRead);
  const onAllReadRef = useRef(onAllRead);
  const socket = socketService.getSocket();

  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    onNotificationReadRef.current = onNotificationRead;
  }, [onNotificationRead]);

  useEffect(() => {
    onAllReadRef.current = onAllRead;
  }, [onAllRead]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    console.log("[useNotificationListener] Setting up listeners");

    const handleTaskEventReminder = (data) => {
      console.log(
        "[useNotificationListener] Received TASK_EVENT_REMINDER:",
        data,
      );

      const generatedId = [
        data?.taskId,
        data?.phase,
        data?.offset,
        data?.createdAt,
      ]
        .filter(Boolean)
        .join(":");

      const notification = {
        id: data?.id || generatedId,
        taskId: data?.taskId || null,
        type: data?.type || "SYSTEM_ALERT",
        title: data?.taskTitle || data?.title || data?.message || "Thông báo",
        content: data?.message || "",
        isRead: false,
        phase: data?.phase || null,
        offset: data?.offset ?? null,
        dueDate: data?.dueDate || null,
        sentAt: data?.createdAt || new Date().toISOString(),
        createdAt: data?.createdAt || new Date().toISOString(),
      };

      if (onNewNotificationRef.current) {
        onNewNotificationRef.current(notification);
      }
    };

    const handleNotificationRead = (data) => {
      console.log(
        "[useNotificationListener] Received NOTIFICATION_READ:",
        data,
      );

      if (onNotificationReadRef.current && data?.notificationId) {
        onNotificationReadRef.current(data.notificationId);
      }
    };

    const handleAllMarkedRead = (data) => {
      console.log(
        "[useNotificationListener] Received NOTIFICATIONS_MARKED_ALL_READ:",
        data,
      );

      if (onAllReadRef.current) {
        onAllReadRef.current(data?.count || 0, data?.newUnreadCount ?? 0);
      }
    };

    socket.on("TASK_EVENT_REMINDER", handleTaskEventReminder);
    socket.on("NOTIFICATION_READ", handleNotificationRead);
    socket.on("NOTIFICATIONS_MARKED_ALL_READ", handleAllMarkedRead);

    return () => {
      socket.off("TASK_EVENT_REMINDER", handleTaskEventReminder);
      socket.off("NOTIFICATION_READ", handleNotificationRead);
      socket.off("NOTIFICATIONS_MARKED_ALL_READ", handleAllMarkedRead);
      console.log("[useNotificationListener] Cleaned up listeners");
    };
  }, [socket]);

  return { isListening: Boolean(socket?.connected) };
};
