import React, { useState } from "react";
import {
  Mail,
  Github,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  X,
} from "lucide-react";
import { useIntegrations } from "../hooks/useIntegrations";
import useAuth from "../../auth/hooks/useAuth";
import { getGoogleAuthUrl, getGithubAuthUrl } from "../../auth/api/auth.api";

// Format date relative (e.g. 1h ago, 2d ago) or localized
const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MailListItem = ({ item, onClick }) => {
  const Icon = item.icon;

  return (
    <div
      onClick={() => onClick(item)}
      className="group flex items-center justify-between p-4 border-b border-border-subtle hover:bg-bg-hover cursor-pointer transition-colors bg-bg-sidebar"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <Icon size={20} className="text-text-primary" />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-text-primary truncate">
              {item.sender}
            </span>
            <span className="text-xs text-text-tertiary whitespace-nowrap">
              {formatTimeAgo(item.time)}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-sm text-text-primary truncate font-medium max-w-[40%]">
              {item.subject}
            </span>
            <span className="text-sm text-text-tertiary truncate">
              - {item.preview}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink
          size={16}
          className="text-text-tertiary hover:text-text-primary"
          onClick={(e) => {
            e.stopPropagation();
            window.open(item.link, "_blank", "noopener,noreferrer");
          }}
        />
      </div>
    </div>
  );
};

export function MailReceiverPage() {
  const { user } = useAuth();
  const { data, loading, error, connected, refetch } = useIntegrations();
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const handleConnectGoogle = async () => {
    try {
      const res = await getGoogleAuthUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Google Auth URL");
    }
  };

  const handleConnectGithub = async () => {
    try {
      const res = await getGithubAuthUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Github Auth URL");
    }
  };

  const filteredData = data.filter((item) => {
    if (filter === "all") return true;
    return item.source === filter;
  });

  return (
    <div className="flex flex-col h-full w-full bg-bg-main text-text-primary overflow-y-auto">
      <div className="flex-1 px-12 py-8 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-text-primary">
            Chào buổi tối, {user?.name || user?.fullName || "Người dùng"}
          </h1>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2.5 rounded-full hover:bg-bg-hover text-text-tertiary transition-colors flex items-center justify-center disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {!connected.gmail && !connected.github && (
          <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-yellow-500" />
              <span className="text-sm font-medium text-text-primary">
                Hãy kết nối Gmail hoặc GitHub để bắt đầu nhận tin nhắn.
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleConnectGoogle}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Kết nối Google
              </button>
              <button
                onClick={handleConnectGithub}
                className="px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Kết nối GitHub
              </button>
            </div>
          </div>
        )}

        {(connected.gmail || connected.github) &&
          (!connected.gmail || !connected.github) && (
            <div className="flex flex-col gap-3 mb-8">
              {!connected.gmail && (
                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-500" />
                    <span className="text-sm font-medium text-text-primary">
                      Tài khoản chưa được liên kết với Google để nhận Email.
                    </span>
                  </div>
                  <button
                    onClick={handleConnectGoogle}
                    className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    Kết nối Google
                  </button>
                </div>
              )}

              {!connected.github && (
                <div className="flex items-center justify-between p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Github size={20} className="text-gray-400" />
                    <span className="text-sm font-medium text-text-primary">
                      Tài khoản chưa được liên kết với GitHub để nhận Issues.
                    </span>
                  </div>
                  <button
                    onClick={handleConnectGithub}
                    className="px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    Kết nối GitHub
                  </button>
                </div>
              )}
            </div>
          )}

        <div className="flex items-center border-b border-border-subtle mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              filter === "all"
                ? "border-accent-primary text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-primary"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter("gmail")}
            className={`px-4 py-3 flex items-center gap-2 text-sm font-semibold border-b-2 transition-colors ${
              filter === "gmail"
                ? "border-accent-primary text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-primary"
            }`}
          >
            <Mail size={16} /> Gmail
          </button>
          <button
            onClick={() => setFilter("github")}
            className={`px-4 py-3 flex items-center gap-2 text-sm font-semibold border-b-2 transition-colors ${
              filter === "github"
                ? "border-accent-primary text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-primary"
            }`}
          >
            <Github size={16} /> GitHub
          </button>
        </div>

        <div className="flex flex-col rounded-xl border border-border-subtle overflow-hidden bg-bg-sidebar shadow-sm mb-12">
          {loading && filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
              <RefreshCw size={32} className="animate-spin mb-4 opacity-50" />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : error && filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle size={32} className="mb-4 opacity-50" />
              <p>Không thể tải dữ liệu: {error}</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
              <Mail size={48} className="mb-4 opacity-20" />
              <p>Chưa có dữ liệu mới.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border-subtle">
              {filteredData.map((item) => (
                <MailListItem
                  key={item.id}
                  item={item}
                  onClick={setSelectedItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-bg-sidebar w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-text-primary font-semibold">
                {selectedItem.source === "gmail" ? (
                  <Mail size={18} className="text-red-500" />
                ) : (
                  <Github size={18} />
                )}
                {selectedItem.source === "gmail"
                  ? "Chi tiết Email"
                  : "Chi tiết Issue"}
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 hover:bg-white/10 rounded-md text-text-tertiary hover:text-text-primary transition-colors"
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-2xl font-bold text-text-primary mb-4 leading-snug">
                {selectedItem.subject}
              </h2>

              <div className="flex items-center gap-3 mb-6 p-4 bg-black/20 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center text-white font-bold text-lg">
                  {selectedItem.sender?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {selectedItem.sender}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {formatTimeAgo(selectedItem.time)}
                  </div>
                </div>
              </div>

              <div className="text-text-secondary leading-relaxed bg-bg-main p-4 rounded-lg border border-border-subtle whitespace-pre-wrap">
                {selectedItem.preview}

                {selectedItem.source === "gmail" && (
                  <div className="mt-4 italic text-sm opacity-70">
                    * Lưu ý: Đây chỉ là bản xem trước của email. Để xem toàn bộ
                    nội dung, vui lòng mở trong Gmail.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border-subtle bg-black/10 flex justify-end gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-md font-medium text-text-secondary hover:bg-white/5 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() =>
                  window.open(
                    selectedItem.link,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="px-4 py-2 rounded-md font-semibold bg-accent-primary text-white hover:bg-opacity-90 transition-colors flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Mở trong {selectedItem.source === "gmail" ? "Gmail" : "GitHub"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
