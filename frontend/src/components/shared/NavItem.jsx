import React from "react";

const NavItem = ({ icon: Icon, label, onClick, isActive = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center px-3.5 py-1 bg-transparent border-0 text-sm font-medium text-left cursor-pointer transition-colors ${
      isActive
        ? "bg-white/5 text-text-primary"
        : "text-text-secondary hover:bg-white/3 hover:text-text-primary"
    }`}
  >
    <Icon size={16} className="mr-2.5 opacity-80" />
    <span>{label}</span>
  </button>
);

export default NavItem;
