import React from "react";
import { Inbox, Filter, Check, MoreHorizontal } from "lucide-react";
import NOTIFICATIONS from "./inbox.constants";

const InboxPanel = ({ isOpen, onClose }) => {
  const [filter, setFilter] = React.useState("all");

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-y-0 left-60 right-0 bg-black/50 z-30"
          onClick={onClose}
        />
      )}

      {/* Inbox Panel */}
      <div
        className={`fixed top-0 left-60 h-screen w-80 bg-bg-sidebar border-l border-border-subtle flex flex-col z-40 transition-transform duration-300 overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Inbox size={16} />
            Inbox
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors"
              title="Filter"
            >
              <Filter size={14} />
            </button>
            <button
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors"
              title="Mark all read"
            >
              <Check size={14} />
            </button>
            <button
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors"
              title="More"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle px-4 flex-shrink-0">
          {["all", "unread", "archived"].map((f) => (
            <button
              key={f}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                filter === f
                  ? "border-accent-primary text-text-primary"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              }`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {NOTIFICATIONS.map((notif) => (
            <div
              key={notif.id}
              className={`border-b border-border-subtle px-4 py-3 hover:bg-white/3 transition-colors cursor-pointer ${
                notif.unread ? "bg-white/5" : ""
              }`}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <notif.icon size={16} style={{ color: notif.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {notif.sender}
                    </span>
                    <span className="text-xs text-text-tertiary flex-shrink-0">
                      {notif.time}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mb-1">
                    {notif.subject}
                  </div>
                  <div className="text-xs text-text-tertiary line-clamp-2">
                    {notif.preview}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default InboxPanel;
