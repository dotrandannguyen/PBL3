import React, { useRef, useEffect } from "react";
import { Search, Filter, ArrowUpDown, ListFilter } from "lucide-react";
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
  onOpenCreateTask,
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
    <div className="mb-3 flex flex-col gap-2 border-b border-border-subtle pb-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-1">
        {/* Filter Tabs: All, Done, Pending - with counts */}
        <TabButton
          icon={ListFilter}
          label={`Tất cả (${allTasks.length})`}
          isActive={activeFilter === "all"}
          onClick={() => onFilterChange("all")}
        />
        <TabButton
          label={`Hoàn thành (${allTasks.filter((t) => t.completed === true).length})`}
          isActive={activeFilter === "done"}
          onClick={() => onFilterChange("done")}
        />
        <TabButton
          label={`Chưa làm (${allTasks.filter((t) => t.completed !== true).length})`}
          isActive={activeFilter === "pending"}
          onClick={() => onFilterChange("pending")}
        />
      </div>

      <div
        ref={searchRef}
        className="flex flex-wrap items-center justify-end gap-1"
      >
        {/* Search Input */}
        {isSearchOpen ? (
          <div className="mr-2 flex items-center gap-1 rounded bg-neutral-700 px-2 py-1">
            <Search size={14} className="text-neutral-500" />
            <input
              autoFocus
              placeholder="Tìm công việc..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onBlur={() => !searchQuery && onSearchOpenChange(false)}
              className="w-32 border-none bg-transparent px-2 py-1 text-xs text-white outline-none placeholder-neutral-600 sm:w-44"
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
          <ToolbarButton
            icon={Search}
            name="Tìm kiếm"
            onClick={() => onSearchOpenChange(true)}
          />
        )}

        <div ref={filterRef} className="relative">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            onClick={() => onPriorityFilterOpenChange(!isPriorityFilterOpen)}
            title="Lọc theo độ ưu tiên"
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
                Tất cả mức ưu tiên
              </button>
              <button
                onClick={() => {
                  onPriorityFilterChange("URGENT");
                  onPriorityFilterOpenChange(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-orange-400 ${
                  priorityFilter === "URGENT" ? "bg-white/10" : ""
                }`}
              >
                Khẩn cấp
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
                Cao
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
                Trung bình
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
                Thấp
              </button>
            </div>
          )}
        </div>

        <div ref={sortRef} className="relative">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            onClick={() => onSortOpenChange(!isSortOpen)}
            title="Sắp xếp"
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
                Hạn gần nhất trước
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
                Hạn xa nhất trước
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
                Ưu tiên cao trước
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
                Tên A-Z
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
                Không sắp xếp
              </button>
            </div>
          )}
        </div>

        {/* Add New Button */}
        <button
          type="button"
          className="ml-2 rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          onClick={onOpenCreateTask}
          disabled={loading}
        >
          Tạo mới
        </button>
      </div>
    </div>
  );
};

export default TaskToolbar;
