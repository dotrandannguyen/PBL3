import React, { useState, useEffect, useRef } from "react";
import { Trash2, Loader, Calendar } from "lucide-react";
import TaskCheckbox from "./TaskCheckbox";
import { formatDate, formatDateToISO, getTodayDate } from "../utils/dateUtils";

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
 * Represents a single task with editing, date picker, and priority selector
 */
const TaskRow = ({
  task,
  isEditing,
  editText,
  editDate,
  editPriority,
  onToggle,
  onEdit,
  onEditChange,
  onDateChange,
  onPriorityChange,
  onEditSave,
  onEditKeyDown,
  onDelete,
  isDeleting,
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  // Refs for dropdown containers
  const datePickerRef = useRef(null);
  const priorityRef = useRef(null);

  // Click outside detection for date and priority dropdowns
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
    }

    if (isDateOpen || isPriorityOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDateOpen, isPriorityOpen]);

  return (
    <div className="flex items-center gap-3 py-2 px-0 border-b border-border-subtle hover:bg-white/2 transition-colors">
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
        <button
          type="button"
          className={`flex-1 bg-transparent border-none px-0 py-1 text-sm text-left cursor-text transition-colors ${task.completed === true ? "text-text-tertiary" : "text-text-primary"
            }`}
          onClick={onEdit}
        >
          {task.title || task.text}
        </button>
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
            const currentPriority = isEditing ? editPriority : task.priority;
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
              value={formatDateToISO(task.dueDate) || getTodayDate()}
              onChange={(e) => {
                onDateChange(e.target.value);
                setIsDateOpen(false);
              }}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        className={`w-7 h-7 flex items-center justify-center p-0 rounded-md bg-transparent text-text-tertiary cursor-pointer opacity-0 hover:bg-red-500/10 hover:text-red-500 transition-all hover:opacity-100 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
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
