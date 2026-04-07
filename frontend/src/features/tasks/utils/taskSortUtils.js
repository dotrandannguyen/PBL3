/**
 * Task Sorting Utility Functions
 * Handles different sorting strategies for tasks
 */

/**
 * Sort tasks by selected criteria
 * @param {Array} tasks - Array of tasks to sort
 * @param {string} sortBy - Sort criteria: 'date-asc', 'date-desc', 'priority-high', 'title', 'none'
 * @returns {Array} Sorted tasks array
 */
export const sortTasks = (tasks, sortBy) => {
  if (!tasks) return [];
  const sorted = [...tasks];

  switch (sortBy) {
    case "date-asc":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.dueDate || "9999-12-31");
        const dateB = new Date(b.dueDate || "9999-12-31");
        return dateA - dateB;
      });
    case "date-desc":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.dueDate || "0000-01-01");
        const dateB = new Date(b.dueDate || "0000-01-01");
        return dateB - dateA;
      });
    case "priority-high":
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return sorted.sort((a, b) => {
        const aP = priorityOrder[a.priority] ?? 4;
        const bP = priorityOrder[b.priority] ?? 4;
        return aP - bP;
      });
    case "title":
      return sorted.sort((a, b) => {
        const aTitle = (a.title || a.text || "").toLowerCase();
        const bTitle = (b.title || b.text || "").toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    default:
      return sorted;
  }
};
