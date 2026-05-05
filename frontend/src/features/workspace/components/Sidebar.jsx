import React from "react";
import { Plus, Menu as MenuIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
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

const COLLAPSED_KEY = "sidebar_collapsed";

const Sidebar = ({
  pages,
  onAddNewList,
  activePage,
  onPageClick,
  onDeletePage,
  onRenamePage,
}) => {
  const { t } = useLanguage();
  const { count: unreadInbox } = useUnreadInbox();
  const [showInbox, setShowInbox] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "true"
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
    return () => { document.body.style.overflow = prev; };
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
            else if (item.id === "home") isActive = currentPath === "/app" && !activePage;
            else if (item.id === "search") isActive = currentPath === "/search";

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
                  else if (item.id === "home") navigate("/app");
                }}
              />
            );
          })}
        </nav>

        {/* Private Pages Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t('sidebar.private')} onAdd={onAddNewList} collapsed={collapsed} />
          {privatePages.map((page) => (
            <PageItem
              key={page.id}
              page={page}
              onClick={(pageId) => { navigate(`/app`); onPageClick(pageId); }}
              isActive={currentPath === "/app" && page.id === activePage}
              onDelete={onDeletePage}
              onRename={onRenamePage}
              collapsed={collapsed}
            />
          ))}
          {!collapsed && privatePages.length === 0 && (
            <p className="px-3.5 py-1.5 text-text-tertiary text-sm">
              {t('sidebar.noPages')}
            </p>
          )}
        </section>

        {/* Shared Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t('sidebar.shared')} collapsed={collapsed} />
          {!collapsed && <NavItem icon={Plus} label={t('sidebar.startCollaborating')} collapsed={false} />}
        </section>

        {/* Nexus Apps Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t('sidebar.nexusApps')} collapsed={collapsed} />
          {NEXUS_APPS.map((item) => {
            let isActive = false;
            if (item.id === "nexus-mail") isActive = currentPath === "/mail";
            if (item.id === "nexus-calendar") isActive = currentPath === "/calendar";

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
