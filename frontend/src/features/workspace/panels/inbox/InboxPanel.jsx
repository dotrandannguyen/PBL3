import React, { useState } from "react";
import {
  Inbox,
  Filter,
  Check,
  MoreHorizontal,
  RefreshCw,
  Mail,
  Github,
} from "lucide-react";
import { useIntegrations } from "../../../notification-receiver/hooks/useIntegrations";

const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

  return date.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
};

const InboxPanel = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState("all");
  const { data, loading, refetch } = useIntegrations();

  const filteredData = data.filter((item) => {
    if (filter === "all") return true;
    return item.source === filter; // We'll map 'all', 'gmail', 'github'
  });

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-y-0 left-60 right-0 bg-black/50 z-30"
          onClick={onClose}
        />
      )}

      {/* Inbox Panel */}
      <div
        className={`fixed top-0 left-60 h-screen w-80 bg-bg-sidebar border-l border-border-subtle flex flex-col z-40 transition-transform duration-300 overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Inbox size={16} />
            Hộp thư
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors"
              title="Bộ lọc"
            >
              <Filter size={14} />
            </button>
            <button
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors"
              title="Đánh dấu đã đọc"
            >
              <Check size={14} />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle px-4 flex-shrink-0">
          {[
            { id: "all", label: "Tất cả" },
            { id: "gmail", label: "Gmail", icon: Mail },
            { id: "github", label: "GitHub", icon: Github },
          ].map((f) => (
            <button
              key={f.id}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                filter === f.id
                  ? "border-accent-primary text-text-primary"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.icon && <f.icon size={12} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading && data.length === 0 ? (
            <div className="flex justify-center py-10 opacity-50">
              <RefreshCw
                size={24}
                className="animate-spin text-text-tertiary"
              />
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
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon size={16} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {item.sender}
                        </span>
                        <span className="text-xs text-text-tertiary flex-shrink-0 whitespace-nowrap">
                          {formatTimeAgo(item.time)}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mb-1 truncate">
                        {item.subject}
                      </div>
                      <div className="text-xs text-text-tertiary line-clamp-2">
                        {item.preview}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default InboxPanel;
