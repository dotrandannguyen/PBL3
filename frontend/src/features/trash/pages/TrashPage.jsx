/**
 * TrashPage — Trang Thùng rác (đã nâng cấp UI/UX)
 *
 * File: frontend/src/features/trash/pages/TrashPage.jsx
 *
 * Tính năng:
 *   - Multi-select + bulk restore / bulk permanent delete
 *   - Empty trash (xoá toàn bộ) với confirm
 *   - Sort: mới xoá / xoá lâu nhất / tên / độ ưu tiên
 *   - Filter theo thời gian xoá: All / Today / 7d / 30d / Older
 *   - Tìm kiếm inline
 *   - Keyboard shortcut: ⌘A select all · Esc clear · Del delete selected
 *   - Animation: row exit slide-out, confirm modal scale-in, bulk bar spring-in
 */

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Trash2,
  RotateCcw,
  X,
  AlertTriangle,
  Search,
  ArrowUpDown,
  CheckSquare,
  Square,
  Eraser,
  Info,
  ChevronDown,
} from "lucide-react";
import { TrashProvider, useTrashContext } from "../context/TrashContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { SkeletonList } from "@/components/shared";

/* ─── Helpers ──────────────────────────────────────────────────────── */

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

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const getPriorityStyle = (priority) => {
  const p = typeof priority === "string" ? priority.toUpperCase() : "";
  const map = {
    HIGH: { bg: "bg-red-500/12", text: "text-red-400", label: "High" },
    MEDIUM: {
      bg: "bg-yellow-500/12",
      text: "text-yellow-400",
      label: "Medium",
    },
    LOW: { bg: "bg-blue-500/12", text: "text-blue-400", label: "Low" },
  };
  return map[p] || null;
};

const interpolate = (template, vars) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{{${k}}}`
  );

const SORT_OPTIONS = [
  { id: "deleted-newest", labelKey: "trash.sortDeletedNewest" },
  { id: "deleted-oldest", labelKey: "trash.sortDeletedOldest" },
  { id: "name", labelKey: "trash.sortNameAsc" },
  { id: "priority", labelKey: "trash.sortPriority" },
];

const FILTER_OPTIONS = [
  { id: "all", labelKey: "trash.filterAll" },
  { id: "today", labelKey: "trash.filterToday" },
  { id: "7d", labelKey: "trash.filter7d" },
  { id: "30d", labelKey: "trash.filter30d" },
  { id: "older", labelKey: "trash.filterOlder" },
];

const matchesDateFilter = (deletedAt, filter) => {
  if (filter === "all") return true;
  const ts = new Date(deletedAt).getTime();
  if (Number.isNaN(ts)) return filter === "all";
  const ageDays = (Date.now() - ts) / 86_400_000;
  switch (filter) {
    case "today":
      return ageDays < 1;
    case "7d":
      return ageDays < 7;
    case "30d":
      return ageDays < 30;
    case "older":
      return ageDays >= 30;
    default:
      return true;
  }
};

const sortTasks = (tasks, sortKey) => {
  const arr = [...tasks];
  switch (sortKey) {
    case "deleted-oldest":
      return arr.sort(
        (a, b) => new Date(a.deletedAt) - new Date(b.deletedAt)
      );
    case "name":
      return arr.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", undefined, {
          sensitivity: "base",
        })
      );
    case "priority":
      return arr.sort(
        (a, b) =>
          (PRIORITY_RANK[(a.priority || "").toUpperCase()] ?? 99) -
          (PRIORITY_RANK[(b.priority || "").toUpperCase()] ?? 99)
      );
    case "deleted-newest":
    default:
      return arr.sort(
        (a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)
      );
  }
};

/* ─── Confirm Dialog ───────────────────────────────────────────────── */

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(
    (cb) => {
      if (isClosing) return;
      setIsClosing(true);
      setTimeout(() => cb?.(), 180);
    },
    [isClosing]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") requestClose(onCancel);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel, requestClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "animate-backdrop-in"
      }`}
      onClick={() => requestClose(onCancel)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-sm rounded-2xl border border-border-subtle bg-bg-sidebar shadow-2xl transition-all duration-200 ${
          isClosing
            ? "opacity-0 scale-[0.97] translate-y-1"
            : "animate-modal-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/12 ring-1 ring-red-500/20">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div className="pt-1">
              <h3 className="text-base font-semibold text-text-primary">
                {title}
              </h3>
            </div>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-text-secondary pl-14">
            {message}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-150 hover:bg-white/5 hover:text-text-primary active:scale-[0.97]"
              onClick={() => requestClose(onCancel)}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-red-500 hover:shadow-red-500/20 hover:shadow-lg active:scale-[0.97]"
              onClick={() => requestClose(onConfirm)}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Trash Row ──────────────────────────────────────────────────── */

const TrashRow = ({
  task,
  selected,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
  isRemoving,
}) => {
  const priority = getPriorityStyle(task.priority);

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-[background-color,border-color,transform] duration-150 ease-out ${
        selected
          ? "bg-accent-primary/8 ring-1 ring-inset ring-accent-primary/25"
          : "ring-1 ring-inset ring-transparent hover:bg-white/[0.025] hover:ring-border-subtle/60"
      } ${isRemoving ? "animate-row-fade-out pointer-events-none" : ""}`}
    >
      {/* Selection checkbox */}
      <button
        type="button"
        onClick={() => onToggleSelect(task.id)}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] transition-all duration-150 active:scale-90 ${
          selected
            ? "bg-accent-primary text-white shadow-sm shadow-accent-primary/30"
            : "border border-border-focused text-transparent hover:border-accent-primary/60 group-hover:text-text-tertiary"
        }`}
        aria-label={selected ? "Deselect" : "Select"}
      >
        {selected && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Trash Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary transition-colors group-hover:bg-white/[0.06]">
        <Trash2 size={14} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate text-[13.5px] font-medium text-text-primary leading-tight"
          title={task.title}
        >
          {task.title}
        </span>
        <span className="text-[11px] text-text-tertiary leading-tight">
          {formatDeletedAt(task.deletedAt)}
        </span>
      </div>

      {/* Priority */}
      {priority && (
        <div
          className={`hidden shrink-0 items-center rounded-md px-2 py-[3px] sm:flex ${priority.bg}`}
        >
          <span
            className={`text-[10.5px] font-semibold tracking-wide ${priority.text}`}
          >
            {priority.label}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 focus-within:opacity-100 focus-within:translate-x-0">
        <button
          type="button"
          title="Khôi phục"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-all duration-150 hover:bg-emerald-500/12 hover:text-emerald-400 active:scale-90"
          onClick={() => onRestore(task.id)}
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          title="Xoá vĩnh viễn"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-all duration-150 hover:bg-red-500/12 hover:text-red-400 active:scale-90"
          onClick={() => onPermanentDelete(task.id)}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

/* ─── Sort dropdown ──────────────────────────────────────────────── */

const SortDropdown = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const currentLabel =
    SORT_OPTIONS.find((o) => o.id === value)?.labelKey ||
    SORT_OPTIONS[0].labelKey;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
          open
            ? "bg-white/[0.08] text-text-primary"
            : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
        }`}
        title={label}
      >
        <ArrowUpDown size={13} />
        <span>{t(currentLabel)}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-lg border border-border-subtle bg-bg-sidebar p-1 shadow-2xl shadow-black/40 animate-dropdown-in">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors duration-100 ${
                value === opt.id
                  ? "bg-accent-primary/12 text-accent-primary"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <span>{t(opt.labelKey)}</span>
              {value === opt.id && (
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Filter Chips ───────────────────────────────────────────────── */

const FilterChips = ({ value, onChange, options, t, className = "" }) => (
  <div
    className={`inline-flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5 ${className}`}
  >
    {options.map((opt) => {
      const active = value === opt.id;
      return (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`relative h-7 rounded-md px-2.5 text-[11px] font-medium transition-all duration-150 active:scale-[0.97] ${
            active
              ? "bg-bg-sidebar text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          {t(opt.labelKey)}
        </button>
      );
    })}
  </div>
);

/* ─── Bulk Action Bar (mounts/unmounts to play in/out anim) ──────── */

const BulkActionBar = ({
  count,
  onRestore,
  onDelete,
  onClear,
  t,
}) => (
  <div
    role="toolbar"
    aria-label="Bulk actions"
    className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 animate-bulk-bar-in"
  >
    <div className="flex items-center gap-1 rounded-2xl border border-border-subtle bg-bg-sidebar/95 px-2.5 py-2 shadow-2xl shadow-black/40 backdrop-blur-md">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-primary px-1.5 text-[10.5px] font-bold text-white animate-badge-pop">
          {count}
        </span>
        <span className="hidden text-[11.5px] font-medium text-text-secondary sm:inline">
          {t("trash.selected")}
        </span>
      </div>
      <div className="mx-1 h-5 w-px bg-border-subtle" />
      <button
        type="button"
        onClick={onRestore}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-emerald-400 transition-all duration-150 hover:bg-emerald-500/12 active:scale-[0.97]"
      >
        <RotateCcw size={13} />
        <span className="hidden sm:inline">
          {interpolate(t("trash.bulkRestore"), { count })}
        </span>
        <span className="sm:hidden">{t("trash.restore")}</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-red-400 transition-all duration-150 hover:bg-red-500/12 active:scale-[0.97]"
      >
        <Trash2 size={13} />
        <span className="hidden sm:inline">
          {interpolate(t("trash.bulkDelete"), { count })}
        </span>
        <span className="sm:hidden">{t("trash.deletePermanent")}</span>
      </button>
      <div className="mx-1 h-5 w-px bg-border-subtle" />
      <button
        type="button"
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-all duration-150 hover:bg-white/5 hover:text-text-primary active:scale-90"
        title={t("trash.clearSelection")}
      >
        <X size={14} />
      </button>
    </div>
  </div>
);

/* ─── Main Content ───────────────────────────────────────────────── */

function TrashContent() {
  const { t } = useLanguage();
  const {
    trashTasks,
    loading,
    error,
    removingIds,
    fetchTrashTasks,
    restoreTask,
    permanentDeleteTask,
    bulkRestore,
    bulkPermanentDelete,
    emptyTrash,
  } = useTrashContext();

  // Toolbar / view state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortKey, setSortKey] = useState("deleted-newest");
  const [dateFilter, setDateFilter] = useState("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState(null);
  // shape: { kind: 'single' | 'bulk' | 'empty', ids?: string[] }

  useEffect(() => {
    fetchTrashTasks();
  }, [fetchTrashTasks]);

  // Keep selection in sync when items leave the list (e.g. after restore)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds((prev) => {
      const valid = new Set(trashTasks.map((t) => t.id));
      const next = new Set();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [trashTasks]);

  // ── Derived list ──
  const visibleTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = trashTasks.filter((task) => {
      if (q && !(task.title || "").toLowerCase().includes(q)) return false;
      if (!matchesDateFilter(task.deletedAt, dateFilter)) return false;
      return true;
    });
    return sortTasks(filtered, sortKey);
  }, [trashTasks, searchQuery, dateFilter, sortKey]);

  const allVisibleSelected =
    visibleTasks.length > 0 &&
    visibleTasks.every((t) => selectedIds.has(t.id));
  const someVisibleSelected =
    !allVisibleSelected && visibleTasks.some((t) => selectedIds.has(t.id));

  // ── Selection helpers ──
  const toggleOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const visibleIds = new Set(visibleTasks.map((t) => t.id));
        const next = new Set();
        prev.forEach((id) => {
          if (!visibleIds.has(id)) next.add(id);
        });
        return next;
      }
      const next = new Set(prev);
      visibleTasks.forEach((t) => next.add(t.id));
      return next;
    });
  }, [allVisibleSelected, visibleTasks]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Action handlers ──
  const handleRestoreSingle = (id) => restoreTask(id);
  const handleDeleteSingle = (id) =>
    setConfirmState({ kind: "single", ids: [id] });

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await bulkRestore(ids);
    clearSelection();
  };

  const requestBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setConfirmState({ kind: "bulk", ids });
  }, [selectedIds]);

  const requestEmptyTrash = () => {
    if (!trashTasks.length) return;
    setConfirmState({ kind: "empty" });
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    const { kind, ids } = confirmState;
    setConfirmState(null);
    if (kind === "single") {
      await permanentDeleteTask(ids[0]);
    } else if (kind === "bulk") {
      await bulkPermanentDelete(ids);
      clearSelection();
    } else if (kind === "empty") {
      await emptyTrash();
      clearSelection();
    }
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      if (isTyping) return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (visibleTasks.length) toggleSelectAll();
      } else if (e.key === "Escape") {
        if (selectedIds.size) clearSelection();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size) {
          e.preventDefault();
          requestBulkDelete();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    visibleTasks.length,
    selectedIds.size,
    toggleSelectAll,
    clearSelection,
    requestBulkDelete,
  ]);

  // ── Confirm dialog props ──
  const confirmProps = useMemo(() => {
    if (!confirmState)
      return { open: false, title: "", message: "", confirmLabel: "" };
    if (confirmState.kind === "single") {
      return {
        open: true,
        title: t("trash.confirmDeleteTitle"),
        message: t("trash.confirmDeleteMessage"),
        confirmLabel: t("trash.deletePermanent"),
      };
    }
    if (confirmState.kind === "bulk") {
      return {
        open: true,
        title: t("trash.confirmDeleteTitle"),
        message: interpolate(t("trash.confirmDeleteBulkMessage"), {
          count: confirmState.ids.length,
        }),
        confirmLabel: t("trash.deletePermanent"),
      };
    }
    return {
      open: true,
      title: t("trash.confirmEmptyTitle"),
      message: interpolate(t("trash.confirmEmptyMessage"), {
        count: trashTasks.length,
      }),
      confirmLabel: t("trash.emptyTrash"),
    };
  }, [confirmState, trashTasks.length, t]);

  const totalCount = trashTasks.length;
  const visibleCount = visibleTasks.length;
  const isFiltered = dateFilter !== "all" || searchQuery.trim() !== "";

  return (
    <main className="flex-1 overflow-y-auto pb-24">
      <div className="mx-auto w-full max-w-4xl px-6 lg:px-10 pt-12">
        {/* ── Header ───────────────────────────────────── */}
        <header className="mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-border-subtle/60">
              <Trash2 size={22} className="text-text-tertiary" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="text-3xl font-bold tracking-tight text-text-primary">
                {t("trash.title")}
              </h1>
              <p className="mt-1 text-sm text-text-tertiary">
                {t("trash.subtitle")}
              </p>
            </div>
            {totalCount > 0 && (
              <button
                type="button"
                onClick={requestEmptyTrash}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle/80 bg-white/[0.02] px-3 text-xs font-medium text-text-secondary transition-all duration-150 hover:border-red-500/35 hover:bg-red-500/[0.07] hover:text-red-400 active:scale-[0.97]"
                title={t("trash.emptyTrash")}
              >
                <Eraser size={14} />
                <span className="hidden sm:inline">
                  {t("trash.emptyTrash")}
                </span>
              </button>
            )}
          </div>

          {/* Auto-purge hint */}
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border-subtle/50 bg-white/[0.015] px-3.5 py-2.5 text-xs text-text-tertiary">
            <Info size={13} className="mt-0.5 shrink-0 opacity-70" />
            <span className="leading-relaxed">{t("trash.autoPurgeHint")}</span>
          </div>
        </header>

        {/* ── Error banner ────────────────────────────── */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/[0.07] px-3.5 py-2.5 text-sm text-red-400">
            <span className="mr-1">⚠</span>
            {error}
            <button
              onClick={() => fetchTrashTasks()}
              className="ml-2 underline-offset-2 hover:underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* ── Toolbar ─────────────────────────────────── */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Left: count + filter chips */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-text-secondary">
                {totalCount}
              </span>
              <span className="text-text-tertiary">
                {t("trash.itemCount")}
              </span>
              {isFiltered && totalCount > 0 && (
                <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-text-tertiary">
                  {visibleCount}
                </span>
              )}
            </div>

            {/* Date filter chips (md+) */}
            <FilterChips
              value={dateFilter}
              onChange={setDateFilter}
              options={FILTER_OPTIONS}
              t={t}
              className="hidden md:inline-flex"
            />
          </div>

          {/* Right: sort + search */}
          <div className="flex items-center gap-1">
            <SortDropdown
              value={sortKey}
              onChange={setSortKey}
              label={t("trash.sortBy")}
            />
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150 active:scale-90 ${
                isSearchOpen
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
              }`}
              onClick={() => setIsSearchOpen((v) => !v)}
              title={t("trash.search")}
              aria-pressed={isSearchOpen}
            >
              <Search size={15} />
            </button>
          </div>
        </div>

        {/* Mobile: filter chips below toolbar */}
        <div className="mb-3 md:hidden -mx-1 overflow-x-auto px-1 pb-1">
          <FilterChips
            value={dateFilter}
            onChange={setDateFilter}
            options={FILTER_OPTIONS}
            t={t}
          />
        </div>

        {/* ── Search bar ──────────────────────────────── */}
        {isSearchOpen && (
          <div className="mb-3 animate-route-fade-in">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
              />
              <input
                type="text"
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none transition-all duration-150 focus:border-accent-primary focus:bg-white/[0.05]"
                placeholder={t("trash.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Select-all bar ──────────────────────────── */}
        {!loading && visibleTasks.length > 0 && (
          <div className="mb-1.5 flex items-center justify-between px-3 text-[11px] text-text-tertiary">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:text-text-primary active:scale-95"
            >
              {allVisibleSelected ? (
                <CheckSquare size={13} className="text-accent-primary" />
              ) : someVisibleSelected ? (
                <CheckSquare size={13} className="text-accent-primary/55" />
              ) : (
                <Square size={13} />
              )}
              <span className="font-medium">
                {allVisibleSelected
                  ? t("trash.clearSelection")
                  : t("trash.selectAll")}
              </span>
            </button>
            <span className="hidden truncate sm:inline opacity-70">
              {t("trash.shortcutHint")}
            </span>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────── */}
        {loading && totalCount === 0 && (
          <div className="rounded-lg border border-border-subtle/40 overflow-hidden">
            <SkeletonList rows={5} />
          </div>
        )}

        {/* ── Task list ───────────────────────────────── */}
        {!loading && visibleTasks.length > 0 && (
          <div className="space-y-px">
            {visibleTasks.map((task) => (
              <TrashRow
                key={task.id}
                task={task}
                selected={selectedIds.has(task.id)}
                onToggleSelect={toggleOne}
                onRestore={handleRestoreSingle}
                onPermanentDelete={handleDeleteSingle}
                isRemoving={removingIds.has(task.id)}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────── */}
        {!loading && visibleTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 animate-route-fade-in">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] ring-1 ring-border-subtle/60 animate-float-gentle">
              <Trash2 size={34} className="text-text-tertiary opacity-60" />
            </div>
            <p className="mb-1 text-[15px] font-semibold text-text-secondary">
              {isFiltered ? t("trash.noSearchResults") : t("trash.empty")}
            </p>
            <p className="text-xs text-text-tertiary">
              {isFiltered ? t("trash.tryOtherKeyword") : t("trash.emptyHint")}
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setDateFilter("all");
                }}
                className="mt-5 rounded-md border border-border-subtle/80 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.97]"
              >
                {t("trash.filterAll")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk action bar ──────────────────────────── */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onRestore={handleBulkRestore}
          onDelete={requestBulkDelete}
          onClear={clearSelection}
          t={t}
        />
      )}

      {/* ── Confirm dialog ───────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmProps.open}
        title={confirmProps.title}
        message={confirmProps.message}
        confirmLabel={confirmProps.confirmLabel}
        cancelLabel={t("trash.cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </main>
  );
}

/* ─── Export ─────────────────────────────────────────────────────── */

export function TrashPage() {
  return (
    <TrashProvider>
      <TrashContent />
    </TrashProvider>
  );
}

export default TrashPage;
