import { Mail, Github, CheckCircle } from "lucide-react";
import { formatTimeAgo } from "../utils/formatTimeAgo";

/**
 * @component RecentItemCard
 * Card hiển thị tin nhắn/issue mới nhất theo kiểu Notion
 * @param {Object} item - Dữ liệu tin nhắn { id, source, sender, subject, preview, time, link, isConverted, ... }
 * @param {Function} onClick - Callback khi click vào card
 */
export function RecentItemCard({ item, onClick }) {
  const Icon = item.source === "gmail" ? Mail : Github;
  const isGmail = item.source === "gmail";

  return (
    <div
      onClick={() => onClick(item)}
      className="w-56 h-40 flex-shrink-0 flex flex-col bg-bg-sidebar border border-border-subtle rounded-xl overflow-hidden cursor-pointer hover:border-text-tertiary hover:shadow-lg transition-all duration-200 group relative"
    >
      {/* ✅ Badge nếu đã convert */}
      {item.isConverted && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-500 bg-green-500/20 rounded-md">
          <CheckCircle size={12} />
          Đã thêm
        </div>
      )}

      {/* Nửa trên: Cover / Visual */}
      <div
        className={`h-16 flex items-center px-4 relative overflow-hidden ${
          isGmail ? "bg-red-500/10" : "bg-gray-500/10"
        }`}
      >
        {/* Background Icon mờ đi tạo điểm nhấn */}
        <Icon
          size={64}
          className={`absolute -right-2 -bottom-4 opacity-10 transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300 ${
            isGmail ? "text-red-500" : "text-gray-400"
          }`}
        />
        {/* Icon nhỏ góc trái giống Notion */}
        <div
          className={`w-8 h-8 rounded-full bg-bg-sidebar flex items-center justify-center shadow-sm z-10 ${
            isGmail ? "text-red-500" : "text-text-primary"
          }`}
        >
          <Icon size={16} />
        </div>
      </div>

      {/* Nửa dưới: Nội dung (Title + Date) */}
      <div className="p-4 flex flex-col flex-1 bg-bg-sidebar">
        <h3
          className="font-semibold text-text-primary text-sm leading-snug line-clamp-2 mb-2 group-hover:text-accent-primary transition-colors"
          title={item.subject}
        >
          {item.subject}
        </h3>

        {/* Footer của Card */}
        <div className="mt-auto flex items-center gap-2 text-xs text-text-tertiary font-medium">
          <div className="w-5 h-5 rounded-full bg-bg-hover flex items-center justify-center text-text-secondary">
            {item.sender?.charAt(0)?.toUpperCase()}
          </div>
          <span className="truncate flex-1">{formatTimeAgo(item.time)}</span>
        </div>
      </div>
    </div>
  );
}
