import React from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  UserAvatar,
  NavItem,
  PageItem,
  SectionHeader,
} from "../../../components/shared";
import { InboxPanel, InvitePanel, UserMenu } from "../panels";
import { MAIN_NAV_ITEMS, NOTION_APPS, BOTTOM_NAV_ITEMS } from "../constants";

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
  // State for Inbox Panel
  const [showInbox, setShowInbox] = React.useState(false);
  const navigate = useNavigate();

  // Filter pages by type - tách logic ra ngoài return
  const privatePages = pages.filter((p) => p.type === "private");

  return (
    <>
      <aside className="w-60 bg-bg-sidebar flex flex-col h-full border-r border-border-subtle text-sm overflow-y-auto overflow-x-hidden relative z-50">
        {/* User Profile Section */}
        <UserMenu />

        {/* Main Navigation */}
        <nav className="py-1 mb-2">
          {MAIN_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              isActive={item.label === "Inbox" && showInbox}
              onClick={() => {
                if (item.label === "Inbox") {
                  setShowInbox(!showInbox);
                } else if (item.label === "Home") {
                  navigate("/app");
                }
              }}
            />
          ))}
        </nav>

        {/* Private Pages Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title="Private" onAdd={onAddNewList} />

          {privatePages.map((page) => (
            <PageItem
              key={page.id}
              page={page}
              onClick={onPageClick}
              isActive={page.id === activePage}
              onDelete={onDeletePage}
              onRename={onRenamePage}
            />
          ))}

          {privatePages.length === 0 && (
            <p className="px-3.5 py-1.5 text-text-tertiary text-sm">
              No pages inside
            </p>
          )}
        </section>

        {/* Shared Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title="Shared" />
          <NavItem icon={Plus} label="Start collaborating" />
        </section>

        {/* Notion Apps Section */}
        <section className="py-1 mb-2 pt-2">
          <SectionHeader title="Notion apps" />
          {NOTION_APPS.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              onClick={() => {
                if (item.label === "Notion Mail") {
                  navigate("/mail");
                } else if (item.label === "Notion Calendar") {
                  navigate("/calendar");
                }
              }}
            />
          ))}
        </section>

        {/* Bottom Navigation */}
        <nav className="py-1 mb-2">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <NavItem key={item.label} icon={item.icon} label={item.label} />
          ))}
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
