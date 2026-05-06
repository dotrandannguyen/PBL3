import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Loader, FileText, Calendar, CheckSquare } from "lucide-react";
import { useSearchModal } from "../contexts/SearchModalContext";
import { useWorkspace } from "../../workspace/context/WorkspaceContext";
import { getTasks } from "../../tasks/api/task.api";

const formatDueDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });
};

const SearchModal = () => {
  const { isOpen, close } = useSearchModal();
  const { pages, setActivePage } = useWorkspace();
  const navigate = useNavigate();

  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [taskResults, setTaskResults] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // ESC + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTaskResults([]);
      // Focus input after mount animation kicks in
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced task search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTaskResults([]);
      setIsLoadingTasks(false);
      return;
    }
    let cancelled = false;
    setIsLoadingTasks(true);
    const timer = setTimeout(async () => {
      try {
        const res = await getTasks({ search: trimmed, limit: 10, page: 1 });
        if (cancelled) return;
        const items = res?.data?.data || res?.data || [];
        setTaskResults(Array.isArray(items) ? items : []);
      } catch (err) {
        if (!cancelled) setTaskResults([]);
      } finally {
        if (!cancelled) setIsLoadingTasks(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const filteredWorkspaces = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return pages;
    return pages.filter((p) => (p.label || "").toLowerCase().includes(trimmed));
  }, [pages, query]);

  const handleOpenWorkspace = (pageId) => {
    setActivePage(pageId);
    navigate("/app");
    close();
  };

  const handleOpenTask = (task) => {
    const keyword = task.title || "";
    const qs = keyword ? `?q=${encodeURIComponent(keyword)}` : "";
    navigate(`/app${qs}`);
    close();
  };

  if (!isOpen) return null;

  const hasQuery = query.trim().length > 0;
  const noResults =
    hasQuery &&
    !isLoadingTasks &&
    filteredWorkspaces.length === 0 &&
    taskResults.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm animate-backdrop-in"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal shell */}
      <div className="fixed inset-0 z-[81] flex items-start justify-center p-4 pt-[10vh] md:pt-[12vh] pointer-events-none">
        <div
          className="pointer-events-auto flex w-full max-w-[720px] max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-main shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-modal-in"
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm"
        >
          {/* Header / search input */}
          <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
            <Search size={18} className="shrink-0 text-text-tertiary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm workspace hoặc task..."
              className="flex-1 border-none bg-transparent text-[15px] text-text-primary outline-none placeholder-text-tertiary"
            />
            {isLoadingTasks && (
              <Loader size={14} className="animate-spin text-text-tertiary" />
            )}
            <kbd className="hidden md:inline rounded border border-border-subtle bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
              ESC
            </kbd>
            <button
              type="button"
              onClick={close}
              title="Đóng"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary border-none bg-transparent cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Workspaces section */}
            {filteredWorkspaces.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                  Workspace ({filteredWorkspaces.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredWorkspaces.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => handleOpenWorkspace(page.id)}
                      className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-sidebar/40 p-3.5 text-left transition-all duration-200 ease-out cursor-pointer hover:scale-[1.02] hover:border-accent-primary/40 hover:bg-white/5 hover:shadow-lg hover:shadow-accent-primary/10"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-accent-primary transition-colors group-hover:bg-accent-primary/15">
                        {page.icon || <FileText size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-text-primary">
                          {page.label}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-text-tertiary">
                          {page.id === "todo"
                            ? "Workspace mặc định"
                            : page.type === "private"
                              ? "Riêng tư"
                              : "Workspace"}
                        </p>
                      </div>
                      <ArrowRight
                        size={14}
                        className="shrink-0 text-text-tertiary opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Tasks section — only when there's a query */}
            {hasQuery && taskResults.length > 0 && (
              <section className="mb-2">
                <h3 className="mb-2.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                  Tasks ({taskResults.length})
                </h3>
                <div className="flex flex-col gap-1">
                  {taskResults.map((task) => {
                    const due = formatDueDate(task.dueDate);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleOpenTask(task)}
                        className="group flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer hover:bg-white/5 border-none bg-transparent"
                      >
                        <CheckSquare
                          size={14}
                          className={`shrink-0 ${task.completed ? "text-emerald-400" : "text-text-tertiary"}`}
                        />
                        <span
                          className={`flex-1 truncate text-[13px] ${task.completed ? "text-text-tertiary line-through" : "text-text-primary"}`}
                        >
                          {task.title || "(Không tiêu đề)"}
                        </span>
                        {due && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                            <Calendar size={11} />
                            {due}
                          </span>
                        )}
                        <ArrowRight
                          size={13}
                          className="shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty state — no query, no workspaces */}
            {!hasQuery && filteredWorkspaces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                <Search size={28} className="mb-2 opacity-50" />
                <p className="text-sm">Chưa có workspace nào.</p>
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                <Search size={28} className="mb-2 opacity-50" />
                <p className="text-sm">
                  Không tìm thấy kết quả cho "
                  <span className="text-text-secondary">{query}</span>"
                </p>
                <p className="mt-1 text-[11.5px]">Thử từ khoá khác.</p>
              </div>
            )}

            {/* Loading state when no workspace match yet but tasks fetching */}
            {hasQuery && filteredWorkspaces.length === 0 && isLoadingTasks && (
              <div className="flex items-center justify-center py-8 text-text-tertiary">
                <Loader size={18} className="animate-spin" />
                <span className="ml-2 text-sm">Đang tìm...</span>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between border-t border-border-subtle bg-bg-sidebar/30 px-4 py-2 text-[11px] text-text-tertiary">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border-subtle bg-white/5 px-1.5 py-0.5 font-mono">↵</kbd>
                Mở
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border-subtle bg-white/5 px-1.5 py-0.5 font-mono">⌘K</kbd>
                Tìm kiếm
              </span>
            </div>
            <span>{filteredWorkspaces.length + taskResults.length} kết quả</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchModal;
