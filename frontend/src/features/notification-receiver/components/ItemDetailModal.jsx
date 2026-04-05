import { X, ExternalLink, CheckCircle, Plus } from "lucide-react";
import { confirmInboxTask } from "../../tasks/api/task.api";
import { toast } from "sonner";

/**
 * @component ItemDetailModal
 * Modal hiển thị chi tiết tin nhắn/issue
 * @param {Object} item - Dữ liệu item { subject, sender, source, preview, time, link, status, id }
 * @param {Function} onClose - Callback khi đóng modal
 * @param {Function} onStatusChange - Callback khi confirm inbox task (taskId, newStatus)
 */
export function ItemDetailModal({ item, onClose, onStatusChange }) {
  if (!item) return null;

  /**
   * 👉 Xử lý click "Thêm vào Task" trong Modal
   * Gọi API confirm → update UI → show toast
   */
  const handleConfirm = async () => {
    try {
      await confirmInboxTask(item.id);
      // ✅ Update UI: set isConverted = true để hiển thị "✓ Đã thêm vào task"
      if (onStatusChange) onStatusChange(item.id, "PENDING");
      toast.success("✓ Đã đưa vào danh sách công việc!", {
        position: "bottom-right",
        duration: 3000,
      });
      // Optionally close modal sau 1.5s để user thấy confirm animation
      setTimeout(onClose, 1500);
    } catch (error) {
      toast.error("Lỗi khi chuyển thành Task");
      console.error(error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-sidebar w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-bg-main/50">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-bg-hover rounded-md text-text-tertiary hover:text-text-primary transition-colors"
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>
          <button
            onClick={() =>
              window.open(item.link, "_blank", "noopener,noreferrer")
            }
            className="p-1.5 hover:bg-bg-hover rounded-md text-text-tertiary hover:text-text-primary transition-colors"
            title={`Mở trong ${item.source === "gmail" ? "Gmail" : "GitHub"}`}
          >
            <ExternalLink size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {/* Header với Subject + Action Button */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-normal text-text-primary flex items-center gap-3">
                {item.subject}
                <span className="px-2 py-0.5 text-xs bg-bg-hover text-text-tertiary rounded-md">
                  {item.source === "gmail" ? "Hộp thư đến" : "Vấn đề"}
                </span>
              </h2>
            </div>
            {/* 👉 CONFIRM BUTTON OR BADGE */}
            {item.isConverted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-green-500 bg-green-500/10 rounded-md whitespace-nowrap">
                <CheckCircle size={16} />✓ Đã thêm vào task
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-md hover:bg-opacity-90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} /> Thêm vào Task
              </button>
            )}
          </div>

          {/* Sender & Timestamp */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-white font-medium text-xl shadow-sm">
                {item.sender?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <div className="text-sm">
                  <span className="font-bold text-text-primary">
                    {item.sender}
                  </span>
                  <span className="text-text-tertiary ml-2 text-xs">
                    &lt;
                    {item.source === "gmail" ? "google-mail" : "github-issue"}
                    &gt;
                  </span>
                </div>
                <div className="text-xs text-text-tertiary mt-1">Tới: tôi</div>
              </div>
            </div>
            <div className="text-xs text-text-tertiary mt-1 font-medium">
              {new Date(item.time).toLocaleString("vi-VN")}
            </div>
          </div>

          <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap ml-16 bg-bg-main p-4 rounded-lg border border-border-subtle">
            {item.preview}
          </div>
        </div>
      </div>
    </div>
  );
}
