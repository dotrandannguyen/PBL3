import React, { useRef, useEffect } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Maximize2,
  MoreHorizontal,
  ChevronDown,
  ListFilter,
} from "lucide-react";
import TabButton from "./TabButton";
import ToolbarButton from "./ToolbarButton";

/**
 * TaskToolbar Component
 * Contains filter tabs, search, priority filter, sort, and add button
 */
const TaskToolbar = ({
  allTasks,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onSearchOpenChange,
  priorityFilter,
  onPriorityFilterChange,
  isPriorityFilterOpen,
  onPriorityFilterOpenChange,
  sortBy,
  onSortChange,
  isSortOpen,
  onSortOpenChange,
  onAddNewTask,
  loading,
}) => {
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const searchRef = useRef(null);

  // Click outside detection for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        onPriorityFilterOpenChange(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        onSortOpenChange(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        if (!searchQuery) {
          onSearchOpenChange(false);
        }
      }
    }

    if (isPriorityFilterOpen || isSortOpen || isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [
    isPriorityFilterOpen,
    isSortOpen,
    isSearchOpen,
    searchQuery,
    onPriorityFilterOpenChange,
    onSortOpenChange,
    onSearchOpenChange,
  ]);

  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
      <div className="flex gap-1">
        {/* Filter Tabs: All, Done, Pending - with counts */}
        <TabButton
          icon={ListFilter}
          label={`All (${allTasks.length})`}
          isActive={activeFilter === "all"}
          onClick={() => onFilterChange("all")}
        />
        <TabButton
          label={`Done (${allTasks.filter((t) => t.completed === true).length})`}
          isActive={activeFilter === "done"}
          onClick={() => onFilterChange("done")}
        />
        <TabButton
          label={`Pending (${allTasks.filter((t) => t.completed !== true).length})`}
          isActive={activeFilter === "pending"}
          onClick={() => onFilterChange("pending")}
        />
      </div>

      <div ref={searchRef} className="flex items-center gap-1">
        {/* Search Input */}
        {isSearchOpen ? (
          <div className="flex items-center gap-1 bg-neutral-700 rounded px-2 py-1 mr-2">
            <Search size={14} className="text-neutral-500" />
            <input
              autoFocus
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onBlur={() => !searchQuery && onSearchOpenChange(false)}
              className="bg-transparent border-none text-white px-2 py-1 text-xs w-40 outline-none placeholder-neutral-600"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange("");
                  onSearchOpenChange(false);
                }}
                className="bg-transparent border-none text-neutral-500 cursor-pointer hover:text-white transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div onClick={() => onSearchOpenChange(true)}>
            <ToolbarButton icon={Search} name="search" />
          </div>
        )}

        <div ref={filterRef} className="relative">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            onClick={() => onPriorityFilterOpenChange(!isPriorityFilterOpen)}
            title="Filter by priority"
          >
            <Filter size={14} />
          </button>
          {isPriorityFilterOpen && (
            <div className="absolute top-full right-0 mt-1 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-1 text-xs z-20">
              <button
                onClick={() => {
                  onPriorityFilterChange("all");
                  onPriorityFilterOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded ${
                  priorityFilter === "all" ? "bg-white/10" : ""
                }`}
              >
                All Priorities
              </button>
              <button
                onClick={() => {
                  onPriorityFilterChange("HIGH");
                  onPriorityFilterOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-red-400 ${
                  priorityFilter === "HIGH" ? "bg-white/10" : ""
                }`}
              >
                High Priority
              </button>
              <button
                onClick={() => {
                  onPriorityFilterChange("MEDIUM");
                  onPriorityFilterOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-yellow-400 ${
                  priorityFilter === "MEDIUM" ? "bg-white/10" : ""
                }`}
              >
                Medium Priority
              </button>
              <button
                onClick={() => {
                  onPriorityFilterChange("LOW");
                  onPriorityFilterOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-blue-400 ${
                  priorityFilter === "LOW" ? "bg-white/10" : ""
                }`}
              >
                Low Priority
              </button>
            </div>
          )}
        </div>

        <div ref={sortRef} className="relative">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            onClick={() => onSortOpenChange(!isSortOpen)}
            title="Sort tasks"
          >
            <ArrowUpDown size={14} />
          </button>
          {isSortOpen && (
            <div className="absolute top-full right-0 mt-1 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-1 text-xs z-20">
              <button
                onClick={() => {
                  onSortChange("date-asc");
                  onSortOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded ${
                  sortBy === "date-asc" ? "bg-white/10" : ""
                }`}
              >
                Date: Earliest First
              </button>
              <button
                onClick={() => {
                  onSortChange("date-desc");
                  onSortOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded ${
                  sortBy === "date-desc" ? "bg-white/10" : ""
                }`}
              >
                Date: Latest First
              </button>
              <button
                onClick={() => {
                  onSortChange("priority-high");
                  onSortOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded ${
                  sortBy === "priority-high" ? "bg-white/10" : ""
                }`}
              >
                Priority: High First
              </button>
              <button
                onClick={() => {
                  onSortChange("title");
                  onSortOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded ${
                  sortBy === "title" ? "bg-white/10" : ""
                }`}
              >
                Ⓐ A-Z Sort
              </button>
              <button
                onClick={() => {
                  onSortChange("none");
                  onSortOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded ${
                  sortBy === "none" ? "bg-white/10" : ""
                }`}
              >
                ✕ No Sort
              </button>
            </div>
          )}
        </div>

        <ToolbarButton icon={Maximize2} name="expand" />
        <ToolbarButton icon={MoreHorizontal} name="more" />

        {/* Add New Button */}
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent-primary text-white text-xs font-medium cursor-pointer hover:bg-accent-hover transition-colors ml-2 disabled:opacity-50"
          onClick={onAddNewTask}
          disabled={loading}
        >
          New
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
};

export default TaskToolbar;
