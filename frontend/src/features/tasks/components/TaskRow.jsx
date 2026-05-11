import React, { useState, useEffect, useRef } from "react";
import { Trash2, Loader, Calendar, Bell, Flag, Check, GripVertical, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import TaskCheckbox from "./TaskCheckbox";
import TaskTooltip from "./TaskTooltip";
import { formatDate } from "../utils/dateUtils";
import useAuth from "../../auth/hooks/useAuth";
import { useLanguage } from "../../../contexts/LanguageContext";

const PRIORITY_FLAG_STYLES = {
  HIGH: { color: "text-red-400", label: "Cao" },
  MEDIUM: { color: "text-yellow-400", label: "Trung bình" },
  LOW: { color: "text-blue-400", label: "Thấp" },
};

const FlagPriorityIcon = ({ priority, size = 14 }) => {
  const key = priority ? String(priority).toUpperCase() : null;
  const style = key ? PRIORITY_FLAG_STYLES[key] : null;
  return (
    <Flag
      size={size}
      strokeWidth={2.25}
      className={style ? style.color : "text-text-tertiary opacity-60"}
    />
  );
};

/**
 * TaskRow Component
 * Represents a single task with editing, date picker, priority flag selector, and reminder.
 * UI: HEAD (Notion-style minimal inline row with side-peek button)
 * Logic: Incoming (full scheduling, description editing via SlideOver)
 */
const TaskRow = ({
  task,
  isEditing,
  editText,
  editDescription,
  editDate,
  editPriority,
  onToggle,
  onEdit,
  onEditChange,
  onEditDescriptionChange,
  onDateChange,
  onPriorityChange,
  onReminderChange,
  onEditSave,
  onEditCancel,
  onEditKeyDown,
  onDelete,
  isDeleting,
  onOpenDashboard,
  editReminder,
  level = 0,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  onAddSubtask,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  const datePickerRef = useRef(null);
  const priorityRef = useRef(null);
  const reminderRef = useRef(null);

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: task.id,
    data: { task, level },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: task.id,
    data: { task, level },
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setIsDateOpen(false);
      }

      if (priorityRef.current && !priorityRef.current.contains(event.target)) {
        setIsPriorityOpen(false);
      }

      if (reminderRef.current && !reminderRef.current.contains(event.target)) {
        setIsReminderOpen(false);
      }
    }

    if (isDateOpen || isPriorityOpen || isReminderOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDateOpen, isPriorityOpen, isReminderOpen]);

  const toDatetimeLocal = (value) => {
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

  const dueDateLabelSource = isEditing ? editDate : task.dueDate || task.date;
  const dueDateValue = dueDateLabelSource ? toDatetimeLocal(dueDateLabelSource) : "";

  const currentPriority = isEditing
    ? editPriority || task.priority
    : task.priority;

  const currentReminder = isEditing
    ? (editReminder !== undefined ? editReminder : task.reminderAt)
    : task.reminderAt;

  const getReminderLabel = (reminderAt) => {
    if (!reminderAt) return "Nhắc nhở";
    const d = new Date(reminderAt);
    if (Number.isNaN(d.getTime())) return "Nhắc nhở";
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div
      ref={setDroppableRef}
      className={`group flex items-center gap-1.5 py-2 px-0 border-b border-border-subtle transition-colors relative ${
        isDeleting ? "overflow-hidden animate-row-fade-out pointer-events-none" : ""
      } ${isOver ? "bg-accent-primary/20 ring-1 ring-accent-primary rounded-md" : "hover:bg-white/2"} ${
        isDragging ? "opacity-50 scale-[0.98] z-50 bg-bg-sidebar shadow-xl" : ""
      }`}
      style={{ paddingLeft: `${level * 24}px` }}
    >
      <div 
        ref={setDraggableRef} 
        {...listeners} 
        {...attributes}
        className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-text-secondary active:cursor-grabbing px-1"
      >
        <GripVertical size={14} />
      </div>

      <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
        {hasChildren ? (
          <button
            type="button"
            className="flex items-center justify-center p-0.5 rounded hover:bg-white/10 text-text-tertiary transition-colors border-none bg-transparent cursor-pointer"
            onClick={onToggleExpand}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}
      </div>

      <TaskCheckbox checked={task.completed === true} onChange={onToggle} />

      {level < 3 && onAddSubtask && (
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 flex-shrink-0 text-text-tertiary hover:text-text-primary hover:bg-white/10 rounded transition-colors cursor-pointer border-none bg-transparent"
          onClick={(e) => { e.stopPropagation(); onAddSubtask(task.id); }}
          title="Thêm mục con"
        >
          <Plus size={14} />
        </button>
      )}

      {isEditing ? (
        <input
          className="flex-1 min-w-0 bg-transparent border-none px-0 py-1 text-text-primary text-sm outline-none"
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={onEditSave}
          autoFocus
        />
      ) : (
        <div
          className="flex-1 min-w-0 flex items-center gap-1 relative"
          onMouseEnter={() => {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = setTimeout(() => setShowTooltip(true), 400);
          }}
          onMouseLeave={() => {
            clearTimeout(tooltipTimeoutRef.current);
            setShowTooltip(false);
          }}
        >
          {showTooltip && <TaskTooltip task={task} currentUser={user} />}
          <button
            type="button"
            className={`min-w-0 bg-transparent border-none px-0 py-1 text-sm text-left cursor-text transition-colors truncate ${
              task.completed === true ? "text-text-tertiary" : "text-text-primary"
            }`}
            onClick={onEdit}
          >
            {task.title || task.text}
          </button>
          <button
            type="button"
            onClick={() => onOpenDashboard && onOpenDashboard(task)}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 flex items-center justify-center rounded-md hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-all cursor-pointer border-none bg-transparent"
            title={t('task.row.openDetail')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
        </div>
      )}

      {/* Priority Selector — Flag icon */}
      <div ref={priorityRef} className="relative flex-shrink-0">
        <button
          type="button"
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer"
          onClick={() => setIsPriorityOpen(!isPriorityOpen)}
          title={
            currentPriority
              ? `Mức ưu tiên: ${PRIORITY_FLAG_STYLES[String(currentPriority).toUpperCase()]?.label || currentPriority}`
              : "Đặt mức ưu tiên"
          }
        >
          <FlagPriorityIcon priority={currentPriority} />
        </button>

        {isPriorityOpen && (
          <div className="absolute top-full right-0 mt-1.5 z-50 bg-bg-sidebar border border-border-subtle rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 min-w-[130px]">
            {["HIGH", "MEDIUM", "LOW"].map((p) => {
              const s = PRIORITY_FLAG_STYLES[p];
              const selected =
                currentPriority &&
                String(currentPriority).toUpperCase() === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onPriorityChange(p);
                    setIsPriorityOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${selected ? "bg-white/5" : ""}`}
                >
                  <Flag size={13} strokeWidth={2.25} className={s.color} />
                  <span className={`text-xs font-medium ${s.color}`}>
                    {s.label}
                  </span>
                  {selected && (
                    <Check
                      size={12}
                      className="ml-auto text-text-secondary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Date Picker — datetime-local */}
      <div ref={datePickerRef} className="relative flex-shrink-0">
        {(() => {
          const hasDueDate = Boolean(task.dueDate || task.date);
          const fallbackDateSource = task.createdAt || task.created_at;
          const rawDate = hasDueDate ? (task.dueDate || task.date) : fallbackDateSource;
          let displayDate;
          if (rawDate) {
            const d = new Date(rawDate);
            if (!Number.isNaN(d.getTime())) {
              const datePart = formatDate(rawDate);
              // Show time if it has non-midnight time
              const hasTime = hasDueDate && (d.getHours() !== 0 || d.getMinutes() !== 0);
              if (hasTime) {
                const timePart = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                displayDate = `${datePart} ${timePart}`;
              } else {
                displayDate = datePart;
              }
            } else {
              displayDate = "Thêm ngày";
            }
          } else {
            displayDate = "Thêm ngày";
          }
          return (
            <button
              type="button"
              className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap border-none bg-transparent cursor-pointer min-w-[140px] ${
                hasDueDate
                  ? "text-text-secondary hover:bg-white/5"
                  : "text-text-tertiary hover:bg-white/5"
              }`}
              onClick={() => setIsDateOpen(!isDateOpen)}
              title={hasDueDate ? "Đổi ngày hạn" : "Đặt ngày hạn"}
            >
              <Calendar size={12} />
              <span>{displayDate}</span>
            </button>
          );
        })()}

        {isDateOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-2">
            <input
              type="datetime-local"
              className="px-2 py-1 rounded bg-white/10 border border-border-subtle text-text-primary text-xs"
              style={{ colorScheme: 'dark' }}
              value={dueDateValue}
              onChange={(e) => { onDateChange(e.target.value); setIsDateOpen(false); }}
            />
            {(task.dueDate || task.date || dueDateValue) && (
              <button
                type="button"
                className="mt-2 block w-full rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-white/5"
                onClick={() => { onDateChange(""); setIsDateOpen(false); }}
              >
                Bỏ ngày hạn
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reminder Picker */}
      <div ref={reminderRef} className="relative flex-shrink-0">
        <button
          type="button"
          className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap border-none bg-transparent cursor-pointer ${currentReminder ? "text-amber-400 hover:bg-amber-500/10" : "text-text-tertiary hover:bg-white/5"}`}
          onClick={() => setIsReminderOpen(!isReminderOpen)}
          title={currentReminder ? `Nhắc: ${getReminderLabel(currentReminder)}` : "Nhắc nhở"}
        >
          <Bell size={12} />
          {currentReminder && <span>{getReminderLabel(currentReminder)}</span>}
        </button>
        {isReminderOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 w-48 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-2 space-y-1">
            <p className="text-[10px] text-text-tertiary px-2 mb-1 uppercase tracking-wider">Nhắc trước Due At</p>
            {[
              { label: "Không nhắc", value: "NONE" },
              { label: "5 phút trước", value: "MINUTES_5" },
              { label: "15 phút trước", value: "MINUTES_15" },
              { label: "1 giờ trước", value: "HOUR_1" },
            ].map((opt) => (
              <button key={opt.value} type="button"
                className={`block w-full text-left px-3 py-1.5 rounded text-xs hover:bg-white/5 ${opt.value === "NONE" && !currentReminder ? "bg-white/10 text-text-primary" : opt.value !== "NONE" && currentReminder ? "bg-white/10 text-amber-400" : ""}`}
                onClick={() => { onReminderChange(opt.value); setIsReminderOpen(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className={`w-7 h-7 flex items-center justify-center p-0 rounded-md bg-transparent text-text-tertiary cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={onDelete}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
};

export default TaskRow;
