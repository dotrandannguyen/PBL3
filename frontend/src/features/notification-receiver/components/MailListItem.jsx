import { Mail, Github, ExternalLink, CheckCircle, Plus } from "lucide-react";
import { formatTimeAgo } from "../utils/formatTimeAgo";
import { confirmInboxTask } from "../../tasks/api/task.api";
import { toast } from "sonner";

/**
 * @component MailListItem
 * Item hiển thị trong list inbox (giống Gmail)
 * @param {Object} item - Dữ liệu: id, source, sender, subject, preview, time, link, status
 * @param {Function} onClick - Callback khi click vào item
 * @param {Function} onStatusChange - Callback khi confirm inbox task
 */
export function MailListItem({ item, onClick, onStatusChange }) {
  const Icon = item.source === "gmail" ? Mail : Github;

  /**
   * 👉 Xử lý click "Thêm vào Task" trên row
   * Quick action để user không cần mở modal
   */
  const handleConfirm = async (e) => {
    e.stopPropagation();
    try {
      await confirmInboxTask(item.id);
      // ✅ Update UI: gọi callback để update state (item.isConverted = true)
      if (onStatusChange) onStatusChange(item.id, "PENDING");
      toast.success("✓ Đã đưa vào danh sách công việc!", {
        position: "bottom-right",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Lỗi khi chuyển thành Task");
      console.error(error);
    }
  };

  return (
    <div
      onClick={() => onClick(item)}
      className={`group flex items-center px-4 py-2.5 border-b border-border-subtle relative cursor-pointer transition-all duration-150 last:border-b-0 ${
        item.isConverted
          ? "bg-bg-main opacity-60"
          : "bg-bg-sidebar hover:bg-bg-hover hover:shadow-md hover:z-10"
      }`}
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

      <div className="w-48 flex-shrink-0 text-right flex items-center justify-end">
        {/* NẾU ĐÃ THÊM (isConverted=true) -> HIỆN CHỮ XANH */}
        {item.isConverted ? (
          <div className="flex items-center justify-end gap-1 text-xs font-semibold text-green-500">
            <CheckCircle size={14} />
            Đã thêm vào task
          </div>
        ) : (
          /* NẾU CHƯA THÊM (isConverted=false) -> HIỆN THỜI GIAN VÀ NÚT BẤM */
          <>
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
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-accent-primary text-white rounded-md hover:bg-opacity-90 transition-colors shadow-sm"
                title="Thêm vào Task"
              >
                <Plus size={14} /> Thêm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
