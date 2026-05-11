/**
 * TaskList Page Component
 *
 * File: frontend/src/features/tasks/pages/TaskList.jsx
 *
 * Mục đích: Hiển thị danh sách tasks từ API, support CRUD operations
 * Refactored: Tách thành sub-components, hooks, và utilities
 *
 * MERGE: Logic từ incoming (scheduling, grouping, composer, URL params)
 *        UI từ HEAD (Notion-style rows, RenderPriorityPill, TaskSlideOver)
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, ChevronDown, Flag, Check, Calendar, Bell, FileText, X, Clock } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, useDroppable } from "@dnd-kit/core";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "../hooks/useTasks";
import { useTaskFilters } from "../hooks/useTaskFilters";
import TaskToolbar from "../components/TaskToolbar";
import TaskRow from "../components/TaskRow";
import TaskSlideOver from "../components/TaskSlideOver";
import { SkeletonList } from "@/components/shared";

/* ── Priority flag styles (shared UI) ──────────────────────────────────── */
const PRIORITY_FLAG_STYLES = {
  HIGH: { color: "text-red-400", label: "Cao" },
  MEDIUM: { color: "text-yellow-400", label: "Trung bình" },
  LOW: { color: "text-blue-400", label: "Thấp" },
};

/* ── Utility helpers (logic from incoming) ─────────────────────────────── */
const isDateOnlyValue = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isDatetimeLocalValue = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);

const normalizeDueAtForApi = (value) => {
  if (!value) return null;
  if (isDateOnlyValue(value)) return value;
  if (isDatetimeLocalValue(value)) {
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString();
  }
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString();
};

const VALID_SORT_OPTIONS = new Set([
  "none", "date-asc", "date-desc", "priority-high", "title",
]);
const VALID_PRIORITY_FILTERS = new Set(["all", "URGENT", "HIGH", "MEDIUM", "LOW"]);
const VALID_STATUS_FILTERS = new Set(["all", "done", "pending"]);

const TASK_GROUPS = [
  { key: "overdue", label: "Quá hạn", labelClassName: "text-red-300" },
  { key: "today", label: "Hôm nay", labelClassName: "text-yellow-300" },
  { key: "upcoming", label: "Sắp tới", labelClassName: "text-blue-300" },
  { key: "no-deadline", label: "Không hạn", labelClassName: "text-text-tertiary" },
];

const toLocalDayStart = (dateObj) =>
  new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

const resolveTaskGroup = (task, todayStart = toLocalDayStart(new Date())) => {
  const dueRaw = task?.dueDate || task?.date;
  if (!dueRaw) return "no-deadline";
  const dueDate = new Date(dueRaw);
  if (Number.isNaN(dueDate.getTime())) return "no-deadline";
  const dueStart = toLocalDayStart(dueDate);
  if (dueStart < todayStart) return "overdue";
  if (dueStart.getTime() === todayStart.getTime()) return "today";
  return "upcoming";
};

const GROUP_COLLAPSE_STORAGE_KEY = "tasks-group-collapse-v1";

const toDateInputValue = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readCollapsedGroups = () => {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(GROUP_COLLAPSE_STORAGE_KEY);
    if (!rawValue) return {};
    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) return {};
    return parsedValue;
  } catch {
    return {};
  }
};

const parseDueDateForCompare = (value) => {
  if (!value) return null;
  if (isDateOnlyValue(value)) {
    const dateObj = new Date(`${value}T23:59:59`);
    return Number.isNaN(dateObj.getTime()) ? null : dateObj;
  }
  const dateObj = new Date(value);
  return Number.isNaN(dateObj.getTime()) ? null : dateObj;
};

const REMINDER_OFFSETS = {
  NONE: null,
  MINUTES_5: -5,
  MINUTES_15: -15,
  HOUR_1: -60,
};

const computeReminderAt = (preset, dueValue) => {
  if (!preset || preset === "NONE") return null;
  if (!dueValue) return null;
  const offset = REMINDER_OFFSETS[preset];
  if (offset == null) return null;
  const dueDate = new Date(dueValue);
  if (Number.isNaN(dueDate.getTime())) return null;
  const reminderDate = new Date(dueDate.getTime() + offset * 60 * 1000);
  if (reminderDate.getTime() <= Date.now()) return null;
  return reminderDate.toISOString();
};

const GroupDropZone = ({ group, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: group.key,
  });

  return (
    <div ref={setNodeRef} className={`rounded-xl transition-colors ${isOver ? 'bg-accent-primary/5 ring-1 ring-accent-primary' : ''}`}>
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════ */
/*  TaskList Component                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */
const TaskList = ({ title = "To Do List", workspaceId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilterState = useMemo(() => {
    const queryValue = searchParams.get("q") || "";
    const sortValue = searchParams.get("sort") || "none";
    const priorityValue = searchParams.get("priority") || "all";
    const statusValue = searchParams.get("status") || "all";
    return {
      searchQuery: queryValue,
      sortBy: VALID_SORT_OPTIONS.has(sortValue) ? sortValue : "none",
      priorityFilter: VALID_PRIORITY_FILTERS.has(priorityValue) ? priorityValue : "all",
      statusFilter: VALID_STATUS_FILTERS.has(statusValue) ? statusValue : "all",
    };
  }, []);

  const {
    tasks, allTasks, loading, error, activeFilter,
    fetchTasks, addTask, removeTask, toggleTask,
    updateTaskData, setFilter,
    pagination,
  } = useTasks();

  const {
    searchQuery, setSearchQuery,
    isSearchOpen, setIsSearchOpen,
    sortBy, setSortBy,
    isSortOpen, setIsSortOpen,
    priorityFilter, setPriorityFilter,
    isPriorityFilterOpen, setIsPriorityFilterOpen,
    filteredTasks,
  } = useTaskFilters(tasks, initialFilterState);

  // ── State ──────────────────────────────────────────────
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(pagination?.limit || 14);

  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [newTaskError, setNewTaskError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editReminder, setEditReminder] = useState(undefined);
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskReminder, setNewTaskReminder] = useState("NONE");
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [newTaskStartAt, setNewTaskStartAt] = useState("");
  const [newTaskEndAt, setNewTaskEndAt] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups);
  const [collapsedTasks, setCollapsedTasks] = useState(new Set());
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const priorityDropdownRef = useRef(null);
  const reminderDropdownRef = useRef(null);
  const dateInputRef = useRef(null);
  const createTaskSectionRef = useRef(null);
  const newTaskInputRef = useRef(null);
  const hasComposerInteractedRef = useRef(false);

  const isBackendConnectionError =
    typeof error === "string" &&
    (error.toLowerCase().includes("network") ||
      error.toLowerCase().includes("kết nối backend"));

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // ── Derived / Memos ────────────────────────────────────
  const taskMap = useMemo(() => {
    const map = new Map();
    filteredTasks.forEach(t => map.set(t.id, { ...t, children: [] }));
    filteredTasks.forEach(t => {
      if (t.parentId && map.has(t.parentId)) {
        map.get(t.parentId).children.push(map.get(t.id));
      }
    });
    return map;
  }, [filteredTasks]);

  const rootTasks = useMemo(() => {
    const roots = [];
    taskMap.forEach(t => {
      if (!t.parentId || !taskMap.has(t.parentId)) {
        roots.push(t);
      }
    });
    return roots;
  }, [taskMap]);

  const groupedTasks = useMemo(() => {
    const buckets = { overdue: [], today: [], upcoming: [], "no-deadline": [] };
    for (const task of rootTasks) {
      buckets[resolveTaskGroup(task)].push(task);
    }
    return buckets;
  }, [rootTasks]);

  const hasVisibleTasks = TASK_GROUPS.some(
    (group) => groupedTasks[group.key].length > 0,
  );

  const dueAtDateObj = useMemo(() => parseDueDateForCompare(newTaskDueAt), [newTaskDueAt]);

  const isDueAtInPast = useMemo(() => {
    if (!dueAtDateObj) return false;
    const todayStart = toLocalDayStart(new Date());
    return toLocalDayStart(dueAtDateObj) < todayStart;
  }, [dueAtDateObj]);

  const composerWarnings = useMemo(() => {
    const warnings = [];
    const now = new Date();

    // ─── Due date warnings ───────────────────────────────────
    if (isDueAtInPast) {
      warnings.push({ id: "due-in-past", text: "Chú ý: Hạn chót đang ở quá khứ.", tone: "info" });
    }

    if (dueAtDateObj) {
      // Due date is today
      const todayStart = toLocalDayStart(now);
      const dueStart = toLocalDayStart(dueAtDateObj);
      if (dueStart.getTime() === todayStart.getTime()) {
        warnings.push({ id: "due-today", text: "Chú ý: Hạn chót là hôm nay — hãy ưu tiên task này.", tone: "info" });
      }

      // Due date on weekend
      const dueDay = dueAtDateObj.getDay();
      if (dueDay === 0 || dueDay === 6) {
        warnings.push({ id: "due-weekend", text: "Chú ý: Hạn chót rơi vào cuối tuần.", tone: "info" });
      }

      // Due date very far (> 90 days)
      const diffDays = Math.ceil((dueAtDateObj - now) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        warnings.push({ id: "due-far", text: `Gợi ý: Hạn chót còn ${diffDays} ngày — cân nhắc chia nhỏ task.`, tone: "tip" });
      }

      // Late night due (22:00 - 05:59)
      const dueHour = dueAtDateObj.getHours();
      if (dueHour >= 22 || dueHour < 6) {
        warnings.push({ id: "due-late-night", text: "Chú ý: Hạn chót vào ban đêm (sau 22:00).", tone: "info" });
      }
    }

    // ─── Schedule warnings ────────────────────────────────────
    if (showSchedule) {
      const startObj = newTaskStartAt ? new Date(newTaskStartAt) : null;
      const endObj = newTaskEndAt ? new Date(newTaskEndAt) : null;

      // Start in the past
      if (startObj && startObj < now) {
        warnings.push({ id: "start-past", text: "Lỗi: Thời gian bắt đầu đã qua.", tone: "error" });
      }

      // End before start
      if (startObj && endObj && endObj <= startObj) {
        warnings.push({ id: "end-before-start", text: "Lỗi: Thời gian kết thúc phải sau thời gian bắt đầu.", tone: "error" });
      }

      // Duration too short (< 5 min)
      if (startObj && endObj && endObj > startObj) {
        const durationMin = (endObj - startObj) / (1000 * 60);
        if (durationMin < 5) {
          warnings.push({ id: "too-short", text: "Lỗi: Thời lượng dưới 5 phút — có thể quá ngắn.", tone: "error" });
        }
        // Duration very long (> 8 hours)
        if (durationMin > 480) {
          const hours = Math.round(durationMin / 60);
          warnings.push({ id: "too-long", text: `Gợi ý: Thời lượng ${hours} giờ — cân nhắc chia thành nhiều phiên.`, tone: "tip" });
        }
      }

      // Schedule on weekend
      if (startObj) {
        const startDay = startObj.getDay();
        if (startDay === 0 || startDay === 6) {
          warnings.push({ id: "schedule-weekend", text: "Chú ý: Lịch hẹn rơi vào cuối tuần.", tone: "info" });
        }
        // Late night schedule
        const startHour = startObj.getHours();
        if (startHour >= 22 || startHour < 6) {
          warnings.push({ id: "schedule-late-night", text: "Chú ý: Lịch hẹn vào ban đêm (sau 22:00).", tone: "info" });
        }
      }

      // Missing one of start/end
      if (startObj && !endObj) {
        warnings.push({ id: "no-end", text: "Chú ý: Chưa chọn thời gian kết thúc.", tone: "info" });
      }
      if (!startObj && endObj) {
        warnings.push({ id: "no-start", text: "Chú ý: Chưa chọn thời gian bắt đầu.", tone: "info" });
      }

      // Schedule vs dueDate constraint
      if (dueAtDateObj) {
        if (startObj && startObj > dueAtDateObj) {
          warnings.push({ id: "start-after-due", text: "Lỗi: Thời gian bắt đầu không được sau hạn chót.", tone: "error" });
        }
        if (endObj && endObj > dueAtDateObj) {
          warnings.push({ id: "end-after-due", text: "Lỗi: Thời gian kết thúc không được sau hạn chót.", tone: "error" });
        }
      }
    }

    // ─── Reminder warnings ───────────────────────────────────
    if (newTaskReminder !== "NONE" && !newTaskDueAt && !showSchedule) {
      warnings.push({ id: "reminder-no-due", text: "Chú ý: Bật nhắc nhở nhưng chưa đặt hạn chót — nhắc nhở sẽ không hoạt động.", tone: "info" });
    }

    // ─── Title warnings ──────────────────────────────────────
    const titleTrimmed = newTaskText.trim();
    if (titleTrimmed.length > 0 && titleTrimmed.length < 3) {
      warnings.push({ id: "title-short", text: "Gợi ý: Tiêu đề quá ngắn — hãy mô tả rõ hơn.", tone: "tip" });
    }

    // Duplicate title check
    if (titleTrimmed.length >= 3) {
      const lowerTitle = titleTrimmed.toLowerCase();
      const duplicate = allTasks.find(
        (t) => (t.title || t.text || "").toLowerCase() === lowerTitle
      );
      if (duplicate) {
        warnings.push({
          id: "dup-title",
          text: `Chú ý: Đã tồn tại task "${duplicate.title || duplicate.text}" — có thể bị trùng.`,
          tone: "info",
        });
      }
    }

    return warnings;
  }, [
    isDueAtInPast, dueAtDateObj, newTaskDueAt,
    showSchedule, newTaskStartAt, newTaskEndAt,
    newTaskReminder, newTaskText, allTasks,
  ]);

  // Blocking errors = error | warn → cannot submit
  const hasBlockingErrors = useMemo(
    () => composerWarnings.some((w) => w.tone === "error" || w.tone === "warn"),
    [composerWarnings],
  );

  // ── Effects ────────────────────────────────────────────
  useEffect(() => {
    fetchTasks({ page, limit, workspaceId });
  }, [fetchTasks, page, limit, workspaceId]);

  useEffect(() => {
    if (loading) return;
    if (allTasks.length === 0) { setIsComposerExpanded(true); return; }
    if (!hasComposerInteractedRef.current) setIsComposerExpanded(false);
  }, [loading, allTasks.length]);

  useEffect(() => {
    if (initialFilterState.statusFilter !== "all") setFilter(initialFilterState.statusFilter);
  }, [initialFilterState.statusFilter, setFilter]);

  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    const next = new URLSearchParams();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) next.set("q", trimmedQuery);
    if (sortBy !== "none") next.set("sort", sortBy);
    if (priorityFilter !== "all") next.set("priority", priorityFilter);
    if (activeFilter !== "all") next.set("status", activeFilter);
    if (searchParams.toString() !== next.toString()) setSearchParams(next, { replace: true });
  }, [searchQuery, sortBy, priorityFilter, activeFilter, searchParams, setSearchParams]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
        setShowPriorityDropdown(false);
      }
      if (reminderDropdownRef.current && !reminderDropdownRef.current.contains(event.target)) {
        setShowReminderDropdown(false);
      }
    }
    if (showPriorityDropdown || showReminderDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPriorityDropdown, showReminderDropdown]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GROUP_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  // ── Handlers ───────────────────────────────────────────
  const handleOpenCreateTaskComposer = () => {
    hasComposerInteractedRef.current = true;
    setIsComposerExpanded(true);
    window.setTimeout(() => {
      createTaskSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
      console.error('[Task Creation Blocked] Title is empty');
      setNewTaskError("Vui lòng nhập tiêu đề công việc.");
      handleOpenCreateTaskComposer();
      return;
    }

    // Block if there are error/warn-level warnings
    if (hasBlockingErrors) {
      console.error('[Task Creation Blocked] Has blocking errors');
      setNewTaskError("Vui lòng sửa các lỗi bên dưới trước khi tạo task.");
      return;
    }

    // Resolve dueDate: nếu đang schedule thì dùng endAt, nếu không thì dùng dueAt
    const resolvedDueAtInput = showSchedule && newTaskEndAt ? newTaskEndAt : (newTaskDueAt || null);
    const resolvedDueAt = normalizeDueAtForApi(resolvedDueAtInput);
    if (resolvedDueAtInput && !resolvedDueAt) {
      console.error('[Task Creation Blocked] Invalid due date format', { resolvedDueAtInput });
      setNewTaskError("Ngày hạn không hợp lệ.");
      return;
    }

    // Resolve startAt từ schedule
    const resolvedStartAt = showSchedule && newTaskStartAt ? normalizeDueAtForApi(newTaskStartAt) : null;
    if (showSchedule && newTaskStartAt && !resolvedStartAt) {
      console.error('[Task Creation Blocked] Invalid start time format', { newTaskStartAt });
      setNewTaskError("Thời gian bắt đầu không hợp lệ.");
      return;
    }

    // Validate: startAt phải trước endAt
    if (resolvedStartAt && resolvedDueAt) {
      if (new Date(resolvedStartAt) >= new Date(resolvedDueAt)) {
        console.error('[Task Creation Blocked] Start time >= due time', { resolvedStartAt, resolvedDueAt });
        setNewTaskError("Thời gian bắt đầu phải trước thời gian kết thúc.");
        return;
      }
    }

    // Validate: dueDate không được ở quá khứ
    if (resolvedDueAt) {
      if (new Date(resolvedDueAt) < new Date()) {
        console.error('[Task Creation Blocked] Due date is in the past', { resolvedDueAt, now: new Date() });
        setNewTaskError("Hạn chót không được ở quá khứ.");
        return;
      }
    }

    const createdTask = await addTask(titleValue, {
      description: newTaskDescription.trim() || null,
      dueDate: resolvedDueAt,
      startAt: resolvedStartAt,
      priority: newTaskPriority,
      reminderAt: computeReminderAt(newTaskReminder, resolvedDueAtInput),
      workspaceId,
    });
    if (!createdTask) return;
    setNewTaskText(""); setNewTaskDescription(""); setNewTaskDueAt("");
    setNewTaskStartAt(""); setNewTaskEndAt("");
    setNewTaskPriority("MEDIUM"); setNewTaskReminder("NONE"); setNewTaskError("");
    setShowDescription(false); setShowSchedule(false);
    handleCollapseComposer();
  };

  const handleToggleTask = async (id, currentCompleted) => {
    await toggleTask(id, !currentCompleted);
  };

  const handleDeleteTask = (id) => {
    if (removingIds.has(id)) return;
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Delay actual removal so the row can play its slide-out animation
    setTimeout(() => {
      setRemovingIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      removeTask(id);
    }, 240);
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.title || task.text);
    setEditDescription(task.description || "");
    setEditPriority(task.priority || "MEDIUM");
    if (task.dueDate) {
      const dateObj = new Date(task.dueDate);
      if (!Number.isNaN(dateObj.getTime())) {
        setEditDate(toDateInputValue(dateObj));
      } else {
        setEditDate("");
      }
    } else {
      setEditDate("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null); setEditText(""); setEditDescription("");
    setEditDate(""); setEditPriority("");
    setEditReminder(undefined);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const titleValue = editText.trim();
    if (!titleValue) return;
    const normalizedEditDueAt = normalizeDueAtForApi(editDate);
    if (editDate && !normalizedEditDueAt) return;

    const didUpdateTask = await updateTaskData(editingId, {
      title: titleValue,
      description: editDescription.trim() || null,
      priority: editPriority || "MEDIUM",
      dueDate: normalizedEditDueAt,
      reminderAt: editReminder !== undefined ? computeReminderAt(editReminder, editDate) : undefined,
    });
    if (!didUpdateTask) return;
    handleCancelEdit();
  };

  const handleDateChange = async (taskId, newDate) => {
    if (taskId) {
      const normalizedDueAt = normalizeDueAtForApi(newDate);
      if (newDate && !normalizedDueAt) return;
      await updateTaskData(taskId, { dueDate: normalizedDueAt });
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    if (taskId) await updateTaskData(taskId, { priority: newPriority });
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    else if (e.key === "Escape") handleCancelEdit();
  };

  const handleNewTaskKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasBlockingErrors) {
        setNewTaskError("Vui lòng sửa các lỗi bên dưới trước khi tạo task.");
        return;
      }
      handleAddBlankTask();
    }
  };


  const handleToggleGroupCollapse = (groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleToggleTaskCollapse = (taskId) => {
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    // Check if dropped on a group to move to root
    if (['overdue', 'today', 'upcoming', 'no-deadline'].includes(overId)) {
      const activeTask = taskMap.get(activeId);
      if (activeTask && activeTask.parentId !== null) {
        await updateTaskData(activeId, { parentId: null });
      }
      return;
    }
    
    // Prevent dragging a task into itself or its own children
    const isDescendant = (childId, parentId) => {
      let current = taskMap.get(childId);
      while (current && current.parentId) {
        if (current.parentId === parentId) return true;
        current = taskMap.get(current.parentId);
      }
      return false;
    };

    if (activeId === overId || isDescendant(overId, activeId)) {
      return;
    }

    // Determine target parent.
    const activeTask = taskMap.get(activeId);
    if (activeTask && activeTask.parentId !== overId) {
      const activeLevel = active.data.current?.level || 0;
      const overLevel = over.data.current?.level || 0;
      
      if (overLevel >= 3) {
        // Enforce max 4 levels (0, 1, 2, 3)
        return;
      }
      
      await updateTaskData(activeId, { parentId: overId });
    }
  };

  const handleAddSubtask = async (parentId) => {
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      next.delete(parentId);
      return next;
    });
    const newTask = await addTask("Subtask", { parentId, workspaceId });
    if (newTask) {
      handleStartEdit(newTask);
      setEditText(""); // Let user type immediately
    }
  };

  // ── Render task row helper ─────────────────────────────
  const renderTaskRow = (task, level = 0) => {
    const isCollapsed = collapsedTasks.has(task.id);
    const children = task.children || [];
    
    return (
      <div key={task.id}>
        <TaskRow
          task={task}
          level={level}
          hasChildren={children.length > 0}
          isExpanded={!isCollapsed}
          onToggleExpand={() => handleToggleTaskCollapse(task.id)}
          onAddSubtask={handleAddSubtask}
          isEditing={editingId === task.id}
          editText={editText}
          editDescription={editDescription}
          editDate={editDate}
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
            if (editingId === task.id) { setEditDate(value); return; }
            handleDateChange(task.id, value);
          }}
          onPriorityChange={(priority) => {
            if (editingId === task.id) { setEditPriority(priority); return; }
            handlePriorityChange(task.id, priority);
          }}
          onReminderChange={(presetValue) => {
            if (editingId === task.id) {
              setEditReminder(presetValue);
              return;
            }
            const reminderAt = computeReminderAt(presetValue, task.dueDate || task.date);
            updateTaskData(task.id, { reminderAt });
          }}
          editReminder={editingId === task.id ? editReminder : undefined}
          isDeleting={removingIds.has(task.id)}
          onOpenDashboard={() => setSelectedTaskId(task.id)}
        />
        {!isCollapsed && children.length > 0 && (
          <div className="flex flex-col">
            {children.map(child => renderTaskRow(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // ── JSX ────────────────────────────────────────────────
  return (
    <main className="flex-1 overflow-y-auto pt-10 pb-10">
      <div className="max-w-4xl mx-auto px-15 py-0">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary">{title}</h1>
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

        {/* ── Composer (from incoming, with HEAD-style priority pills) ── */}
        {isComposerExpanded && (() => {
          const formattedDueAt = newTaskDueAt
            ? (() => {
                const d = new Date(isDateOnlyValue(newTaskDueAt) ? `${newTaskDueAt}T00:00:00` : newTaskDueAt);
                if (Number.isNaN(d.getTime())) return null;
                const datePart = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });
                if (isDatetimeLocalValue(newTaskDueAt)) {
                  const timePart = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  return `${datePart} ${timePart}`;
                }
                return datePart;
              })()
            : null;
          const reminderLabels = {
            NONE: null,
            MINUTES_5: "5 phút trước",
            MINUTES_15: "15 phút trước",
            HOUR_1: "1 giờ trước",
          };
          const priorityActive = PRIORITY_FLAG_STYLES[newTaskPriority];
          const hasReminder = newTaskReminder !== "NONE";

          return (
          <div
            ref={createTaskSectionRef}
            className="mb-4 overflow-hidden rounded-xl border border-border-subtle bg-bg-sidebar/40 transition-colors focus-within:border-accent-primary/40"
          >
            {/* ── Title row ─────────────────────────────────── */}
            <div className="flex items-start gap-2.5 px-4 pt-6 pb-3">
              <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-text-tertiary">
                <Plus size={16} />
              </div>
              <input
                ref={newTaskInputRef}
                className="flex-1 border-none bg-transparent py-2 text-[15px] font-medium text-text-primary outline-none placeholder-text-tertiary"
                placeholder="Bạn cần làm gì?"
                value={newTaskText}
                onChange={(e) => {
                  setNewTaskText(e.target.value);
                  if (newTaskError) setNewTaskError("");
                }}
                onKeyDown={handleNewTaskKeyDown}
                aria-invalid={Boolean(newTaskError)}
              />
              {allTasks.length > 0 && (
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary border-none bg-transparent cursor-pointer"
                  onClick={handleCollapseComposer}
                  title="Thu gọn"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* ── Description (collapsible) ─────────────────── */}
            {(showDescription || newTaskDescription) && (
              <div className="px-4 pt-2 pl-[42px]">
                <textarea
                  className="w-full resize-none rounded-md border border-transparent bg-transparent p-1 text-[13px] text-text-secondary outline-none placeholder-text-tertiary focus:border-border-subtle focus:bg-white/3"
                  rows={2}
                  placeholder="Thêm mô tả..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  autoFocus={showDescription && !newTaskDescription}
                />
              </div>
            )}

            {/* ── Schedule section (collapsible) ────────────── */}
            {showSchedule && (
              <div className="mx-4 mt-3 ml-[42px] rounded-lg border border-border-subtle/60 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-accent-primary" />
                  <span className="text-xs font-semibold text-text-primary">Lên lịch</span>
                  <button
                    type="button"
                    onClick={() => { setShowSchedule(false); setNewTaskStartAt(""); setNewTaskEndAt(""); }}
                    className="ml-auto p-0.5 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5 font-medium">Bắt đầu</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-md border border-border-subtle bg-white/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary/50 transition-colors"
                      style={{ colorScheme: 'dark' }}
                      value={newTaskStartAt}
                      onChange={(e) => { setNewTaskStartAt(e.target.value); if (newTaskError) setNewTaskError(""); }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5 font-medium">Kết thúc</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-md border border-border-subtle bg-white/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary/50 transition-colors"
                      style={{ colorScheme: 'dark' }}
                      value={newTaskEndAt}
                      onChange={(e) => { setNewTaskEndAt(e.target.value); if (newTaskError) setNewTaskError(""); }}
                    />
                  </div>
                </div>
              </div>
            )}

            {newTaskError && (
              <p className="mt-1 px-4 pl-[42px] text-xs text-red-400">{newTaskError}</p>
            )}

            {/* ── Action chips row ──────────────────────────── */}
            <div className="flex items-center gap-1.5 border-t border-border-subtle/60 bg-white/[0.015] px-3 py-2 mt-3">
              {/* Date chip (datetime-local) */}
              <button
                type="button"
                onClick={() => {
                  if (dateInputRef.current?.showPicker) {
                    dateInputRef.current.showPicker();
                  } else {
                    dateInputRef.current?.click();
                  }
                }}
                className={`group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors border-none cursor-pointer ${
                  newTaskDueAt
                    ? isDueAtInPast
                      ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                      : "bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/15"
                    : "bg-transparent text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
                }`}
                title={newTaskDueAt ? "Đổi hạn chót" : "Đặt hạn chót"}
              >
                <Calendar size={12} />
                <span>{formattedDueAt || "Hạn chót"}</span>
                {newTaskDueAt && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewTaskDueAt("");
                    }}
                    className="ml-0.5 -mr-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-sm opacity-60 hover:bg-black/30 hover:opacity-100"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>
              <input
                ref={dateInputRef}
                type="datetime-local"
                className="sr-only"
                style={{ colorScheme: 'dark' }}
                value={newTaskDueAt}
                onChange={(e) => {
                  setNewTaskDueAt(e.target.value);
                  if (newTaskError) setNewTaskError("");
                }}
                tabIndex={-1}
              />

              {/* Schedule chip */}
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors border-none cursor-pointer ${
                  showSchedule
                    ? "bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/15"
                    : "bg-transparent text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
                }`}
                title="Lên lịch (tạo sự kiện trên Calendar)"
              >
                <Clock size={12} />
                <span>Lên lịch</span>
              </button>

              {/* Priority chip */}
              <div ref={priorityDropdownRef} className="relative">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors border-none cursor-pointer ${
                    priorityActive
                      ? "bg-white/[0.04] hover:bg-white/[0.08]"
                      : "bg-transparent text-text-tertiary hover:bg-white/5"
                  }`}
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  title={priorityActive ? `Mức ưu tiên: ${priorityActive.label}` : "Mức ưu tiên"}
                >
                  <Flag
                    size={12}
                    strokeWidth={2.25}
                    className={priorityActive ? priorityActive.color : "text-text-tertiary opacity-70"}
                  />
                  <span className={priorityActive ? priorityActive.color : ""}>
                    {priorityActive ? priorityActive.label : "Ưu tiên"}
                  </span>
                </button>
                {showPriorityDropdown && (
                  <div className="absolute bottom-full left-0 mb-1.5 bg-bg-sidebar border border-border-subtle rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 z-20 min-w-[140px]">
                    {["HIGH", "MEDIUM", "LOW"].map((p) => {
                      const s = PRIORITY_FLAG_STYLES[p];
                      const selected = newTaskPriority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setNewTaskPriority(p);
                            setShowPriorityDropdown(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${selected ? "bg-white/5" : ""}`}
                        >
                          <Flag size={13} strokeWidth={2.25} className={s.color} />
                          <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                          {selected && <Check size={12} className="ml-auto text-text-secondary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reminder chip */}
              <div ref={reminderDropdownRef} className="relative">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors border-none cursor-pointer ${
                    hasReminder
                      ? "bg-amber-400/10 text-amber-300 hover:bg-amber-400/15"
                      : "bg-transparent text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
                  }`}
                  onClick={() => setShowReminderDropdown(!showReminderDropdown)}
                  title={hasReminder ? `Nhắc: ${reminderLabels[newTaskReminder]}` : "Nhắc nhở"}
                >
                  <Bell size={12} />
                  <span>{hasReminder ? reminderLabels[newTaskReminder] : "Nhắc nhở"}</span>
                </button>
                {showReminderDropdown && (
                  <div className="absolute bottom-full left-0 mb-1.5 bg-bg-sidebar border border-border-subtle rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 z-20 min-w-[160px]">
                    {[
                      { value: "NONE", label: "Không nhắc" },
                      { value: "MINUTES_5", label: "5 phút trước" },
                      { value: "MINUTES_15", label: "15 phút trước" },
                      { value: "HOUR_1", label: "1 giờ trước" },
                    ].map((opt) => {
                      const selected = newTaskReminder === opt.value;
                      const isReminder = opt.value !== "NONE";
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setNewTaskReminder(opt.value);
                            setShowReminderDropdown(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${selected ? "bg-white/5" : ""}`}
                        >
                          <Bell
                            size={12}
                            className={isReminder ? "text-amber-400" : "text-text-tertiary opacity-50"}
                          />
                          <span className={`text-xs ${isReminder ? "text-amber-300" : "text-text-secondary"}`}>
                            {opt.label}
                          </span>
                          {selected && <Check size={12} className="ml-auto text-text-secondary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Description toggle chip */}
              {!showDescription && !newTaskDescription && (
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-transparent px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-secondary border-none cursor-pointer"
                  title="Thêm mô tả"
                >
                  <FileText size={12} />
                  <span>Mô tả</span>
                </button>
              )}

              {/* Submit */}
              <button
                type="button"
                disabled={!newTaskText.trim() || hasBlockingErrors}
                className={`ml-auto inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer ${
                  hasBlockingErrors
                    ? "bg-red-500/60 hover:bg-red-500/70"
                    : "bg-accent-primary hover:bg-accent-hover"
                }`}
                onClick={handleAddBlankTask}
                title={hasBlockingErrors ? "Sửa các lỗi bên dưới để tạo task" : ""}
              >
                {hasBlockingErrors ? "Không thể tạo" : "Thêm"}
                {!hasBlockingErrors && (
                  <kbd className="hidden md:inline rounded bg-white/15 px-1 py-px text-[9px] font-mono">⏎</kbd>
                )}
              </button>
            </div>

            {composerWarnings.length > 0 && (
              <div className="border-t border-border-subtle/40 px-4 py-2.5 space-y-1.5">
                {composerWarnings.map((warning) => (
                  <div
                    key={warning.id}
                    className={`text-[12px] flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-200 ${
                      warning.tone === "error"
                        ? "bg-red-500/10 text-red-300 border border-red-500/20"
                        : warning.tone === "warn"
                        ? "bg-amber-500/8 text-amber-300"
                        : warning.tone === "tip"
                        ? "bg-blue-500/8 text-blue-300"
                        : "bg-white/[0.03] text-text-secondary"
                    }`}
                  >
                    <span className="leading-relaxed flex-1">{warning.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {loading && !tasks.length && (
          <div className="mt-4 rounded-md border border-border-subtle/40 overflow-hidden">
            <SkeletonList rows={6} />
          </div>
        )}

        {/* ── Task List (grouped from incoming, row UI from HEAD) ── */}
        <div className="bg-transparent">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {hasVisibleTasks ? (
            TASK_GROUPS.map((group) => {
              const tasksInGroup = groupedTasks[group.key];
              if (tasksInGroup.length === 0) return null;
              const isCollapsed = Boolean(collapsedGroups[group.key]);

              return (
                <GroupDropZone key={group.key} group={group}>
                  <section className="mb-4">
                    <button
                      type="button"
                      className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 transition-colors hover:bg-white/5"
                      onClick={() => handleToggleGroupCollapse(group.key)}
                    >
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${group.labelClassName}`}>
                        {group.label} ({tasksInGroup.length})
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-text-tertiary transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                      />
                    </button>
                    {!isCollapsed && (
                      <div className="pl-1 pr-1">{tasksInGroup.map((task) => renderTaskRow(task))}</div>
                    )}
                  </section>
                </GroupDropZone>
              );
            })
          ) : (
            <div className="text-center py-10">
              <p className="text-text-tertiary text-sm">No tasks yet</p>
            </div>
          )}
          </DndContext>
        </div>

        {(pagination?.totalPages || 1) > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4 text-xs text-text-tertiary">
            <div>
              Trang {page} / {pagination?.totalPages || 1} ·{" "}
              {pagination?.totalItems || allTasks.length} công việc
            </div>

            <div className="flex items-center gap-2">
              <label className="text-text-tertiary">Hiển thị</label>
              <select
                className="rounded border border-border-subtle bg-white/5 px-2 py-1 text-xs text-text-primary"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                {[10, 14, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-white/5 disabled:opacity-50"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={loading || page <= 1}
              >
                Trước
              </button>
              <button
                type="button"
                className="rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-white/5 disabled:opacity-50"
                onClick={() =>
                  setPage((prev) =>
                    Math.min(prev + 1, pagination?.totalPages || 1),
                  )
                }
                disabled={loading || page >= (pagination?.totalPages || 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TaskSlideOver — UI from HEAD */}
      <TaskSlideOver
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        task={selectedTask}
        onUpdate={updateTaskData}
      />
    </main>
  );
};

export default TaskList;
