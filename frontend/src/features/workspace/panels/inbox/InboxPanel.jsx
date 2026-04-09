import React, { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle,
  Clock3,
  ExternalLink,
  Eye,
  Github,
  Inbox,
  Mail,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIntegrations } from "../../../notification-receiver/hooks/useIntegrations";
import { ItemDetailModal } from "../../../notification-receiver/components";
import useInboxSocket from "../../../notification-receiver/hooks/useInboxSocket";
import useAuth from "../../../auth/hooks/useAuth";
import { confirmInboxTask } from "../../../tasks/api/task.api";
import { useNotificationCenter } from "../../../../shared/api/hooks";
import { toast } from "sonner";

const formatTimeAgo = (dateStr) => {
  if (!dateStr) {
    return "Vừa xong";
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "Vừa xong";
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

  return date.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) {
    return "";
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDeadlineHint = (dueDate) => {
  if (!dueDate) {
    return "Không có hạn chót";
  }

  const parsedDate = new Date(dueDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Hạn chót không hợp lệ";
  }

  const diffMinutes = Math.round((parsedDate.getTime() - Date.now()) / (60 * 1000));

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

const resolveNotificationTone = (notification = {}) => {
  const normalizedPhase = `${notification.phase || ""}`.toUpperCase();
  const normalizedContent = `${notification.content || ""}`.toLowerCase();

  if (
    normalizedPhase === "OVERDUE" ||
    normalizedContent.includes("quá hạn")
  ) {
    return {
      label: "Khẩn",
      icon: AlertTriangle,
      badgeClass: "border-red-400/40 bg-red-500/20 text-red-200",
      iconClass: "text-red-300",
    };
  }

  if (
    normalizedPhase === "ON_TIME" ||
    normalizedContent.includes("bắt đầu")
  ) {
    return {
      label: "Cảnh báo",
      icon: BellRing,
      badgeClass: "border-amber-300/40 bg-amber-400/18 text-amber-200",
      iconClass: "text-amber-200",
    };
  }

  return {
    label: "Nhắc việc",
    icon: Clock3,
    badgeClass: "border-sky-300/35 bg-sky-400/14 text-sky-100",
    iconClass: "text-sky-200",
  };
};

const InboxPanel = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [panelTab, setPanelTab] = useState("notifications");
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [integrationFilter, setIntegrationFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const {
    notifications,
    unreadCount,
    loading: notificationLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotificationCenter({ feed: "all", pageSize: 50 });

  const {
    data,
    setData,
    loading: integrationLoading,
    refetch,
    connected,
  } = useIntegrations();

  const activeLoading =
    panelTab === "notifications" ? notificationLoading : integrationLoading;

  const notificationCounts = useMemo(() => {
    const unread = notifications.filter((item) => !item.isRead).length;
    const read = notifications.filter((item) => item.isRead).length;

    return {
      all: notifications.length,
      unread,
      read,
    };
  }, [notifications]);

  const notificationItems = useMemo(() => {
    const sorted = [...notifications].sort((left, right) => {
      const leftTime = new Date(left.createdAt || left.sentAt || 0).getTime();
      const rightTime = new Date(right.createdAt || right.sentAt || 0).getTime();
      return rightTime - leftTime;
    });

    if (notificationFilter === "unread") {
      return sorted.filter((item) => !item.isRead);
    }

    if (notificationFilter === "read") {
      return sorted.filter((item) => item.isRead);
    }

    return sorted;
  }, [notifications, notificationFilter]);

  const filteredData = useMemo(
    () =>
      data.filter((item) => {
        if (integrationFilter === "all") return true;
        return item.source === integrationFilter;
      }),
    [data, integrationFilter],
  );

  const handleStatusChange = useCallback(
    (taskId, newStatus) => {
      if (setData) {
        setData((prevData) =>
          prevData.map((item) =>
            item.id === taskId
              ? { ...item, status: newStatus, isConverted: true }
              : item,
          ),
        );
      }

      if (selectedItem && selectedItem.id === taskId) {
        setSelectedItem({
          ...selectedItem,
          status: newStatus,
          isConverted: true,
        });
      }
    },
    [selectedItem, setData],
  );

  const handleConfirm = async (event, item) => {
    event.stopPropagation();

    try {
      await confirmInboxTask(item.id);
      handleStatusChange(item.id, "PENDING");
      toast.success("✓ Đã đưa vào danh sách công việc!", {
        position: "bottom-right",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Lỗi khi chuyển thành Task");
      console.error(error);
    }
  };

  const markAsReadQuiet = useCallback(
    async (notificationId) => {
      if (!notificationId) {
        return;
      }

      try {
        await markAsRead(notificationId);
      } catch (error) {
        console.error("[InboxPanel] Mark as read failed:", error);
      }
    },
    [markAsRead],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount <= 0) {
      return;
    }

    try {
      const result = await markAllAsRead();
      toast.success(`Đã đánh dấu ${result?.count || 0} thông báo là đã đọc`, {
        position: "bottom-right",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Không thể đánh dấu tất cả thông báo là đã đọc");
      console.error("[InboxPanel] Mark all read failed:", error);
    }
  }, [markAllAsRead, unreadCount]);

  const handleViewTask = useCallback(
    (notification) => {
      if (!notification) {
        return;
      }

      if (!notification.isRead && notification.id) {
        markAsReadQuiet(notification.id);
      }

      const keyword =
        notification.task?.title || notification.title || notification.content || "";
      const query = new URLSearchParams();

      if (keyword) {
        query.set("q", keyword);
      }

      const queryString = query.toString();
      navigate(queryString ? `/app?${queryString}` : "/app");
      onClose();
    },
    [markAsReadQuiet, navigate, onClose],
  );

  const handleRefresh = useCallback(() => {
    if (panelTab === "notifications") {
      refreshNotifications();
      return;
    }

    refetch();
  }, [panelTab, refreshNotifications, refetch]);

  const handleNewInboxItem = useCallback(
    (newItemData) => {
      refetch();
      toast.success(newItemData.message || "Bạn có tin nhắn mới! 📬", {
        position: "bottom-right",
        duration: 4000,
        description: newItemData.task?.title || "Inbox updated with new item",
      });
    },
    [refetch],
  );

  useInboxSocket(user?.id, handleNewInboxItem);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-y-0 left-0 md:left-60 right-0 bg-black/60 z-30"
          onClick={onClose}
        />
      )}

      {/* Notification Center Panel */}
      <div
        className={`fixed top-0 left-0 md:left-60 h-screen w-full md:w-[28rem] bg-bg-sidebar border-l border-border-subtle flex flex-col z-40 transition-transform duration-300 overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Inbox size={16} />
            Notification Center
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-accent-primary/30 bg-accent-primary/20 px-1.5 py-0.5 text-[10px] text-blue-200">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={activeLoading}
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw
                size={14}
                className={activeLoading ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        <div className="border-b border-border-subtle px-4 py-2 shrink-0">
          <div className="inline-flex rounded-lg border border-border-subtle bg-white/4 p-1">
            {[
              {
                id: "notifications",
                label: "Thông báo",
              },
              {
                id: "integrations",
                label: "Tích hợp",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  panelTab === tab.id
                    ? "bg-white/10 text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
                onClick={() => setPanelTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {panelTab === "notifications" ? (
          <>
            <div className="border-b border-border-subtle px-4 py-2 shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[
                  {
                    id: "all",
                    label: `Tất cả ${notificationCounts.all}`,
                  },
                  {
                    id: "unread",
                    label: `Chưa đọc ${notificationCounts.unread}`,
                  },
                  {
                    id: "read",
                    label: `Đã đọc ${notificationCounts.read}`,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      notificationFilter === item.id
                        ? "border-accent-primary/50 bg-accent-primary/20 text-blue-200"
                        : "border-border-subtle text-text-tertiary hover:text-text-secondary hover:bg-white/5"
                    }`}
                    onClick={() => setNotificationFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={unreadCount <= 0 || notificationLoading}
                onClick={handleMarkAllRead}
                className="rounded-md border border-border-subtle px-2 py-1 text-[11px] text-text-secondary transition-colors hover:bg-white/5 disabled:opacity-40"
                title="Đánh dấu tất cả là đã đọc"
              >
                Đọc hết
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {notificationLoading && notifications.length === 0 ? (
                <div className="flex justify-center py-10 opacity-60">
                  <RefreshCw
                    size={24}
                    className="animate-spin text-text-tertiary"
                  />
                </div>
              ) : notificationItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-tertiary opacity-70">
                  <Inbox size={32} className="mb-2" />
                  <p className="text-sm">Chưa có thông báo phù hợp</p>
                </div>
              ) : (
                notificationItems.map((notification) => {
                  const tone = resolveNotificationTone(notification);
                  const ToneIcon = tone.icon;
                  const createdAt = notification.createdAt || notification.sentAt;
                  const title =
                    notification.task?.title || notification.title || "Thông báo";
                  const content = notification.content || "Không có nội dung";
                  const deadlineHint = formatDeadlineHint(
                    notification.dueDate || notification.task?.dueDate,
                  );

                  return (
                    <article
                      key={notification.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        notification.isRead
                          ? "border-border-subtle bg-white/2"
                          : "border-accent-primary/40 bg-accent-primary/10"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ToneIcon size={14} className={tone.iconClass} />
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.badgeClass}`}
                          >
                            {tone.label}
                          </span>
                          {!notification.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
                          )}
                        </div>
                        <time
                          title={formatDateTime(createdAt)}
                          className="text-[11px] text-text-tertiary"
                        >
                          {formatTimeAgo(createdAt)}
                        </time>
                      </div>

                      <p className="line-clamp-1 text-sm font-semibold text-text-primary">
                        {title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                        {content}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                          <Clock3 size={11} />
                          {deadlineHint}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {!notification.isRead && (
                            <button
                              type="button"
                              onClick={() => markAsReadQuiet(notification.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[11px] text-text-secondary hover:bg-white/5"
                            >
                              <Check size={11} />
                              Đã đọc
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleViewTask(notification)}
                            className="inline-flex items-center gap-1 rounded-md bg-accent-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-accent-hover"
                          >
                            <ExternalLink size={11} />
                            View Task
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex border-b border-border-subtle px-4 shrink-0">
              {[
                { id: "all", label: "Tất cả" },
                { id: "gmail", label: "Gmail", icon: Mail },
                { id: "github", label: "GitHub", icon: Github },
              ].map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                    integrationFilter === item.id
                      ? "border-accent-primary text-text-primary"
                      : "border-transparent text-text-tertiary hover:text-text-secondary"
                  }`}
                  onClick={() => setIntegrationFilter(item.id)}
                >
                  {item.icon && <item.icon size={12} />}
                  {item.label}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {integrationLoading && data.length === 0 ? (
                <div className="flex justify-center py-10 opacity-50">
                  <RefreshCw
                    size={24}
                    className="animate-spin text-text-tertiary"
                  />
                </div>
              ) : !connected.gmail && !connected.github ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-tertiary opacity-70">
                  <Inbox size={32} className="mb-2" />
                  <p className="text-sm">
                    Hãy kết nối Gmail hoặc GitHub để xem tin nhắn
                  </p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-tertiary opacity-70">
                  <Inbox size={32} className="mb-2" />
                  <p className="text-sm">Trống</p>
                </div>
              ) : (
                filteredData.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        window.open(item.link, "_blank", "noopener,noreferrer")
                      }
                      className="border-b border-border-subtle px-4 py-3 hover:bg-white/3 transition-colors cursor-pointer bg-white/5"
                    >
                      <div className="flex gap-3">
                        <div className="shrink-0 mt-0.5">
                          <Icon size={16} className={item.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-text-primary truncate">
                              {item.sender}
                            </span>
                            <span className="text-xs text-text-tertiary shrink-0 whitespace-nowrap">
                              {formatTimeAgo(item.time)}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary mb-1 truncate">
                            {item.subject}
                          </div>
                          <div className="text-xs text-text-tertiary line-clamp-2">
                            {item.preview}
                          </div>

                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-text-tertiary hover:text-text-primary hover:bg-white/10 transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye size={12} /> Chi tiết
                            </button>

                            {item.isConverted ? (
                              <div className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-green-500 bg-green-500/10">
                                <CheckCircle size={12} /> Đã thêm
                              </div>
                            ) : (
                              <button
                                onClick={(event) => handleConfirm(event, item)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium bg-accent-primary text-white hover:bg-opacity-90 transition-colors"
                                title="Thêm vào Task"
                              >
                                <Plus size={12} /> Thêm vào Task
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
};

export default InboxPanel;
