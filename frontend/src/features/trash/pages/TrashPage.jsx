/**
 * TrashPage - Trang Thùng rác
 *
 * File: frontend/src/features/trash/pages/TrashPage.jsx
 *
 * Mục đích: Hiển thị danh sách tasks đã xoá, hỗ trợ khôi phục / xoá vĩnh viễn
 * Pattern: Notion-style UI, consistent với TaskList page
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  Trash2,
  RotateCcw,
  X,
  Loader,
  AlertTriangle,
  Search,
} from "lucide-react";
import { TrashProvider, useTrashContext } from "../context/TrashContext";
import { useLanguage } from "../../../contexts/LanguageContext";

/* ── Helpers ─────────────────────────────────────────────────── */

const formatDeletedAt = (deletedAt) => {
  if (!deletedAt) return "";
  const now = new Date();
  const deleted = new Date(deletedAt);
  const diffMs = now - deleted;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Vừa xoá";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;
  if (diffDay < 30) return `${diffDay} ngày trước`;

  return deleted.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getPriorityStyle = (priority) => {
  const p = typeof priority === "string" ? priority.toUpperCase() : "";
  const map = {
    HIGH: {
      bg: "bg-red-500/15",
      text: "text-red-400",
      label: "High",
    },
    MEDIUM: {
      bg: "bg-yellow-500/15",
      text: "text-yellow-400",
      label: "Medium",
    },
    LOW: {
      bg: "bg-blue-500/15",
      text: "text-blue-400",
      label: "Low",
    },
  };
  return map[p] || null;
};

/* ── Confirm Dialog ──────────────────────────────────────────── */

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-bg-sidebar p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-text-primary">
            {title}
          </h3>
        </div>
        <p className="mb-6 text-sm text-text-secondary">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5"
            onClick={onCancel}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
            onClick={onConfirm}
          >
            Xoá vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Trash Row ───────────────────────────────────────────────── */

const TrashRow = ({ task, onRestore, onPermanentDelete }) => {
  const priority = getPriorityStyle(task.priority);

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:border-border-subtle hover:bg-white/[0.03]">
      {/* Trash Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-text-tertiary">
        <Trash2 size={14} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="truncate text-sm text-text-primary"
          title={task.title}
        >
          {task.title}
        </span>
        <span className="text-[11px] text-text-tertiary">
          {formatDeletedAt(task.deletedAt)}
        </span>
      </div>

      {/* Priority */}
      {priority && (
        <div
          className={`hidden shrink-0 items-center rounded-md px-2 py-0.5 sm:flex ${priority.bg}`}
        >
          <span className={`text-[11px] font-medium ${priority.text}`}>
            {priority.label}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          title="Khôi phục"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-emerald-500/15 hover:text-emerald-400"
          onClick={() => onRestore(task.id)}
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          title="Xoá vĩnh viễn"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-red-500/15 hover:text-red-400"
          onClick={() => onPermanentDelete(task.id)}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

/* ── Main Content ────────────────────────────────────────────── */

function TrashContent() {
  const { t } = useLanguage();
  const {
    trashTasks,
    loading,
    error,
    fetchTrashTasks,
    restoreTask,
    permanentDeleteTask,
  } = useTrashContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    fetchTrashTasks();
  }, [fetchTrashTasks]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return trashTasks;
    const q = searchQuery.toLowerCase();
    return trashTasks.filter((t) => t.title?.toLowerCase().includes(q));
  }, [trashTasks, searchQuery]);

  const handleRestore = async (taskId) => {
    await restoreTask(taskId);
  };

  const handlePermanentDelete = (taskId) => {
    setConfirmDeleteId(taskId);
  };

  const handleConfirmPermanentDelete = async () => {
    if (confirmDeleteId) {
      await permanentDeleteTask(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto pt-10 pb-10">
      <div className="max-w-3xl mx-auto px-15 py-0">
        {/* ── Header ──────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              <Trash2 size={22} className="text-text-tertiary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-text-primary">
                {t("trash.title")}
              </h1>
              <p className="mt-1 text-sm text-text-tertiary">
                {t("trash.subtitle")}
              </p>
            </div>
          </div>
        </header>

        {/* ── Error banner ────────────────────────────── */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            ⚠️ {error}
            <button
              onClick={() => fetchTrashTasks()}
              className="ml-2 underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* ── Toolbar ─────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-text-tertiary">
            {trashTasks.length > 0
              ? `${trashTasks.length} ${t("trash.itemCount")}`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                isSearchOpen
                  ? "bg-accent-primary/20 text-white"
                  : "text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
              }`}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              title={t("trash.search")}
            >
              <Search size={15} />
            </button>
          </div>
        </div>

        {/* ── Search bar ──────────────────────────────── */}
        {isSearchOpen && (
          <div className="mb-4">
            <input
              type="text"
              className="w-full rounded-lg border border-border-subtle bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-neutral-500 outline-none transition-colors focus:border-accent-primary"
              placeholder={t("trash.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* ── Loading ─────────────────────────────────── */}
        {loading && trashTasks.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader size={32} className="animate-spin text-text-tertiary" />
          </div>
        )}

        {/* ── Task list ───────────────────────────────── */}
        {!loading && filteredTasks.length > 0 && (
          <div className="space-y-0.5">
            {filteredTasks.map((task) => (
              <TrashRow
                key={task.id}
                task={task}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────── */}
        {!loading && filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <Trash2 size={32} className="text-text-tertiary" />
            </div>
            <p className="mb-1 text-sm font-medium text-text-secondary">
              {searchQuery.trim()
                ? t("trash.noSearchResults")
                : t("trash.empty")}
            </p>
            <p className="text-xs text-text-tertiary">
              {searchQuery.trim()
                ? t("trash.tryOtherKeyword")
                : t("trash.emptyHint")}
            </p>
          </div>
        )}
      </div>

      {/* ── Confirm dialog ────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={t("trash.confirmDeleteTitle")}
        message={t("trash.confirmDeleteMessage")}
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </main>
  );
}

/* ── Export ───────────────────────────────────────────────────── */

export function TrashPage() {
  return (
    <TrashProvider>
      <TrashContent />
    </TrashProvider>
  );
}

export default TrashPage;
