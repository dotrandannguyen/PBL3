import React from "react";
import { Plus } from "lucide-react";
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
  // State for Inbox Panel
  const [showInbox, setShowInbox] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Filter pages by type - tách logic ra ngoài return
  const privatePages = pages.filter((p) => p.type === "private");

  return (
    <>
      <aside className="w-60 bg-bg-sidebar flex flex-col h-full border-r border-border-subtle text-sm overflow-y-auto overflow-x-hidden relative z-50">
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
