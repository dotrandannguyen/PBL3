import { useState, useEffect } from "react";
import { X, FolderOpen, Plus, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "../../workspace/context/WorkspaceContext";
import { useLanguage } from "../../../contexts/LanguageContext";

/**
 * @component WorkspacePickerModal
 * Popup cho phép chọn workspace khi thêm inbox item vào task.
 * Nếu chỉ có 1 workspace (mặc định), tự động chọn và confirm luôn.
 *
 * @param {boolean} isOpen - Trạng thái hiển thị
 * @param {Function} onClose - Đóng modal
 * @param {Function} onConfirm - Callback(workspaceId) khi chọn workspace
 * @param {string} itemSubject - Tiêu đề item đang thêm (hiển thị context)
 */
export function WorkspacePickerModal({ isOpen, onClose, onConfirm, itemSubject }) {
  const { t } = useLanguage();
  const { pages, loading } = useWorkspace();
  const [selectedId, setSelectedId] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Auto-select first workspace when modal opens
  useEffect(() => {
    if (isOpen && pages.length > 0) {
      setSelectedId(pages[0].id);
    }
  }, [isOpen, pages]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 180);
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    onConfirm(selectedId);
    requestClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "animate-backdrop-in"
      }`}
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-bg-sidebar w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col transition-all duration-200 ${
          isClosing
            ? "opacity-0 scale-[0.97] translate-y-1"
            : "animate-modal-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-bg-main/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/15 flex items-center justify-center">
              <FolderOpen size={16} className="text-accent-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                {t('inbox.wsPicker.title')}
              </h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                {t('inbox.wsPicker.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={requestClose}
            className="p-1.5 hover:bg-bg-hover rounded-md text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Item preview */}
        {itemSubject && (
          <div className="px-5 py-3 border-b border-border-subtle bg-bg-main/30">
            <p className="text-xs text-text-tertiary mb-1">{t('inbox.wsPicker.adding')}</p>
            <p className="text-sm font-medium text-text-primary truncate">{itemSubject}</p>
          </div>
        )}

        {/* Workspace list */}
        <div className="px-3 py-3 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin-slow" />
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
              <FolderOpen size={32} className="opacity-40 mb-2" />
              <p className="text-sm">{t('inbox.wsPicker.noWorkspaces')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {pages.map((ws) => {
                const isSelected = selectedId === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedId(ws.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                      isSelected
                        ? "bg-accent-primary/10 border border-accent-primary/30 shadow-sm"
                        : "bg-transparent border border-transparent hover:bg-bg-hover hover:border-border-subtle"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                        isSelected
                          ? "bg-accent-primary text-white shadow-sm"
                          : "bg-bg-hover text-text-secondary group-hover:bg-bg-active"
                      }`}
                    >
                      {ws.icon || ws.label?.charAt(0)?.toUpperCase() || "W"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate transition-colors ${
                          isSelected ? "text-accent-primary" : "text-text-primary"
                        }`}
                      >
                        {ws.label}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2
                        size={18}
                        className="text-accent-primary flex-shrink-0 animate-badge-pop"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle bg-bg-main/30">
          <button
            onClick={requestClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            {t('inbox.wsPicker.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={15} />
            {t('inbox.wsPicker.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
