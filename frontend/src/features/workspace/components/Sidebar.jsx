import React from "react";
import {
  Plus,
  Menu as MenuIcon,
  X,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  ChevronDown,
  FileText,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UserAvatar,
  NavItem,
  PageItem,
  SectionHeader,
} from "../../../components/shared";
import { InboxPanel, InvitePanel, UserMenu } from "../panels";
import { MAIN_NAV_ITEMS, NEXUS_APPS, BOTTOM_NAV_ITEMS } from "../constants";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useUnreadInbox } from "../../notification-receiver/context/UnreadInboxContext";
import { useSearchModal } from "../search/contexts/SearchModalContext";
import { useWorkspace } from "../context/WorkspaceContext";

const COLLAPSED_KEY = "sidebar_collapsed";

/* ── TodoListParent: fixed parent item with collapse + add button ── */
const TodoListParent = ({ onAdd, collapsed, children }) => {
  const [open, setOpen] = React.useState(true);

  if (collapsed) return null;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold text-text-secondary hover:text-text-primary select-none cursor-pointer transition-colors group"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 text-text-tertiary ${open ? "" : "-rotate-90"}`}
        />
        <CheckSquare size={14} className="text-accent-primary" />
        <span className="flex-1">To Do List</span>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-text-primary hover:bg-white/10 cursor-pointer bg-transparent border-0 transition-all flex items-center justify-center"
          title="Thêm workspace"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          <Plus size={14} />
        </button>
      </div>
      {open && <div className="ml-3">{children}</div>}
    </div>
  );
};

/* ── InlineCreateInput: inline input for entering workspace name ── */
const InlineCreateInput = ({ onSubmit, onCancel }) => {
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(value);
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (value.trim()) {
      onSubmit(value);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 px-3.5 py-1">
      <FileText size={14} className="text-text-tertiary shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Nhập tên workspace..."
        className="flex-1 bg-white/5 border border-accent-primary/50 rounded px-2 py-1 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
};

const Sidebar = ({
  pages,
  onAddNewList,
  activePage,
  onPageClick,
  onDeletePage,
  onRenamePage,
  pendingRenameId,
  onClearPendingRename,
  isCreatingWorkspace,
  createWorkspaceWithName,
  cancelCreate,
}) => {
  const { t } = useLanguage();
  const { count: unreadInbox } = useUnreadInbox();
  const { open: openSearchModal, isOpen: isSearchOpen } = useSearchModal();
  const { expandedIds, toggleExpanded } = useWorkspace();
  const [showInbox, setShowInbox] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "true",
  );
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  React.useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      if (next) setShowInbox(false);
      return next;
    });
  };

  const privatePages = pages.filter((p) => p.type === "private");
  const parentPages = privatePages.filter((p) => !p.parentId);
  const childrenOf = (parentId) =>
    privatePages.filter((p) => p.parentId === parentId);

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-md bg-bg-sidebar/95 backdrop-blur border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors active:scale-95 shadow-sm"
        aria-label="Open menu"
      >
        <MenuIcon size={18} />
      </button>

      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`group/sidebar bg-bg-sidebar flex flex-col h-full border-r border-border-subtle text-sm overflow-y-auto overflow-x-hidden z-50
          fixed md:relative top-0 left-0
          w-[260px] md:transition-[width] md:duration-200 md:ease-in-out
          ${collapsed ? "md:w-14" : "md:w-60"}
          transform-gpu transition-transform duration-[240ms] ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-2 right-2 p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>

        {/* Edge handle — rendered fixed so overflow-x-hidden doesn't clip it */}

        {/* User Profile Section */}
        <UserMenu collapsed={collapsed} />

        {/* Main Navigation */}
        <nav className="py-1 mb-2">
          {MAIN_NAV_ITEMS.map((item) => {
            let isActive = false;
            if (item.id === "inbox") isActive = showInbox;
            else if (item.id === "home") isActive = currentPath === "/";
            else if (item.id === "dashboard")
              isActive = currentPath === "/dashboard";
            else if (item.id === "search") isActive = isSearchOpen;

            return (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={t(item.labelKey)}
                isActive={isActive}
                badge={item.id === "inbox" ? unreadInbox : null}
                collapsed={collapsed}
                onClick={() => {
                  if (item.id === "inbox") setShowInbox(!showInbox);
                  else if (item.id === "home") navigate("/");
                  else if (item.id === "dashboard") navigate("/dashboard");
                  else if (item.id === "search") openSearchModal();
                }}
              />
            );
          })}
        </nav>

        {/* To Do List — collapsible parent with nested workspaces */}
        <section className="py-1 mb-2 pt-2">
          {collapsed ? (
            <div className="mx-3 my-1.5 border-t border-border-subtle" />
          ) : (
            <TodoListParent onAdd={onAddNewList} collapsed={collapsed}>
              {parentPages.map((page) => {
                const children = childrenOf(page.id);
                const hasChildren = children.length > 0;
                const isExpanded = !!expandedIds?.[page.id];
                return (
                  <React.Fragment key={page.id}>
                    <PageItem
                      page={page}
                      onClick={(pageId) => {
                        navigate(`/app`);
                        onPageClick(pageId);
                      }}
                      isActive={
                        currentPath === "/app" && page.id === activePage
                      }
                      onDelete={onDeletePage}
                      onRename={onRenamePage}
                      collapsed={collapsed}
                      autoStartRename={page.id === pendingRenameId}
                      onAutoRenameStart={onClearPendingRename}
                      hasChildren={hasChildren}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleExpanded(page.id)}
                      depth={0}
                    />
                    {hasChildren &&
                      isExpanded &&
                      children.map((child) => (
                        <PageItem
                          key={child.id}
                          page={child}
                          onClick={(pageId) => {
                            navigate(`/app`);
                            onPageClick(pageId);
                          }}
                          isActive={
                            currentPath === "/app" && child.id === activePage
                          }
                          onDelete={onDeletePage}
                          onRename={onRenamePage}
                          collapsed={collapsed}
                          autoStartRename={child.id === pendingRenameId}
                          onAutoRenameStart={onClearPendingRename}
                          depth={1}
                        />
                      ))}
                  </React.Fragment>
                );
              })}
              {isCreatingWorkspace && (
                <InlineCreateInput
                  onSubmit={createWorkspaceWithName}
                  onCancel={cancelCreate}
                />
              )}
            </TodoListParent>
          )}
        </section>

        {/* Shared Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t("sidebar.shared")} collapsed={collapsed} />
          {!collapsed && (
            <NavItem
              icon={Plus}
              label={t("sidebar.startCollaborating")}
              collapsed={false}
            />
          )}
        </section>

        {/* Nexus Apps Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t("sidebar.nexusApps")} collapsed={collapsed} />
          {NEXUS_APPS.map((item) => {
            let isActive = false;
            if (item.id === "nexus-mail") isActive = currentPath === "/mail";
            if (item.id === "nexus-calendar")
              isActive = currentPath === "/calendar";

            return (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={t(item.labelKey)}
                isActive={isActive}
                badge={item.id === "nexus-mail" ? unreadInbox : null}
                collapsed={collapsed}
                onClick={() => {
                  if (item.id === "nexus-mail") navigate("/mail");
                  else if (item.id === "nexus-calendar") navigate("/calendar");
                }}
              />
            );
          })}
        </section>

        {/* Bottom Navigation */}
        <nav className="py-1 mb-2 mt-auto">
          {BOTTOM_NAV_ITEMS.map((item) => {
            let isActive = false;
            if (item.id === "settings") isActive = currentPath === "/settings";
            if (item.id === "trash") isActive = currentPath === "/trash";

            return (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={t(item.labelKey)}
                isActive={isActive}
                collapsed={collapsed}
                onClick={() => {
                  if (item.id === "settings") navigate("/settings");
                  else if (item.id === "trash") navigate("/trash");
                }}
              />
            );
          })}
        </nav>
      </aside>

      {/* Sliding Inbox Panel */}
      <InboxPanel
        isOpen={showInbox}
        onClose={() => setShowInbox(false)}
        sidebarCollapsed={collapsed}
      />

      {/* Desktop edge toggle handle */}
      <div
        className="hidden md:block fixed top-0 bottom-0 z-[70] w-3 group/handle"
        style={{
          left: collapsed ? 53 : 237,
          transition: "left 200ms ease-in-out",
        }}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Mở sidebar" : "Thu gọn sidebar"}
          className="absolute top-1/3 left-0 -translate-x-1/2
            flex items-center justify-center
            w-5 h-8 rounded-md
            bg-bg-sidebar border border-border-subtle shadow-md
            text-text-tertiary hover:text-text-primary hover:bg-white/10
            opacity-0 group-hover/handle:opacity-100
            transition-opacity duration-150
            cursor-pointer border-0"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>
    </>
  );
};

export default Sidebar;
