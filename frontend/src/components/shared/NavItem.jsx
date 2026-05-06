import React from "react";

const NavItem = ({ icon: Icon, label, onClick, isActive = false, badge = null, collapsed = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`group w-full flex items-center ${collapsed ? "justify-center px-0 py-2" : "px-3.5 py-1.5"} bg-transparent border-0 text-sm font-medium text-left cursor-pointer transition-all duration-150 active:scale-[0.98] ${
      isActive
        ? "bg-white/5 text-text-primary"
        : "text-text-secondary hover:bg-white/3 hover:text-text-primary"
    }`}
  >
    <Icon
      size={16}
      className={`flex-shrink-0 transition-transform duration-150 ${collapsed ? "" : "mr-2.5"} ${
        isActive ? "opacity-100 scale-105" : "opacity-80 group-hover:opacity-100"
      }`}
    />
    {!collapsed && <span className="flex-1 truncate">{label}</span>}
    {!collapsed && badge != null && badge !== 0 && (
      <span
        key={badge}
        className="animate-badge-pop ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent-primary text-[10px] font-semibold text-white"
      >
        {badge > 99 ? "99+" : badge}
      </span>
    )}
    {collapsed && badge != null && badge !== 0 && (
      <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-accent-primary" />
    )}
  </button>
);

export default NavItem;
