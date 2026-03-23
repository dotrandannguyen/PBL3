import { Inbox, Mail, Github, RefreshCw, AlertCircle } from "lucide-react";
import { MailListItem } from "./MailListItem";

/**
 * @component InboxTabsContainer
 * Container chứa tabs, list mail/issue, và trạng thái loading/error
 * @param {Array} data - Dữ liệu toàn bộ tin nhắn/issue
 * @param {string} filter - Filter hiện tại (all, gmail, github)
 * @param {Function} onFilterChange - Callback khi chuyển tab
 * @param {boolean} isLoading - Trạng thái loading
 * @param {string} error - Message lỗi (nếu có)
 * @param {Function} onItemClick - Callback khi click vào item
 */
export function InboxTabsContainer({
  data,
  filter,
  onFilterChange,
  isLoading,
  error,
  onItemClick,
}) {
  // Lọc dữ liệu theo tab
  const filteredData = data.filter((item) => {
    if (filter === "all") return true;
    return item.source === filter;
  });

  return (
    <div className="flex flex-col rounded-xl border border-border-subtle overflow-hidden bg-bg-sidebar shadow-sm mb-12 flex-1">
      {/* TABS */}
      <div className="flex items-center border-b border-border-subtle bg-bg-main/30">
        <button
          onClick={() => onFilterChange("all")}
          className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
            filter === "all"
              ? "border-accent-primary text-accent-primary bg-bg-hover/50"
              : "border-transparent text-text-tertiary hover:bg-bg-hover"
          }`}
        >
          <Inbox size={18} /> Chính
        </button>
        <button
          onClick={() => onFilterChange("gmail")}
          className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
            filter === "gmail"
              ? "border-red-500 text-red-500 bg-red-500/5"
              : "border-transparent text-text-tertiary hover:bg-bg-hover"
          }`}
        >
          <Mail size={18} /> Gmail
        </button>
        <button
          onClick={() => onFilterChange("github")}
          className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
            filter === "github"
              ? "border-gray-400 text-text-primary bg-gray-500/5"
              : "border-transparent text-text-tertiary hover:bg-bg-hover"
          }`}
        >
          <Github size={18} /> GitHub
        </button>
      </div>

      {/* LIST DATA */}
      <div className="flex flex-col">
        {isLoading && filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <RefreshCw
              size={28}
              className="animate-spin mb-4 opacity-50 text-accent-primary"
            />
            <p className="text-sm">Đang đồng bộ dữ liệu...</p>
          </div>
        ) : error && filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-red-500">
            <AlertCircle size={32} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <div className="w-16 h-16 rounded-full bg-bg-hover flex items-center justify-center mb-4">
              <Inbox size={32} className="opacity-40" />
            </div>
            <p className="text-base font-medium text-text-primary mb-1">
              Chưa có tin nhắn nào
            </p>
            <p className="text-sm">Hộp thư của bạn hiện đang trống.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredData.map((item) => (
              <MailListItem
                key={`list-${item.id}`}
                item={item}
                onClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
