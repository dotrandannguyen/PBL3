import React from "react";

/**
 * ToolbarButton Component
 * Generic icon button for toolbar
 */
const ToolbarButton = ({ icon: Icon, name }) => (
  <button
    type="button"
    className="p-1.5 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
    title={name}
  >
    <Icon size={14} />
  </button>
);

export default ToolbarButton;
