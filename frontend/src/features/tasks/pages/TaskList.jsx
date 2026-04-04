/**
 * TaskList Page Component
 *
 * File: frontend/src/features/tasks/pages/TaskList.jsx
 *
 * Mục đích: Hiển thị danh sách tasks từ API, support CRUD operations
 * Refactored: Tách thành sub-components, hooks, và utilities
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Loader, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "../hooks/useTasks";
import { useTaskFilters } from "../hooks/useTaskFilters";
import TaskToolbar from "../components/TaskToolbar";
import TaskRow from "../components/TaskRow";
import { getPriorityColor } from "../utils/priorityUtils";

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return "";

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const isDateOnlyValue = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeDueAtForApi = (value) => {
  if (!value) return null;

  if (isDateOnlyValue(value)) {
    return value;
  }

  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) {
    return null;
  }

  return dateObj.toISOString();
};

const VALID_SORT_OPTIONS = new Set([
  "none",
  "date-asc",
  "date-desc",
  "priority-high",
  "title",
]);

const VALID_PRIORITY_FILTERS = new Set([
  "all",
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

const VALID_STATUS_FILTERS = new Set(["all", "done", "pending"]);

const TASK_GROUPS = [
  {
    key: "overdue",
    label: "Quá hạn",
    labelClassName: "text-red-300",
  },
  {
    key: "today",
    label: "Hôm nay",
    labelClassName: "text-yellow-300",
  },
  {
    key: "upcoming",
    label: "Sắp tới",
    labelClassName: "text-blue-300",
  },
  {
    key: "no-deadline",
    label: "Không hạn",
    labelClassName: "text-text-tertiary",
  },
];

const toLocalDayStart = (dateObj) =>
  new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

const resolveTaskGroup = (task, todayStart = toLocalDayStart(new Date())) => {
  const dueRaw = task?.dueDate || task?.date;
  if (!dueRaw) {
    return "no-deadline";
  }

  const dueDate = new Date(dueRaw);
  if (Number.isNaN(dueDate.getTime())) {
    return "no-deadline";
  }

  const dueStart = toLocalDayStart(dueDate);
  if (dueStart < todayStart) {
    return "overdue";
  }

  if (dueStart.getTime() === todayStart.getTime()) {
    return "today";
  }

  return "upcoming";
};

const GROUP_COLLAPSE_STORAGE_KEY = "tasks-group-collapse-v1";

const QUICK_TIME_PRESETS = [
  { key: "today", label: "Hôm nay" },
  { key: "tomorrow", label: "Ngày mai 9:00" },
  { key: "weekend", label: "Cuối tuần" },
  { key: "plus-1-hour", label: "+1 giờ" },
  { key: "plus-1-day", label: "+1 ngày" },
];

const toDateInputValue = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateTimeInputValue = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const addMinutes = (dateObj, minutes) =>
  new Date(dateObj.getTime() + minutes * 60 * 1000);

const roundToNextQuarterHour = (dateObj) => {
  const rounded = new Date(dateObj);
  rounded.setSeconds(0, 0);

  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;

  if (roundedMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
    return rounded;
  }

  rounded.setMinutes(roundedMinutes, 0, 0);
  return rounded;
};

const getUpcomingWeekendStart = (baseDate) => {
  const weekend = toLocalDayStart(baseDate);
  const day = weekend.getDay();
  const distanceToSaturday = day <= 6 ? (6 - day + 7) % 7 : 0;

  weekend.setDate(weekend.getDate() + distanceToSaturday);
  weekend.setHours(9, 0, 0, 0);
  return weekend;
};

const readCollapsedGroups = () => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(GROUP_COLLAPSE_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    if (
      !parsedValue ||
      typeof parsedValue !== "object" ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return parsedValue;
  } catch {
    return {};
  }
};

const parseLocalDateTime = (value) => {
  if (!value) {
    return null;
  }

  const dateObj = new Date(value);
  return Number.isNaN(dateObj.getTime()) ? null : dateObj;
};

const parseDueDateForCompare = (value) => {
  if (!value) {
    return null;
  }

  const dateObj = new Date(`${value}T23:59:59`);
  return Number.isNaN(dateObj.getTime()) ? null : dateObj;
};

/**
 * TaskList - Hiển thị danh sách tasks từ API
 */
const TaskList = ({ title = "Danh sách công việc" }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilterState = useMemo(() => {
    const queryValue = searchParams.get("q") || "";
    const sortValue = searchParams.get("sort") || "none";
    const priorityValue = searchParams.get("priority") || "all";
    const statusValue = searchParams.get("status") || "all";

    return {
      searchQuery: queryValue,
      sortBy: VALID_SORT_OPTIONS.has(sortValue) ? sortValue : "none",
      priorityFilter: VALID_PRIORITY_FILTERS.has(priorityValue)
        ? priorityValue
        : "all",
      statusFilter: VALID_STATUS_FILTERS.has(statusValue) ? statusValue : "all",
    };
  }, []);

  const {
    tasks,
    allTasks,
    loading,
    error,
    activeFilter,
    fetchTasks,
    addTask,
    removeTask,
    toggleTask,
    updateTaskData,
    scheduleTaskData,
    setFilter,
  } = useTasks();

  const {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    sortBy,
    setSortBy,
    isSortOpen,
    setIsSortOpen,
    priorityFilter,
    setPriorityFilter,
    isPriorityFilterOpen,
    setIsPriorityFilterOpen,
    filteredTasks,
  } = useTaskFilters(tasks, initialFilterState);

  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [newTaskStartAt, setNewTaskStartAt] = useState("");
  const [newTaskEndAt, setNewTaskEndAt] = useState("");
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [newTaskError, setNewTaskError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editOriginalScheduledAt, setEditOriginalScheduledAt] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [schedulingId, setSchedulingId] = useState(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  const priorityDropdownRef = useRef(null);
  const createTaskSectionRef = useRef(null);
  const newTaskInputRef = useRef(null);
  const hasComposerInteractedRef = useRef(false);
  const isBackendConnectionError =
    typeof error === "string" &&
    (error.toLowerCase().includes("network") ||
      error.toLowerCase().includes("kết nối backend"));

  const groupedTasks = useMemo(() => {
    const buckets = {
      overdue: [],
      today: [],
      upcoming: [],
      "no-deadline": [],
    };

    for (const task of filteredTasks) {
      buckets[resolveTaskGroup(task)].push(task);
    }

    return buckets;
  }, [filteredTasks]);

  const hasVisibleTasks = TASK_GROUPS.some(
    (group) => groupedTasks[group.key].length > 0,
  );

  const startAtDateObj = useMemo(
    () => parseLocalDateTime(newTaskStartAt),
    [newTaskStartAt],
  );
  const endAtDateObj = useMemo(
    () => parseLocalDateTime(newTaskEndAt),
    [newTaskEndAt],
  );
  const dueAtDateObj = useMemo(
    () => parseDueDateForCompare(newTaskDueAt),
    [newTaskDueAt],
  );

  const hasStartEndConflict = Boolean(
    startAtDateObj && endAtDateObj && endAtDateObj < startAtDateObj,
  );
  const hasDueStartConflict = Boolean(
    dueAtDateObj && startAtDateObj && dueAtDateObj < startAtDateObj,
  );
  const hasDueEndConflict = Boolean(
    dueAtDateObj && endAtDateObj && dueAtDateObj < endAtDateObj,
  );

  const composerWarnings = useMemo(() => {
    const warnings = [];

    if (hasStartEndConflict) {
      warnings.push({
        id: "end-before-start",
        text: "End At đang sớm hơn Start At.",
        tone: "error",
      });
    }

    if (hasDueStartConflict) {
      warnings.push({
        id: "due-before-start",
        text: "Due At đang sớm hơn Start At.",
        tone: "warn",
      });
    } else if (hasDueEndConflict) {
      warnings.push({
        id: "due-before-end",
        text: "Due At đang sớm hơn End At.",
        tone: "warn",
      });
    }

    if (!newTaskDueAt && newTaskEndAt) {
      warnings.push({
        id: "due-fallback",
        text: "Chưa chọn Due At, hệ thống sẽ dùng End At làm hạn chót.",
        tone: "info",
      });
    }

    return warnings;
  }, [
    hasStartEndConflict,
    hasDueStartConflict,
    hasDueEndConflict,
    newTaskDueAt,
    newTaskEndAt,
  ]);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (allTasks.length === 0) {
      setIsComposerExpanded(true);
      return;
    }

    if (!hasComposerInteractedRef.current) {
      setIsComposerExpanded(false);
    }
  }, [loading, allTasks.length]);

  useEffect(() => {
    if (initialFilterState.statusFilter !== "all") {
      setFilter(initialFilterState.statusFilter);
    }
  }, [initialFilterState.statusFilter, setFilter]);

  useEffect(() => {
    const next = new URLSearchParams();
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery) {
      next.set("q", trimmedQuery);
    }

    if (sortBy !== "none") {
      next.set("sort", sortBy);
    }

    if (priorityFilter !== "all") {
      next.set("priority", priorityFilter);
    }

    if (activeFilter !== "all") {
      next.set("status", activeFilter);
    }

    if (searchParams.toString() !== next.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    searchQuery,
    sortBy,
    priorityFilter,
    activeFilter,
    searchParams,
    setSearchParams,
  ]);

  // Click outside detection for priority dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target)
      ) {
        setShowPriorityDropdown(false);
      }
    }

    if (showPriorityDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPriorityDropdown]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      GROUP_COLLAPSE_STORAGE_KEY,
      JSON.stringify(collapsedGroups),
    );
  }, [collapsedGroups]);

  const handleOpenCreateTaskComposer = () => {
    hasComposerInteractedRef.current = true;
    setIsComposerExpanded(true);

    window.setTimeout(() => {
      createTaskSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      newTaskInputRef.current?.focus();
    }, 0);
  };

  const handleCollapseComposer = () => {
    hasComposerInteractedRef.current = true;
    setIsComposerExpanded(false);
  };

  const handleAddBlankTask = async () => {
    const titleValue = newTaskText.trim();
    if (!titleValue) {
      setNewTaskError("Vui lòng nhập tiêu đề công việc.");
      handleOpenCreateTaskComposer();
      return;
    }

    const parsedStartAt = newTaskStartAt ? new Date(newTaskStartAt) : null;
    const parsedEndAt = newTaskEndAt ? new Date(newTaskEndAt) : null;

    if (parsedStartAt && Number.isNaN(parsedStartAt.getTime())) {
      setNewTaskError("Start At không hợp lệ.");
      return;
    }

    if (parsedEndAt && Number.isNaN(parsedEndAt.getTime())) {
      setNewTaskError("End At không hợp lệ.");
      return;
    }

    if (parsedStartAt && parsedEndAt && parsedEndAt < parsedStartAt) {
      setNewTaskError("End At phải sau Start At.");
      return;
    }

    const resolvedDueAtInput = newTaskDueAt || newTaskEndAt || null;
    const resolvedDueAt = normalizeDueAtForApi(resolvedDueAtInput);

    if (resolvedDueAtInput && !resolvedDueAt) {
      setNewTaskError("Due At không hợp lệ.");
      return;
    }

    const createdTask = await addTask(titleValue, {
      description: newTaskDescription.trim() || null,
      dueDate: resolvedDueAt,
      startAt: parsedStartAt ? parsedStartAt.toISOString() : null,
      priority: newTaskPriority,
    });

    if (!createdTask) {
      return;
    }

    setNewTaskText("");
    setNewTaskDescription("");
    setNewTaskDueAt("");
    setNewTaskStartAt("");
    setNewTaskEndAt("");
    setIsCreateScheduleOpen(false);
    setNewTaskPriority("MEDIUM");
    setNewTaskError("");
  };

  const handleToggleTask = async (id, currentCompleted) => {
    await toggleTask(id, !currentCompleted);
  };

  const handleDeleteTask = (id) => {
    removeTask(id);
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.title || task.text);
    setEditDescription(task.description || "");
    setEditPriority(task.priority || "MEDIUM");

    if (task.dueDate) {
      const dateObj = new Date(task.dueDate);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      setEditDate(`${year}-${month}-${day}`);
    } else {
      setEditDate("");
    }

    const initialScheduledAt = toDateTimeLocal(task.scheduledAt);
    setEditScheduledAt(initialScheduledAt);
    setEditOriginalScheduledAt(initialScheduledAt);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditDescription("");
    setEditDate("");
    setEditScheduledAt("");
    setEditOriginalScheduledAt("");
    setEditPriority("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) {
      return;
    }

    const titleValue = editText.trim();
    if (!titleValue) {
      return;
    }

    const normalizedEditDueAt = normalizeDueAtForApi(editDate);
    if (editDate && !normalizedEditDueAt) {
      return;
    }

    const didUpdateTask = await updateTaskData(editingId, {
      title: titleValue,
      description: editDescription.trim() || null,
      priority: editPriority || "MEDIUM",
      dueDate: normalizedEditDueAt,
    });

    if (!didUpdateTask) {
      return;
    }

    if (editScheduledAt !== editOriginalScheduledAt) {
      const startAt = editScheduledAt
        ? new Date(editScheduledAt).toISOString()
        : null;
      const didUpdateSchedule = await scheduleTaskData(editingId, startAt);
      if (!didUpdateSchedule) {
        return;
      }
    }

    handleCancelEdit();
  };

  const handleDateChange = async (taskId, newDate) => {
    if (taskId) {
      const normalizedDueAt = normalizeDueAtForApi(newDate);
      if (newDate && !normalizedDueAt) {
        return;
      }

      await updateTaskData(taskId, { dueDate: normalizedDueAt });
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    if (taskId) {
      await updateTaskData(taskId, { priority: newPriority });
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleNewTaskKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddBlankTask();
    }
  };

  const handleScheduleChange = async (taskId, scheduleDateTime) => {
    if (!taskId) return;

    setSchedulingId(taskId);
    await scheduleTaskData(
      taskId,
      scheduleDateTime ? new Date(scheduleDateTime).toISOString() : null,
    );
    setSchedulingId(null);
  };

  const handleApplyQuickPreset = (presetKey) => {
    const now = roundToNextQuarterHour(new Date());

    let startAtValue = null;
    let endAtValue = null;
    let dueAtValue = null;

    if (presetKey === "today") {
      startAtValue = now;
      endAtValue = addMinutes(now, 60);
      dueAtValue = toLocalDayStart(now);
    }

    if (presetKey === "tomorrow") {
      const tomorrowAtNine = toLocalDayStart(new Date());
      tomorrowAtNine.setDate(tomorrowAtNine.getDate() + 1);
      tomorrowAtNine.setHours(9, 0, 0, 0);

      startAtValue = tomorrowAtNine;
      endAtValue = addMinutes(tomorrowAtNine, 60);
      dueAtValue = toLocalDayStart(tomorrowAtNine);
    }

    if (presetKey === "weekend") {
      const weekendStart = getUpcomingWeekendStart(new Date());
      startAtValue = weekendStart;
      endAtValue = addMinutes(weekendStart, 90);
      dueAtValue = toLocalDayStart(weekendStart);
    }

    if (presetKey === "plus-1-hour") {
      startAtValue = addMinutes(now, 60);
      endAtValue = addMinutes(startAtValue, 60);
      dueAtValue = toLocalDayStart(startAtValue);
    }

    if (presetKey === "plus-1-day") {
      startAtValue = addMinutes(now, 24 * 60);
      endAtValue = addMinutes(startAtValue, 60);
      dueAtValue = toLocalDayStart(startAtValue);
    }

    if (!startAtValue || !endAtValue || !dueAtValue) {
      return;
    }

    setNewTaskStartAt(toDateTimeInputValue(startAtValue));
    setNewTaskEndAt(toDateTimeInputValue(endAtValue));
    setNewTaskDueAt(toDateInputValue(dueAtValue));
    setIsCreateScheduleOpen(true);
    setNewTaskError("");
  };

  const handleToggleGroupCollapse = (groupKey) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [groupKey]: !previous[groupKey],
    }));
  };

  const renderTaskRow = (task) => (
    <TaskRow
      key={task.id}
      task={task}
      isEditing={editingId === task.id}
      editText={editText}
      editDescription={editDescription}
      editDate={editDate}
      editScheduledAt={
        editingId === task.id
          ? editScheduledAt
          : toDateTimeLocal(task.scheduledAt)
      }
      editPriority={editPriority}
      onToggle={() => handleToggleTask(task.id, task.completed)}
      onEdit={() => handleStartEdit(task)}
      onEditChange={setEditText}
      onEditDescriptionChange={setEditDescription}
      onEditSave={handleSaveEdit}
      onEditCancel={handleCancelEdit}
      onEditKeyDown={handleEditKeyDown}
      onDelete={() => handleDeleteTask(task.id)}
      onDateChange={(value) => {
        if (editingId === task.id) {
          setEditDate(value);
          return;
        }

        handleDateChange(task.id, value);
      }}
      onScheduleChange={(value) => {
        if (editingId === task.id) {
          setEditScheduledAt(value);
          return;
        }

        handleScheduleChange(task.id, value);
      }}
      onPriorityChange={(priority) => {
        if (editingId === task.id) {
          setEditPriority(priority);
          return;
        }

        handlePriorityChange(task.id, priority);
      }}
      isDeleting={false}
      isScheduling={schedulingId === task.id}
    />
  );

  return (
    <main className="flex-1 overflow-y-auto py-10">
      <div className="mx-auto w-full max-w-3xl px-4 py-0 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-4xl">
            {title}
          </h1>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
            ⚠️ {error}
            {isBackendConnectionError && (
              <p className="mt-1 text-xs text-red-300">
                Gợi ý: chạy backend bằng lệnh npm run dev trong thư mục backend.
              </p>
            )}
            <button
              onClick={() => fetchTasks()}
              className="ml-2 underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}

        <TaskToolbar
          allTasks={allTasks}
          activeFilter={activeFilter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isSearchOpen}
          onSearchOpenChange={setIsSearchOpen}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          isPriorityFilterOpen={isPriorityFilterOpen}
          onPriorityFilterOpenChange={setIsPriorityFilterOpen}
          sortBy={sortBy}
          onSortChange={setSortBy}
          isSortOpen={isSortOpen}
          onSortOpenChange={setIsSortOpen}
          onOpenCreateTask={handleOpenCreateTaskComposer}
          loading={loading}
        />

        {isComposerExpanded && (
          <div
            ref={createTaskSectionRef}
            className="mb-4 rounded-xl border border-border-subtle bg-white/3 p-3 text-text-tertiary"
          >
            <div className="mb-2 flex items-center gap-2">
              <Plus size={14} />
              <input
                ref={newTaskInputRef}
                className="flex-1 border-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
                placeholder="Tiêu đề công việc"
                value={newTaskText}
                onChange={(e) => {
                  setNewTaskText(e.target.value);
                  if (newTaskError) {
                    setNewTaskError("");
                  }
                }}
                onKeyDown={handleNewTaskKeyDown}
                aria-invalid={Boolean(newTaskError)}
              />

              {allTasks.length > 0 && (
                <button
                  type="button"
                  className="rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-white/5"
                  onClick={handleCollapseComposer}
                >
                  Thu gọn
                </button>
              )}
            </div>

            {newTaskError && (
              <p className="mb-2 text-xs text-red-400">{newTaskError}</p>
            )}

            <textarea
              className="w-full resize-none rounded-md border border-border-subtle bg-white/5 p-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              rows={2}
              placeholder="Mô tả (tùy chọn)"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
            />

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-text-tertiary">
                Gợi ý nhanh:
              </span>
              {QUICK_TIME_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="rounded border border-border-subtle bg-white/5 px-2 py-1 text-[11px] text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
                  onClick={() => handleApplyQuickPreset(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                className={`rounded border bg-white/10 px-2 py-1 text-xs ${
                  hasDueStartConflict || hasDueEndConflict
                    ? "border-red-400 text-red-200"
                    : "border-border-subtle text-text-primary"
                }`}
                value={newTaskDueAt}
                onChange={(e) => {
                  setNewTaskDueAt(e.target.value);
                  if (newTaskError) {
                    setNewTaskError("");
                  }
                }}
                title="Due At"
              />

              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs transition-colors ${
                  isCreateScheduleOpen
                    ? "border-accent-primary bg-accent-primary/20 text-white"
                    : "border-border-subtle text-text-secondary hover:bg-white/5"
                }`}
                onClick={() => setIsCreateScheduleOpen((previous) => !previous)}
              >
                Lên lịch
              </button>

              <div ref={priorityDropdownRef} className="relative">
                <button
                  type="button"
                  className={`cursor-pointer rounded border border-border-subtle bg-white/5 px-2 py-1 text-xs transition-colors hover:bg-white/10 focus:border-accent-primary focus:outline-none ${
                    newTaskPriority === "URGENT"
                      ? "text-orange-400"
                      : newTaskPriority === "HIGH"
                        ? "text-red-400"
                        : newTaskPriority === "MEDIUM"
                          ? "text-yellow-400"
                          : "text-blue-400"
                  }`}
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  title="Độ ưu tiên"
                >
                  {getPriorityColor(newTaskPriority).label}
                </button>
                {showPriorityDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-max rounded border border-border-subtle bg-bg-sidebar p-1 text-xs shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskPriority("URGENT");
                        setShowPriorityDropdown(false);
                      }}
                      className={`block whitespace-nowrap rounded px-3 py-1.5 text-left hover:bg-white/5 ${
                        newTaskPriority === "URGENT"
                          ? "bg-white/10 text-orange-400"
                          : "text-orange-400"
                      }`}
                    >
                      Khẩn cấp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskPriority("HIGH");
                        setShowPriorityDropdown(false);
                      }}
                      className={`block whitespace-nowrap rounded px-3 py-1.5 text-left hover:bg-white/5 ${
                        newTaskPriority === "HIGH"
                          ? "bg-white/10 text-red-400"
                          : "text-red-400"
                      }`}
                    >
                      Cao
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskPriority("MEDIUM");
                        setShowPriorityDropdown(false);
                      }}
                      className={`block whitespace-nowrap rounded px-3 py-1.5 text-left hover:bg-white/5 ${
                        newTaskPriority === "MEDIUM"
                          ? "bg-white/10 text-yellow-400"
                          : "text-yellow-400"
                      }`}
                    >
                      Trung bình
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskPriority("LOW");
                        setShowPriorityDropdown(false);
                      }}
                      className={`block whitespace-nowrap rounded px-3 py-1.5 text-left hover:bg-white/5 ${
                        newTaskPriority === "LOW"
                          ? "bg-white/10 text-blue-400"
                          : "text-blue-400"
                      }`}
                    >
                      Thấp
                    </button>
                  </div>
                )}
              </div>

              {newTaskDueAt && (
                <button
                  type="button"
                  className="rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-white/5"
                  onClick={() => setNewTaskDueAt("")}
                >
                  Bỏ hạn chót
                </button>
              )}

              {(newTaskStartAt || newTaskEndAt) && (
                <button
                  type="button"
                  className="rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-white/5"
                  onClick={() => {
                    setNewTaskStartAt("");
                    setNewTaskEndAt("");
                  }}
                >
                  Bỏ khung giờ
                </button>
              )}

              <button
                type="button"
                className="ml-auto rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
                onClick={handleAddBlankTask}
              >
                Thêm công việc
              </button>
            </div>

            {composerWarnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {composerWarnings.map((warning) => (
                  <p
                    key={warning.id}
                    className={`text-[11px] ${
                      warning.tone === "error"
                        ? "text-red-300"
                        : warning.tone === "warn"
                          ? "text-amber-300"
                          : "text-text-tertiary"
                    }`}
                  >
                    {warning.text}
                  </p>
                ))}
              </div>
            )}

            {isCreateScheduleOpen && (
              <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border-subtle bg-white/3 p-2 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  <span>Start At</span>
                  <input
                    type="datetime-local"
                    className={`rounded border bg-white/10 px-2 py-1 text-text-primary ${
                      hasStartEndConflict || hasDueStartConflict
                        ? "border-red-400"
                        : "border-border-subtle"
                    }`}
                    value={newTaskStartAt}
                    onChange={(e) => {
                      setNewTaskStartAt(e.target.value);
                      if (newTaskError) {
                        setNewTaskError("");
                      }
                    }}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  <span>End At</span>
                  <input
                    type="datetime-local"
                    className={`rounded border bg-white/10 px-2 py-1 text-text-primary ${
                      hasStartEndConflict || hasDueEndConflict
                        ? "border-red-400"
                        : "border-border-subtle"
                    }`}
                    value={newTaskEndAt}
                    onChange={(e) => {
                      setNewTaskEndAt(e.target.value);
                      if (newTaskError) {
                        setNewTaskError("");
                      }
                    }}
                  />
                </label>

                <p className="text-[11px] text-text-tertiary md:col-span-2">
                  Due At là hạn chót của task. Nếu chưa chọn Due At, hệ thống sẽ
                  dùng End At làm hạn chót.
                </p>
              </div>
            )}
          </div>
        )}

        {loading && !tasks.length && (
          <div className="flex items-center justify-center py-20">
            <Loader size={32} className="animate-spin text-text-tertiary" />
          </div>
        )}

        <div className="bg-transparent">
          {hasVisibleTasks ? (
            TASK_GROUPS.map((group) => {
              const tasksInGroup = groupedTasks[group.key];
              if (tasksInGroup.length === 0) {
                return null;
              }

              const isCollapsed = Boolean(collapsedGroups[group.key]);

              return (
                <section key={group.key} className="mb-4">
                  <button
                    type="button"
                    className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 transition-colors hover:bg-white/5"
                    onClick={() => handleToggleGroupCollapse(group.key)}
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide ${group.labelClassName}`}
                    >
                      {group.label} ({tasksInGroup.length})
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-text-tertiary transition-transform ${
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-1">
                      {tasksInGroup.map((task) => renderTaskRow(task))}
                    </div>
                  )}
                </section>
              );
            })
          ) : (
            <div className="text-center py-10">
              <p className="text-text-tertiary text-sm">
                Chưa có công việc phù hợp
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default TaskList;
