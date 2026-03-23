import { Mail, Github, ExternalLink } from "lucide-react";
import { formatTimeAgo } from "../utils/formatTimeAgo";

/**
 * @component MailListItem
 * Item hiển thị trong list inbox (giống Gmail)
 * @param {Object} item - Dữ liệu: id, source, sender, subject, preview, time, link
 * @param {Function} onClick - Callback khi click vào item
 */
export function MailListItem({ item, onClick }) {
  const Icon = item.source === "gmail" ? Mail : Github;

  return (
    <div
      onClick={() => onClick(item)}
      className="group flex items-center px-4 py-2.5 bg-bg-sidebar border-b border-border-subtle hover:bg-bg-hover hover:shadow-md hover:z-10 relative cursor-pointer transition-all duration-150 last:border-b-0"
    >
      <div className="flex-shrink-0 w-12 flex items-center text-text-tertiary group-hover:text-text-primary transition-colors">
        <Icon
          size={18}
          className={item.source === "gmail" ? "text-red-500" : ""}
        />
      </div>

      <div className="w-48 pr-4 truncate text-sm font-semibold text-text-primary">
        {item.sender}
      </div>

      <div className="flex-1 min-w-0 truncate text-sm pr-4">
        <span className="font-medium text-text-primary">{item.subject}</span>
        <span className="mx-2 text-text-tertiary font-normal">-</span>
        <span className="text-text-tertiary font-normal">{item.preview}</span>
      </div>

      <div className="w-24 flex-shrink-0 text-right flex items-center justify-end">
        <span className="text-xs font-medium text-text-primary group-hover:hidden">
          {formatTimeAgo(item.time)}
        </span>

        <div className="hidden group-hover:flex items-center justify-end gap-2 text-text-tertiary">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(item.link, "_blank", "noopener,noreferrer");
            }}
            className="p-1.5 hover:bg-white/20 rounded-full text-text-primary transition-colors"
            title="Mở trong tab mới"
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
