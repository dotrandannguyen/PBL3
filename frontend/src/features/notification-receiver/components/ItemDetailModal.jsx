import { useEffect, useState } from "react";
import { X, ExternalLink, CheckCircle, Plus } from "lucide-react";
import { confirmInboxTask } from "../../tasks/api/task.api";
import { toast } from "sonner";
import { useLanguage } from "../../../contexts/LanguageContext";
import { WorkspacePickerModal } from "./WorkspacePickerModal";

/**
 * @component ItemDetailModal
 * Modal hiển thị chi tiết tin nhắn/issue
 * @param {Object} item - Dữ liệu item { subject, sender, source, preview, time, link, status, id }
 * @param {Function} onClose - Callback khi đóng modal
 * @param {Function} onStatusChange - Callback khi confirm inbox task (taskId, newStatus)
 */
export function ItemDetailModal({ item, onClose, onStatusChange }) {
  const { t, lang } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [showWsPicker, setShowWsPicker] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // Animate out, then call parent onClose
  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 180);
  };

  if (!item) return null;

  /**
   * Mở popup chọn workspace trước khi confirm
   */
  const handleAddToTask = () => {
    setShowWsPicker(true);
  };

  /**
   * Xử lý confirm sau khi chọn workspace
   * Gọi API confirm với workspaceId → update UI → show toast
   */
  const handleConfirmWithWorkspace = async (workspaceId) => {
    try {
      await confirmInboxTask(item.id, workspaceId);
      if (onStatusChange) onStatusChange(item.id, "PENDING");
      toast.success(t('inbox.toast.addedTask'), {
        position: "bottom-right",
        duration: 3000,
      });
      setTimeout(requestClose, 1500);
    } catch (error) {
      toast.error(t('inbox.toast.error'));
      console.error(error);
    }
  };

  // Locale string for date
  const dateLocale = lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'vi-VN';

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isClosing ? "opacity-0" : "animate-backdrop-in"
        }`}
        onClick={requestClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={`bg-bg-sidebar w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[85vh] transition-all duration-200 ${
            isClosing
              ? "opacity-0 scale-[0.97] translate-y-1"
              : "animate-modal-in"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-bg-main/50">
            <div className="flex items-center gap-2">
              <button
                onClick={requestClose}
                className="p-1.5 hover:bg-bg-hover rounded-md text-text-tertiary hover:text-text-primary transition-colors active:scale-95"
                title={t('inbox.modal.close')}
              >
                <X size={20} />
              </button>
            </div>
            <button
              onClick={() =>
                window.open(item.link, "_blank", "noopener,noreferrer")
              }
              className="p-1.5 hover:bg-bg-hover rounded-md text-text-tertiary hover:text-text-primary transition-colors"
              title={`${t('inbox.modal.openIn')} ${item.source === "gmail" ? "Gmail" : "GitHub"}`}
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
                    {item.source === "gmail" ? t('inbox.modal.inbox') : t('inbox.modal.issue')}
                  </span>
                </h2>
              </div>
              {/* CONFIRM BUTTON OR BADGE */}
              {item.isConverted ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-green-500 bg-green-500/10 rounded-md whitespace-nowrap">
                  <CheckCircle size={16} />{t('inbox.modal.added')}
                </div>
              ) : (
                <button
                  onClick={handleAddToTask}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-md hover:bg-opacity-90 transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus size={16} /> {t('inbox.modal.addToTask')}
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
                  <div className="text-xs text-text-tertiary mt-1">{t('inbox.modal.to')}</div>
                </div>
              </div>
              <div className="text-xs text-text-tertiary mt-1 font-medium">
                {new Date(item.time).toLocaleString(dateLocale)}
              </div>
            </div>

            <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap ml-16 bg-bg-main p-4 rounded-lg border border-border-subtle">
              {item.preview}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Picker Modal */}
      <WorkspacePickerModal
        isOpen={showWsPicker}
        onClose={() => setShowWsPicker(false)}
        onConfirm={handleConfirmWithWorkspace}
        itemSubject={item.subject}
      />
    </>
  );
}
