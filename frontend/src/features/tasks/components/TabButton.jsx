import React from "react";

/**
 * TabButton Component
 * Used for filter tabs: All, Done, Pending
 */
const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    type="button"
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-transparent transition-all cursor-pointer ${
      isActive
        ? "bg-white/5 border-border-focused text-text-primary"
        : "text-text-secondary hover:bg-white/3"
    }`}
    onClick={onClick}
  >
    {Icon ? <Icon size={14} /> : <span>✓</span>}
    <span>{label}</span>
  </button>
);

export default TabButton;
