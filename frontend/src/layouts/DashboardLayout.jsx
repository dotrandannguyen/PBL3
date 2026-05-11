import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/features/workspace/components/Sidebar";
import DeadlineToastBridge from "@/features/workspace/components/DeadlineToastBridge";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/features/workspace/context/WorkspaceContext";
import { UnreadInboxProvider } from "@/features/notification-receiver/context/UnreadInboxContext";
import { AccountModalProvider } from "@/features/setting/contexts/AccountModalContext";
import AccountModal from "@/features/setting/components/AccountModal";
import { SearchModalProvider } from "@/features/workspace/search/contexts/SearchModalContext";
import SearchModal from "@/features/workspace/search/components/SearchModal";
import { FloatingChat } from "@/features/ai-chat/components/FloatingChat";

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
    pendingRenameId,
    clearPendingRename,
    isCreatingWorkspace,
    createWorkspaceWithName,
    cancelCreate,
  } = useWorkspace();
  const location = useLocation();

  return (
    <div className="flex w-full h-screen overflow-hidden bg-bg-main text-text-primary font-sans">
      <DeadlineToastBridge />
      <Sidebar
        pages={pages}
        activePage={activePage}
        onPageClick={setActivePage}
        onAddNewList={handleAddNewList}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
        pendingRenameId={pendingRenameId}
        onClearPendingRename={clearPendingRename}
        isCreatingWorkspace={isCreatingWorkspace}
        createWorkspaceWithName={createWorkspaceWithName}
        cancelCreate={cancelCreate}
      />
      <main className="flex-1 flex flex-col bg-bg-main overflow-hidden">
        {/* Keyed wrapper: re-mounts on route change → triggers fade-in */}
        <div
          key={location.pathname}
          className="flex flex-col flex-1 min-h-0 animate-route-fade-in"
        >
          <Outlet />
        </div>
      </main>
      <AccountModal />
      <SearchModal />
      {/* AI Floating Chat - hiển thị ở mọi trang dashboard */}
      <FloatingChat />
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
      <UnreadInboxProvider>
        <AccountModalProvider>
          <SearchModalProvider>
            <DashboardContent />
          </SearchModalProvider>
        </AccountModalProvider>
      </UnreadInboxProvider>
    </WorkspaceProvider>
  );
}
