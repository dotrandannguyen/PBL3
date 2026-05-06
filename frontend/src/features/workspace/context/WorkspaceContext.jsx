import React, { createContext, useState, useContext, useCallback, useEffect } from "react";
import { FileText, CheckSquare } from "lucide-react";

/**
 * WorkspaceContext — Quản lý state dùng chung cho sidebar workspace.
 * Được dùng bởi DashboardLayout (render Sidebar) và các trang con như
 * WorkspacePage để đọc/cập nhật danh sách trang đang active.
 */

const INITIAL_PAGES = [
  {
    id: "todo",
    icon: <CheckSquare size={14} />,
    label: "To Do List",
    type: "private",
    active: true,
  },
];

const EXPANDED_KEY = "workspace_expanded_ids";

const loadExpandedIds = () => {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (!raw) return { todo: true };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { todo: true };
  } catch {
    return { todo: true };
  }
};

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [activePage, setActivePage] = useState("todo");
  const [pendingRenameId, setPendingRenameId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(loadExpandedIds);

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify(expandedIds));
    } catch {
      // ignore quota errors
    }
  }, [expandedIds]);

  const toggleExpanded = useCallback((id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddNewList = () => {
    const hasTodoParent = pages.some((p) => p.id === "todo");
    const newPage = {
      id: `list-${Date.now()}`,
      icon: <FileText size={14} />,
      label: "New List",
      type: "private",
      parentId: hasTodoParent ? "todo" : undefined,
    };
    setPages((prev) => [...prev, newPage]);
    setActivePage(newPage.id);
    setPendingRenameId(newPage.id);
    if (hasTodoParent) {
      setExpandedIds((prev) => ({ ...prev, todo: true }));
    }
  };

  const clearPendingRename = useCallback(() => {
    setPendingRenameId(null);
  }, []);

  const handleDeletePage = (id) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      const next = prev.filter((p) => p.id !== id && p.parentId !== id);
      if (activePage === id || (target && prev.some((p) => p.id === activePage && p.parentId === id))) {
        const fallback = target?.parentId && next.some((p) => p.id === target.parentId)
          ? target.parentId
          : next[0]?.id || "todo";
        setActivePage(fallback);
      }
      return next;
    });
  };

  const handleRenamePage = (id, newLabel) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label: newLabel } : p)),
    );
  };

  return (
    <WorkspaceContext.Provider
      value={{
        pages,
        activePage,
        setActivePage,
        handleAddNewList,
        handleDeletePage,
        handleRenamePage,
        pendingRenameId,
        clearPendingRename,
        expandedIds,
        toggleExpanded,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
