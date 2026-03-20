/**
 * Priority Utility Functions
 * Handles priority colors and labels
 */

/**
 * Get priority color badge styles
 * Returns object with bg, text colors and label
 */
export const getPriorityColor = (priority) => {
  const priorityMap = {
    HIGH: { bg: "bg-red-500/20", text: "text-red-400", label: "High" },
    MEDIUM: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      label: "Medium",
    },
    LOW: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Low" },
  };
  return (
    priorityMap[priority] || {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      label: "None",
    }
  );
};
