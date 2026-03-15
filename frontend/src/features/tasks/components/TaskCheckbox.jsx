import React from "react";

/**
 * TaskCheckbox Component
 * Checkbox to toggle task completion status
 */
const TaskCheckbox = ({ checked, onChange }) => (
  <button
    type="button"
    className={`w-4.5 h-4.5 border-2 rounded flex items-center justify-center shrink-0 transition-all cursor-pointer text-xs ${
      checked
        ? "bg-accent-primary border-accent-primary text-white"
        : "border-neutral-600 hover:border-accent-primary"
    }`}
    onClick={onChange}
    aria-label={checked ? "Mark as incomplete" : "Mark as complete"}
  >
    {checked && <span>✓</span>}
  </button>
);

export default TaskCheckbox;
