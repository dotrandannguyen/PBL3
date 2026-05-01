/**
 * useNotificationListener - Custom hook để listen socket events từ server
 *
 * Features:
 * - Listen "NOTIFICATION_CREATED" event (v2)
 * - Listen "TASK_EVENT_REMINDER" event (legacy fallback)
 * - Listen "NOTIFICATION_READ" event
 * - Listen "NOTIFICATIONS_MARKED_ALL_READ" event
 * - Real-time update notifications list
 */

import { useEffect, useRef } from "react";
import socketService from "../socket.service";

const DEDUP_TTL_MS = 2 * 60 * 1000;

const buildFallbackId = (data = {}) =>
  [
    data?.id,
    data?.source,
    data?.sourceId,
    data?.taskId,
    data?.type,
    data?.phase,
    data?.offset,
    data?.createdAt,
  ]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(":");

const normalizeIncomingNotification = (data = {}) => {
  const normalizedId = data?.id || buildFallbackId(data);

  return {
    id: normalizedId,
    taskId: data?.taskId || null,
    source: data?.source || (data?.taskId ? "TASK" : null),
    sourceId: data?.sourceId || data?.taskId || null,
    type: data?.type || "SYSTEM_ALERT",
    title: data?.title || data?.taskTitle || data?.message || "Thông báo",
    content: data?.content || data?.message || "",
    isRead: false,
    phase: data?.phase || null,
    offset: data?.offset ?? null,
    dueDate: data?.dueDate || null,
    sentAt: data?.createdAt || new Date().toISOString(),
    createdAt: data?.createdAt || new Date().toISOString(),
  };
};

export const useNotificationListener = (
  onNewNotification,
  onNotificationRead,
  onAllRead,
) => {
  const onNewNotificationRef = useRef(onNewNotification);
  const onNotificationReadRef = useRef(onNotificationRead);
  const onAllReadRef = useRef(onAllRead);
  const seenNotificationRef = useRef(new Map());
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

    const isDuplicate = (notificationId) => {
      if (!notificationId) {
        return false;
      }

      const now = Date.now();
      for (const [id, ts] of seenNotificationRef.current.entries()) {
        if (now - ts > DEDUP_TTL_MS) {
          seenNotificationRef.current.delete(id);
        }
      }

      if (seenNotificationRef.current.has(notificationId)) {
        return true;
      }

      seenNotificationRef.current.set(notificationId, now);
      return false;
    };

    const emitNewNotification = (rawData, sourceEventName) => {
      const notification = normalizeIncomingNotification(rawData);

      if (isDuplicate(notification.id)) {
        console.log(
          `[useNotificationListener] Skip duplicate notification from ${sourceEventName}:`,
          notification.id,
        );
        return;
      }

      if (onNewNotificationRef.current) {
        onNewNotificationRef.current(notification);
      }
    };

    const handleNotificationCreated = (data) => {
      console.log(
        "[useNotificationListener] Received NOTIFICATION_CREATED:",
        data,
      );

      emitNewNotification(data, "NOTIFICATION_CREATED");
    };

    const handleTaskEventReminder = (data) => {
      console.log(
        "[useNotificationListener] Received TASK_EVENT_REMINDER:",
        data,
      );

      emitNewNotification(data, "TASK_EVENT_REMINDER");
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

    socket.on("NOTIFICATION_CREATED", handleNotificationCreated);
    socket.on("TASK_EVENT_REMINDER", handleTaskEventReminder);
    socket.on("NOTIFICATION_READ", handleNotificationRead);
    socket.on("NOTIFICATIONS_MARKED_ALL_READ", handleAllMarkedRead);

    return () => {
      socket.off("NOTIFICATION_CREATED", handleNotificationCreated);
      socket.off("TASK_EVENT_REMINDER", handleTaskEventReminder);
      socket.off("NOTIFICATION_READ", handleNotificationRead);
      socket.off("NOTIFICATIONS_MARKED_ALL_READ", handleAllMarkedRead);
      console.log("[useNotificationListener] Cleaned up listeners");
    };
  }, [socket]);

  return { isListening: Boolean(socket?.connected) };
};
