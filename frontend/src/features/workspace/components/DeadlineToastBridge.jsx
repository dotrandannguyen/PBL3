import React, { useCallback, useEffect, useRef } from "react";
import { AlertTriangle, BellRing, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useAuth from "../../auth/hooks/useAuth";
import socketService from "../../../shared/api/socket.service";
import { useNotificationListener } from "../../../shared/api/hooks";

const TOAST_CACHE_MS = 10 * 60 * 1000;

const formatDeadlineHint = (dueDate) => {
  if (!dueDate) {
    return null;
  }

  const parsedDate = new Date(dueDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const now = Date.now();
  const diffMinutes = Math.round((parsedDate.getTime() - now) / (60 * 1000));

  if (diffMinutes < 0) {
    const overdueMinutes = Math.abs(diffMinutes);
    if (overdueMinutes < 60) {
      return `Quá hạn ${overdueMinutes} phút`;
    }

    const overdueHours = Math.round(overdueMinutes / 60);
    return `Quá hạn ${overdueHours} giờ`;
  }

  if (diffMinutes === 0) {
    return "Đến hạn ngay bây giờ";
  }

  if (diffMinutes < 60) {
    return `Đến hạn sau ${diffMinutes} phút`;
  }

  const hours = Math.round(diffMinutes / 60);
  return `Đến hạn sau ${hours} giờ`;
};

const formatEventTime = (createdAt) => {
  if (!createdAt) {
    return "Vừa xong";
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Vừa xong";
  }

  return parsedDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveTone = (notification = {}) => {
  const normalizedPhase = `${notification.phase || ""}`.toUpperCase();
  const normalizedMessage = `${notification.content || ""}`.toLowerCase();

  if (
    normalizedPhase === "OVERDUE" ||
    normalizedMessage.includes("quá hạn")
  ) {
    return {
      label: "Khẩn",
      duration: 12000,
      cardClass:
        "border-red-400/45 bg-gradient-to-br from-red-500/20 via-red-500/10 to-bg-sidebar",
      badgeClass: "border-red-300/50 bg-red-500/25 text-red-100",
      iconClass: "text-red-300",
      Icon: AlertTriangle,
    };
  }

  if (normalizedPhase === "ON_TIME" || normalizedMessage.includes("bắt đầu")) {
    return {
      label: "Cảnh báo",
      duration: 10000,
      cardClass:
        "border-amber-300/45 bg-gradient-to-br from-amber-400/18 via-amber-400/8 to-bg-sidebar",
      badgeClass: "border-amber-200/45 bg-amber-400/20 text-amber-100",
      iconClass: "text-amber-200",
      Icon: BellRing,
    };
  }

  return {
    label: "Nhắc việc",
    duration: 9000,
    cardClass:
      "border-sky-300/35 bg-gradient-to-br from-sky-500/14 via-sky-500/6 to-bg-sidebar",
    badgeClass: "border-sky-200/40 bg-sky-500/18 text-sky-100",
    iconClass: "text-sky-200",
    Icon: Clock3,
  };
};

const buildDedupKey = (notification = {}) => {
  if (notification.id) {
    return notification.id;
  }

  return [
    notification.taskId,
    notification.phase,
    notification.offset,
    notification.createdAt,
  ]
    .filter(Boolean)
    .join(":");
};

const DeadlineToastBridge = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const seenToastRef = useRef(new Map());

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    socketService.joinUserRoom(user.id);
  }, [user?.id]);

  const handleViewTask = useCallback(
    (notification) => {
      const query = new URLSearchParams();
      const keyword = notification?.title || "";

      if (keyword) {
        query.set("q", keyword);
      }

      const queryString = query.toString();
      navigate(queryString ? `/app?${queryString}` : "/app");
    },
    [navigate],
  );

  const handleIncomingReminder = useCallback(
    (notification) => {
      if (!notification || !user?.id) {
        return;
      }

      const dedupKey = buildDedupKey(notification);
      if (!dedupKey) {
        return;
      }

      const now = Date.now();
      for (const [cachedKey, cachedAt] of seenToastRef.current.entries()) {
        if (now - cachedAt > TOAST_CACHE_MS) {
          seenToastRef.current.delete(cachedKey);
        }
      }

      if (seenToastRef.current.has(dedupKey)) {
        return;
      }

      seenToastRef.current.set(dedupKey, now);

      const tone = resolveTone(notification);
      const hint = formatDeadlineHint(notification.dueDate);
      const createdTime = formatEventTime(notification.createdAt);
      const title = notification.title || "Task reminder";
      const message = notification.content || "Bạn có việc cần chú ý";

      toast.custom(
        (toastId) => (
          <div
            className={`pointer-events-auto w-[min(92vw,24rem)] rounded-2xl border p-3 shadow-2xl backdrop-blur ${tone.cardClass}`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.badgeClass}`}
                >
                  {tone.label}
                </span>
                <span className="text-[11px] text-text-tertiary">{createdTime}</span>
              </div>
              <tone.Icon size={16} className={tone.iconClass} />
            </div>

            <p className="line-clamp-1 text-sm font-semibold text-text-primary">{title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{message}</p>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] text-text-tertiary">
                {hint || "Deadline sắp tới"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-md border border-border-subtle px-2 py-1 text-[11px] text-text-secondary hover:bg-white/5"
                  onClick={() => toast.dismiss(toastId)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="rounded-md bg-accent-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-accent-hover"
                  onClick={() => {
                    toast.dismiss(toastId);
                    handleViewTask(notification);
                  }}
                >
                  View Task
                </button>
              </div>
            </div>
          </div>
        ),
        {
          id: `deadline-toast-${dedupKey}`,
          duration: tone.duration,
          position: "bottom-right",
        },
      );
    },
    [handleViewTask, user?.id],
  );

  useNotificationListener(handleIncomingReminder);

  return null;
};

export default DeadlineToastBridge;
