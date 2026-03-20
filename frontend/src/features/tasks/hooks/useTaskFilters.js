import { useState } from "react";
import { sortTasks } from "../utils/taskSortUtils";

/**
 * useTaskFilters Hook
 * Manages search, sort, and filter state for tasks
 * Returns filtered/sorted tasks and handler functions
 */
export const useTaskFilters = (tasks) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState("none");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);

  // Apply search and priority filters
  let filteredTasks = tasks.filter((task) => {
    // Filter by search query
    if (
      searchQuery &&
      !(task.title || task.text)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    // Filter by priority
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  // Apply sorting
  filteredTasks = sortTasks(filteredTasks, sortBy);

  return {
    // State values
    searchQuery,
    isSearchOpen,
    sortBy,
    isSortOpen,
    priorityFilter,
    isPriorityFilterOpen,
    // Filtered/sorted tasks
    filteredTasks,
    // Handlers
    setSearchQuery,
    setIsSearchOpen,
    setSortBy,
    setIsSortOpen,
    setPriorityFilter,
    setIsPriorityFilterOpen,
  };
};
