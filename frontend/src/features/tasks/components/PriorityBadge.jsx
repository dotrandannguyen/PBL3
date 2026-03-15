import React from "react";
import { getPriorityColor } from "../utils/priorityUtils";

/**
 * PriorityBadge Component
 * Display priority level with color coding
 */
const PriorityBadge = ({ priority }) => {
  if (!priority) return null;
  const colors = getPriorityColor(priority);
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text} font-medium`}
    >
      {colors.label}
    </span>
  );
};

export default PriorityBadge;
