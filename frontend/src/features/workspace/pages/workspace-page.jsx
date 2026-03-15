import React from "react";
import TopBar from "../components/TopBar";
import TaskList from "../../tasks/pages/TaskList";
import { useWorkspace } from "../context/WorkspaceContext";

/**
 * WorkspacePage — Nội dung trang workspace.
 * Layout (Sidebar + outer container) được xử lý bởi DashboardLayout.
 */
export function WorkspacePage() {
  const { pages, activePage } = useWorkspace();

  const activePageData = pages.find((p) => p.id === activePage) ||
    pages[0] || { label: "No pages" };

  return (
    <>
      <TopBar
        title={activePageData.label}
        icon={activePageData.icon}
        isPrivate={true}
        editedDate="Just now"
      />
      <TaskList key={activePageData.id} title={activePageData.label} />
    </>
  );
}
