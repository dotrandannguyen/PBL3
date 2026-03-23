import { X, ExternalLink } from "lucide-react";

/**
 * @component ItemDetailModal
 * Modal hiển thị chi tiết tin nhắn/issue
 * @param {Object} item - Dữ liệu item { subject, sender, source, preview, time, link }
 * @param {Function} onClose - Callback khi đóng modal
 */
export function ItemDetailModal({ item, onClose }) {
  if (!item) return null;

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
          <h2 className="text-2xl font-normal text-text-primary mb-8 flex items-center gap-3">
            {item.subject}
            <span className="px-2 py-0.5 text-xs bg-bg-hover text-text-tertiary rounded-md">
              {item.source === "gmail" ? "Hộp thư đến" : "Vấn đề"}
            </span>
          </h2>

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
