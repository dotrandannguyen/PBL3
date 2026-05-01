import React from "react";

const NavItem = ({ icon: Icon, label, onClick, isActive = false, badge = null }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group w-full flex items-center px-3.5 py-1.5 bg-transparent border-0 text-sm font-medium text-left cursor-pointer transition-all duration-150 active:scale-[0.98] ${
      isActive
        ? "bg-white/5 text-text-primary"
        : "text-text-secondary hover:bg-white/3 hover:text-text-primary"
    }`}
  >
    <Icon
      size={16}
      className={`mr-2.5 transition-transform duration-150 ${
        isActive ? "opacity-100 scale-105" : "opacity-80 group-hover:opacity-100"
      }`}
    />
    <span className="flex-1 truncate">{label}</span>
    {badge != null && badge !== 0 && (
      <span
        key={badge}
        className="animate-badge-pop ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent-primary text-[10px] font-semibold text-white"
      >
        {badge > 99 ? "99+" : badge}
      </span>
    )}
  </button>
);

export default NavItem;
