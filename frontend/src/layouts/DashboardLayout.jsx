import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/features/workspace/components/Sidebar";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/features/workspace/context/WorkspaceContext";

/**
 * DashboardContent — Nội dung layout, consume WorkspaceContext.
 * Tách thành component riêng để useWorkspace() hoạt động bên trong Provider.
 */
function DashboardContent() {
  const {
    pages,
    activePage,
    setActivePage,
    handleAddNewList,
    handleDeletePage,
    handleRenamePage,
  } = useWorkspace();

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-bg-main text-text-primary font-sans">
      <Sidebar
        pages={pages}
        activePage={activePage}
        onPageClick={setActivePage}
        onAddNewList={handleAddNewList}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
      />
      <main className="flex-1 flex flex-col bg-bg-main overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * DashboardLayout — Layout route cha cho các trang bên trong dashboard.
 * Bọc WorkspaceProvider để chia sẻ state sidebar giữa các trang con.
 */
export function DashboardLayout() {
  return (
    <WorkspaceProvider>
      <DashboardContent />
    </WorkspaceProvider>
  );
}
