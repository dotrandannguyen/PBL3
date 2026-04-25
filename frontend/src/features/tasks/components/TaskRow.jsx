import React, { useState, useEffect, useRef } from "react";
import { Trash2, Loader, Calendar, Clock3 } from "lucide-react";
import TaskCheckbox from "./TaskCheckbox";
import TaskTooltip from "./TaskTooltip";
import { formatDate, formatDateToISO, getTodayDate } from "../utils/dateUtils";
import { getPriorityColor } from "../utils/priorityUtils";
import useAuth from "../../auth/hooks/useAuth";
import { useLanguage } from "../../../contexts/LanguageContext";

const RenderPriorityPill = ({ priority }) => {
  if (!priority) return <span>Priority</span>;
  const p = typeof priority === 'string' ? priority.toUpperCase() : priority;
  const styles = {
    HIGH: { bg: 'bg-red-500/15 hover:bg-red-500/25', text: 'text-red-400', label: 'High' },
    MEDIUM: { bg: 'bg-yellow-500/15 hover:bg-yellow-500/25', text: 'text-yellow-400', label: 'Medium' },
    LOW: { bg: 'bg-blue-500/15 hover:bg-blue-500/25', text: 'text-blue-400', label: 'Low' },
  };
  const s = styles[p];
  if (!s) return <span>{p}</span>;

  return (
    <div className={`flex items-center justify-center px-3 py-1 rounded-[6px] ${s.bg} w-full transition-colors min-w-[75px]`}>
      <span className={`text-[12px] font-medium ${s.text} leading-tight tracking-wide`}>{s.label}</span>
    </div>
  );
};

/**
 * TaskRow Component
 * Represents a single task with editing, date picker, priority selector, and schedule picker.
 * UI: HEAD (Notion-style minimal inline row with side-peek button)
 * Logic: Incoming (full scheduling, description editing via SlideOver)
 */
const TaskRow = ({
  task,
  isEditing,
  editText,
  editDescription,
  editDate,
  editScheduledAt,
  editPriority,
  onToggle,
  onEdit,
  onEditChange,
  onEditDescriptionChange,
  onDateChange,
  onScheduleChange,
  onPriorityChange,
  onEditSave,
  onEditCancel,
  onEditKeyDown,
  onDelete,
  isDeleting,
  onOpenDashboard,
  isScheduling,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef(null);

  const datePickerRef = useRef(null);
  const schedulePickerRef = useRef(null);
  const priorityRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setIsDateOpen(false);
      }

      if (
        schedulePickerRef.current &&
        !schedulePickerRef.current.contains(event.target)
      ) {
        setIsScheduleOpen(false);
      }

      if (priorityRef.current && !priorityRef.current.contains(event.target)) {
        setIsPriorityOpen(false);
      }
    }

    if (isDateOpen || isScheduleOpen || isPriorityOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDateOpen, isScheduleOpen, isPriorityOpen]);

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

  const dueDateValue = formatDateToISO(
    isEditing ? editDate : task.dueDate || task.date,
  );
  const dueDateLabelSource = isEditing ? editDate : task.dueDate || task.date;
  const scheduleLabelSource = isEditing ? editScheduledAt : task.scheduledAt;
  const scheduleEndAtValue = dueDateLabelSource
    ? toDateTimeLocal(dueDateLabelSource)
    : "";

  const currentPriority = isEditing
    ? editPriority || task.priority
    : task.priority;

  const formatDateTime = (value) => {
    if (!value) return "";

    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return "";

    return dateObj.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="group flex items-center gap-3 py-2 px-0 border-b border-border-subtle hover:bg-white/2 transition-colors relative">
      <TaskCheckbox checked={task.completed === true} onChange={onToggle} />

      {isEditing ? (
        <input
          className="flex-1 bg-transparent border-none px-0 py-1 text-text-primary text-sm outline-none"
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={onEditSave}
          autoFocus
        />
      ) : (
        <div
          className="flex-1 flex items-center gap-2 overflow-visible relative"
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
              className={`bg-transparent border-none px-0 py-1 text-sm text-left cursor-text transition-colors truncate ${task.completed === true ? "text-text-tertiary" : "text-text-primary"
                }`}
              onClick={onEdit}
            >
              {task.title || task.text}
            </button>
            <button
                type="button"
                onClick={() => onOpenDashboard && onOpenDashboard(task)}
                className="opacity-0 group-hover:opacity-100 p-1 flex items-center justify-center rounded-md hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-all cursor-pointer border-none bg-transparent"
                title={t('task.row.openDetail')}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
            </button>
        </div>
      )}

      {/* Priority Selector */}
      <div ref={priorityRef} className="relative w-[100px] flex-shrink-0 flex justify-start">
        <button
          type="button"
          className="w-full flex items-center justify-start gap-1 p-0 rounded-md text-xs transition-colors whitespace-nowrap border-none bg-transparent cursor-pointer"
          onClick={() => setIsPriorityOpen(!isPriorityOpen)}
          title="Set priority"
        >
          {(() => {
            return currentPriority ? (
              <RenderPriorityPill priority={currentPriority} />
            ) : (
              <span>Priority</span>
            );
          })()}
        </button>

        {isPriorityOpen && (
          <div className="absolute top-full right-0 mt-1.5 z-50 bg-bg-sidebar border border-border-subtle rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 min-w-[110px]">
            <button
              type="button"
              onClick={() => {
                onPriorityChange("HIGH");
                setIsPriorityOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 hover:bg-white/10 rounded-lg flex items-center transition-colors border-none bg-transparent cursor-pointer ${editPriority === "HIGH" ? "bg-white/5" : ""
                }`}
            >
              <RenderPriorityPill priority="HIGH" />
            </button>
            <button
              type="button"
              onClick={() => {
                onPriorityChange("MEDIUM");
                setIsPriorityOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 hover:bg-white/10 rounded-lg flex items-center transition-colors border-none bg-transparent cursor-pointer ${editPriority === "MEDIUM" ? "bg-white/5" : ""
                }`}
            >
              <RenderPriorityPill priority="MEDIUM" />
            </button>
            <button
              type="button"
              onClick={() => {
                onPriorityChange("LOW");
                setIsPriorityOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 hover:bg-white/10 rounded-lg flex items-center transition-colors border-none bg-transparent cursor-pointer ${editPriority === "LOW" ? "bg-white/5" : ""
                }`}
            >
              <RenderPriorityPill priority="LOW" />
            </button>
          </div>
        )}
      </div>

      {/* Date Picker */}
      <div ref={datePickerRef} className="relative w-[120px] flex-shrink-0 flex justify-start">
        <button
          type="button"
          className="flex items-center justify-start gap-1.5 px-2 py-1.5 w-full rounded-md text-xs text-text-tertiary hover:bg-white/5 transition-colors whitespace-nowrap border-none bg-transparent cursor-pointer"
          onClick={() => setIsDateOpen(!isDateOpen)}
          title="Set due date"
        >
          <Calendar size={12} />
          <span>{formatDate(task.dueDate || task.date) || "Add date"}</span>
        </button>

        {isDateOpen && (
          <div className="absolute top-full right-0 mt-1 z-10 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-2">
            <input
              type="date"
              className="px-2 py-1 rounded bg-white/10 border border-border-subtle text-text-primary text-xs"
              value={dueDateValue || getTodayDate()}
              onChange={(e) => {
                onDateChange(e.target.value);
                setIsDateOpen(false);
              }}
            />
            {(task.dueDate || task.date || dueDateValue) && (
              <button
                type="button"
                className="mt-2 block w-full rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-white/5"
                onClick={() => {
                  onDateChange("");
                  setIsDateOpen(false);
                }}
              >
                Bỏ ngày hạn
              </button>
            )}
          </div>
        )}
      </div>

      {/* Schedule Picker (logic from incoming) */}
      <div ref={schedulePickerRef} className="relative">
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-tertiary hover:bg-white/5 transition-colors whitespace-nowrap border-none bg-transparent cursor-pointer"
          onClick={() => setIsScheduleOpen(!isScheduleOpen)}
          title="Lên lịch bắt đầu"
          disabled={isScheduling}
        >
          {isScheduling ? (
            <Loader size={12} className="animate-spin" />
          ) : (
            <Clock3 size={12} />
          )}
          <span>
            {scheduleLabelSource
              ? `${formatDateTime(scheduleLabelSource)}`
              : "Lên lịch"}
          </span>
        </button>

        {isScheduleOpen && (
          <div className="absolute top-full right-0 mt-1 z-10 w-56 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-2 space-y-2">
            <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
              <span>Start At</span>
              <input
                type="datetime-local"
                className="px-2 py-1 rounded bg-white/10 border border-border-subtle text-text-primary text-xs"
                value={editScheduledAt || ""}
                onChange={(e) => onScheduleChange(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
              <span>End At</span>
              <input
                type="datetime-local"
                className="px-2 py-1 rounded bg-white/10 border border-border-subtle text-text-primary text-xs"
                value={scheduleEndAtValue}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </label>

            {(task.scheduledAt || editScheduledAt) && (
              <button
                type="button"
                className="mt-2 block w-full rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-white/5"
                onClick={() => {
                  onScheduleChange("");
                  setIsScheduleOpen(false);
                }}
              >
                Bỏ lịch
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className={`w-7 h-7 flex items-center justify-center p-0 rounded-md bg-transparent text-text-tertiary cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
          }`}
        onClick={onDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
      </button>
    </div>
  );
};

export default TaskRow;
