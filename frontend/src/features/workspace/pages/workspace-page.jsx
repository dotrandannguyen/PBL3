import React from "react";
import TopBar from "../components/TopBar";
import TaskList from "../../tasks/pages/TaskList";
import { useWorkspace } from "../context/WorkspaceContext";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";

const ACCENTS = [
  { from: "from-blue-500/15", ring: "ring-blue-500/20", dot: "bg-blue-500", glow: "shadow-blue-500/10" },
  { from: "from-emerald-500/15", ring: "ring-emerald-500/20", dot: "bg-emerald-500", glow: "shadow-emerald-500/10" },
  { from: "from-purple-500/15", ring: "ring-purple-500/20", dot: "bg-purple-500", glow: "shadow-purple-500/10" },
  { from: "from-amber-500/15", ring: "ring-amber-500/20", dot: "bg-amber-500", glow: "shadow-amber-500/10" },
  { from: "from-pink-500/15", ring: "ring-pink-500/20", dot: "bg-pink-500", glow: "shadow-pink-500/10" },
  { from: "from-cyan-500/15", ring: "ring-cyan-500/20", dot: "bg-cyan-500", glow: "shadow-cyan-500/10" },
];

const accentFor = (id) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
};

/**
 * WorkspacePage — Nội dung trang workspace.
 * Layout (Sidebar + outer container) được xử lý bởi DashboardLayout.
 */
export function WorkspacePage() {
  const { pages, activePage, setActivePage, toggleExpanded } = useWorkspace();

  const activePageData = pages.find((p) => p.id === activePage) ||
    pages[0] || { label: "No pages" };

  const children = pages.filter((p) => p.parentId === activePageData.id);
  const showHub = children.length > 0;

  const handleOpenChild = (childId) => {
    setActivePage(childId);
    toggleExpanded?.(activePageData.id);
  };

  return (
    <>
      <TopBar
        title={activePageData.label}
        icon={activePageData.icon}
        isPrivate={true}
        editedDate="Just now"
      />
      {showHub ? (
        <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto w-full">
          <div className="flex items-end justify-between mb-7">
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-text-tertiary">
                <Sparkles size={12} className="text-accent-primary" />
                <span>Tổng quan</span>
              </div>
              <h2 className="text-3xl font-semibold text-text-primary tracking-tight">
                {activePageData.label}
              </h2>
              <p className="text-sm text-text-tertiary mt-1">
                {children.length} danh sách bên trong
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                // delegate to context's add (children of current parent)
                // handled via sidebar's `+` button typically
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors border border-border-subtle"
            >
              <Plus size={14} />
              <span>Thêm danh sách</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => {
              const accent = accentFor(child.id);
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleOpenChild(child.id)}
                  className={`group relative text-left rounded-2xl border border-border-subtle bg-bg-sidebar/40 overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-accent-primary/40 hover:shadow-xl hover:${accent.glow} cursor-pointer`}
                >
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${accent.from} to-transparent opacity-60`} />
                  <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${accent.from} to-transparent blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative p-5">
                    <div className="flex items-start gap-3 mb-5">
                      <div className={`w-10 h-10 rounded-xl bg-bg-hover ring-1 ${accent.ring} flex items-center justify-center text-text-primary shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                        {child.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="text-base font-semibold text-text-primary truncate leading-tight">
                          {child.label}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                          <span className="text-[11px] text-text-tertiary uppercase tracking-wide">
                            Danh sách
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight
                        size={16}
                        className="text-text-tertiary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border-subtle/50">
                      <div className="flex -space-x-1">
                        <div className="w-1 h-1 rounded-full bg-text-tertiary/60" />
                        <div className="w-1 h-1 rounded-full bg-text-tertiary/40 ml-1" />
                        <div className="w-1 h-1 rounded-full bg-text-tertiary/20 ml-1" />
                      </div>
                      <span className="text-[11px] text-text-tertiary ml-auto group-hover:text-text-secondary transition-colors">
                        Nhấn để mở
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <TaskList key={activePageData.id} workspaceId={activePageData.id} title={activePageData.label} />
      )}
    </>
  );
}
