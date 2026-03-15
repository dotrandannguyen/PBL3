/**
 * Date Utility Functions
 * Handles date formatting and conversions for tasks
 */

/**
 * Format date từ ISO string hoặc DateTime object → Human readable
 * Input: "2026-01-10" hoặc new Date() hoặc "2026-03-14T10:30:00.000Z"
 * Output: "January 10, 2026"
 */
export const formatDate = (date) => {
  if (!date) return "No date";
  const options = { month: "long", day: "numeric", year: "numeric" };
  try {
    // Handle string dates (ISO format or simple date string)
    let dateObj = typeof date === "string" ? new Date(date) : date;

    // Validate date object
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
      return "Invalid date";
    }

    return dateObj.toLocaleDateString("en-US", options);
  } catch (err) {
    console.error("Date formatting error:", err);
    return "Invalid date";
  }
};

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * Used for new tasks default date
 */
export const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

/**
 * Format date to ISO format (YYYY-MM-DD) for HTML date input
 * Input: ISO string "2026-01-10" or DateTime "2026-03-14T10:30:00.000Z"
 * Output: "2026-01-10"
 */
export const formatDateToISO = (date) => {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!(dateObj instanceof Date) || isNaN(dateObj)) return "";

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};
