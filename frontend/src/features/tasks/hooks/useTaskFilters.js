import { useMemo, useState } from "react";
import { sortTasks } from "../utils/taskSortUtils";

const ALLOWED_SORT_OPTIONS = new Set([
  "none",
  "date-asc",
  "date-desc",
  "priority-high",
  "title",
]);

const ALLOWED_PRIORITY_FILTERS = new Set([
  "all",
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

const normalizeSortValue = (value) =>
  ALLOWED_SORT_OPTIONS.has(value) ? value : "none";

const normalizePriorityFilterValue = (value) =>
  ALLOWED_PRIORITY_FILTERS.has(value) ? value : "all";

/**
 * useTaskFilters Hook
 * Manages search, sort, and filter state for tasks
 * Returns filtered/sorted tasks and handler functions
 */
export const useTaskFilters = (tasks, initialState = {}) => {
  const initialSearchQuery =
    typeof initialState.searchQuery === "string"
      ? initialState.searchQuery
      : "";
  const initialSortBy = normalizeSortValue(initialState.sortBy);
  const initialPriorityFilter = normalizePriorityFilterValue(
    initialState.priorityFilter,
  );

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(initialSearchQuery));
  const [sortBy, setSortByState] = useState(initialSortBy);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [priorityFilter, setPriorityFilterState] = useState(
    initialPriorityFilter,
  );
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);

  const setSortBy = (value) => {
    setSortByState(normalizeSortValue(value));
  };

  const setPriorityFilter = (value) => {
    setPriorityFilterState(normalizePriorityFilterValue(value));
  };

  const filteredTasks = useMemo(() => {
    let nextTasks = tasks.filter((task) => {
      const searchableText = `${task.title || task.text || ""} ${task.description || ""}`;

      // Filter by search query
      if (
        searchQuery &&
        !searchableText.toLowerCase().includes(searchQuery.toLowerCase())
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
    nextTasks = sortTasks(nextTasks, sortBy);
    return nextTasks;
  }, [tasks, searchQuery, priorityFilter, sortBy]);

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
