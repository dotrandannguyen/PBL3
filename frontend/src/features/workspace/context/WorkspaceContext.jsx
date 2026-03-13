import React, { createContext, useState, useContext } from "react";
import { FileText, BookOpen, Rocket, CheckSquare } from "lucide-react";

/**
 * WorkspaceContext — Quản lý state dùng chung cho sidebar workspace.
 * Được dùng bởi DashboardLayout (render Sidebar) và các trang con như
 * WorkspacePage để đọc/cập nhật danh sách trang đang active.
 */

const INITIAL_PAGES = [
  {
    id: "welcome1",
    icon: <Rocket size={14} />,
    label: "Getting Started",
    type: "private",
  },
  {
    id: "welcome2",
    icon: <BookOpen size={14} />,
    label: "Quick Guide",
    type: "private",
  },
  {
    id: "todo",
    icon: <CheckSquare size={14} />,
    label: "To Do List",
    type: "private",
    active: true,
  },
  {
    id: "todolist1",
    icon: <FileText size={14} />,
    label: "Todo List",
    type: "private",
    indent: true,
  },
  {
    id: "todolist2",
    icon: <FileText size={14} />,
    label: "To Do List",
    type: "private",
    indent: true,
  },
];

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [activePage, setActivePage] = useState("todo");

  const handleAddNewList = () => {
    const newPage = {
      id: `list-${Date.now()}`,
      icon: <FileText size={14} />,
      label: "New List",
      type: "private",
    };
    setPages((prev) => [...prev, newPage]);
    setActivePage(newPage.id);
  };

  const handleDeletePage = (id) => {
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activePage === id && next.length > 0) setActivePage(next[0].id);
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
