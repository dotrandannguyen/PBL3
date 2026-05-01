import React from "react";
import { Plus, Menu as MenuIcon, X } from "lucide-react";
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

// ============================================
// MAIN COMPONENT
// ============================================

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
  // State for Inbox Panel
  const [showInbox, setShowInbox] = React.useState(false);
  // Mobile drawer open state (md: always open)
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Close mobile drawer whenever the route changes
  React.useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  // Lock body scroll while the drawer is open
  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Filter pages by type - tách logic ra ngoài return
  const privatePages = pages.filter((p) => p.type === "private");

  return (
    <>
      {/* Mobile hamburger trigger — fixed top-left, hidden on md+ */}
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
        className={`bg-bg-sidebar flex flex-col h-full border-r border-border-subtle text-sm overflow-y-auto overflow-x-hidden z-50
          fixed md:relative top-0 left-0
          w-[260px] md:w-60
          transform-gpu transition-transform duration-250 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ transitionDuration: "240ms" }}
      >
        {/* Mobile close button (only visible when drawer open on mobile) */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-2 right-2 p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>

        {/* User Profile Section */}
        <UserMenu />

        {/* Main Navigation */}
        <nav className="py-1 mb-2">
          {MAIN_NAV_ITEMS.map((item) => {
            let isActive = false;
            if (item.id === "inbox") {
              isActive = showInbox;
            } else if (item.id === "home") {
              isActive = currentPath === "/app" && !activePage;
            } else if (item.id === "search") {
              isActive = currentPath === "/search";
            }

            return (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={t(item.labelKey)}
                isActive={isActive}
                badge={item.id === "inbox" ? unreadInbox : null}
                onClick={() => {
                  if (item.id === "inbox") {
                    setShowInbox(!showInbox);
                  } else if (item.id === "home") {
                    navigate("/app");
                  }
                }}
              />
            );
          })}
        </nav>

        {/* Private Pages Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t('sidebar.private')} onAdd={onAddNewList} />

          {privatePages.map((page) => (
            <PageItem
              key={page.id}
              page={page}
              onClick={(pageId) => {
                navigate(`/app`);
                onPageClick(pageId);
              }}
              isActive={currentPath === "/app" && page.id === activePage}
              onDelete={onDeletePage}
              onRename={onRenamePage}
            />
          ))}

          {privatePages.length === 0 && (
            <p className="px-3.5 py-1.5 text-text-tertiary text-sm">
              {t('sidebar.noPages')}
            </p>
          )}
        </section>

        {/* Shared Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t('sidebar.shared')} />
          <NavItem icon={Plus} label={t('sidebar.startCollaborating')} />
        </section>

        {/* Nexus Apps Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title={t('sidebar.nexusApps')} />
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
                onClick={() => {
                  if (item.id === "nexus-mail") {
                    navigate("/mail");
                  } else if (item.id === "nexus-calendar") {
                    navigate("/calendar");
                  }
                }}
              />
            );
          })}
        </section>

        {/* Bottom Navigation */}
        <nav className="py-1 mb-2">
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
                onClick={() => {
                  if (item.id === "settings") {
                    navigate("/settings");
                  } else if (item.id === "trash") {
                    navigate("/trash");
                  }
                }}
              />
            );
          })}
        </nav>

        {/* Invite Members Panel */}
        {/* <InvitePanel onClose={() => {}} /> */}
      </aside>

      {/* Sliding Inbox Panel */}
      <InboxPanel isOpen={showInbox} onClose={() => setShowInbox(false)} />
    </>
  );
};

export default Sidebar;
