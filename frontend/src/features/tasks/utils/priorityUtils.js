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
    URGENT: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      label: "Khẩn cấp",
    },
    HIGH: { bg: "bg-red-500/20", text: "text-red-400", label: "Cao" },
    MEDIUM: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      label: "Trung bình",
    },
    LOW: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Thấp" },
  };
  return (
    priorityMap[priority] || {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      label: "Không ưu tiên",
    }
  );
};
