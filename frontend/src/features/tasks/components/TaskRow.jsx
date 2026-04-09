import React, { useState, useEffect, useRef } from "react";
import { Trash2, Loader, Calendar, Clock3, Bell } from "lucide-react";
import TaskCheckbox from "./TaskCheckbox";
import { getPriorityColor } from "../utils/priorityUtils";

/**
 * TaskRow Component
 * Represents a single task with editing, date picker, priority selector, and schedule picker.
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
  onReminderChange,
  onEditSave,
  onEditCancel,
  onEditKeyDown,
  onDelete,
  isDeleting,
  isScheduling,
  editReminder,
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  const datePickerRef = useRef(null);
  const schedulePickerRef = useRef(null);
  const priorityRef = useRef(null);
  const reminderRef = useRef(null);

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

      if (reminderRef.current && !reminderRef.current.contains(event.target)) {
        setIsReminderOpen(false);
      }
    }

    if (isDateOpen || isScheduleOpen || isPriorityOpen || isReminderOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDateOpen, isScheduleOpen, isPriorityOpen, isReminderOpen]);

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

  const dueDateLabelSource = isEditing ? editDate : task.dueDate || task.date;
  const dueDateValue = dueDateLabelSource ? toDateTimeLocal(dueDateLabelSource) : "";
  const scheduleLabelSource = isEditing ? editScheduledAt : task.scheduledAt;
  const scheduleEndAtValue = dueDateLabelSource
    ? toDateTimeLocal(dueDateLabelSource)
    : "";

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
    <div
      className={`rounded-lg border border-transparent px-2 py-2 transition-colors ${
        isEditing ? "bg-white/5 border-border-subtle" : "hover:bg-white/2"
      }`}
    >
      <div className="flex items-start gap-3">
        <TaskCheckbox checked={task.completed === true} onChange={onToggle} />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                className="w-full bg-transparent border border-border-subtle rounded px-2 py-1.5 text-text-primary text-sm outline-none focus:border-accent-primary"
                value={editText}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={onEditKeyDown}
                autoFocus
              />

              <textarea
                className="w-full resize-none rounded border border-border-subtle bg-white/5 px-2 py-1.5 text-text-primary text-xs outline-none focus:border-accent-primary"
                rows={2}
                placeholder="Mô tả"
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                onKeyDown={onEditKeyDown}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-accent-primary text-white text-xs hover:bg-accent-hover transition-colors"
                  onClick={onEditSave}
                >
                  Lưu
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded border border-border-subtle text-text-tertiary text-xs hover:bg-white/5"
                  onClick={onEditCancel}
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-full bg-transparent border-none p-0 text-left cursor-text"
              onClick={onEdit}
            >
              <p
                className={`text-sm transition-colors ${
                  task.completed === true
                    ? "text-text-tertiary line-through"
                    : "text-text-primary"
                }`}
              >
                {task.title || task.text}
              </p>

              {task.description && (
                <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                  {task.description}
                </p>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div ref={priorityRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-tertiary hover:bg-white/5 transition-colors whitespace-nowrap"
              onClick={() => setIsPriorityOpen(!isPriorityOpen)}
              title="Đặt độ ưu tiên"
            >
              {(() => {
                return currentPriority ? (
                  <span className={getPriorityColor(currentPriority).text}>
                    {getPriorityColor(currentPriority).label}
                  </span>
                ) : (
                  <span>Ưu tiên</span>
                );
              })()}
            </button>

            {isPriorityOpen && (
              <div className="absolute top-full right-0 mt-1 z-10 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onPriorityChange("URGENT");
                    setIsPriorityOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-orange-400 ${
                    currentPriority === "URGENT" ? "bg-white/10" : ""
                  }`}
                >
                  Khẩn cấp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPriorityChange("HIGH");
                    setIsPriorityOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-red-400 ${
                    currentPriority === "HIGH" ? "bg-white/10" : ""
                  }`}
                >
                  Cao
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPriorityChange("MEDIUM");
                    setIsPriorityOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-yellow-400 ${
                    currentPriority === "MEDIUM" ? "bg-white/10" : ""
                  }`}
                >
                  Trung bình
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPriorityChange("LOW");
                    setIsPriorityOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 hover:bg-white/5 rounded text-blue-400 ${
                    currentPriority === "LOW" ? "bg-white/10" : ""
                  }`}
                >
                  Thấp
                </button>
              </div>
            )}
          </div>

          <div ref={datePickerRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-tertiary hover:bg-white/5 transition-colors whitespace-nowrap"
              onClick={() => setIsDateOpen(!isDateOpen)}
              title="Due At"
            >
              <Calendar size={12} />
              <span>
                {dueDateLabelSource
                  ? `Due At ${formatDateTime(dueDateLabelSource)}`
                  : "Due At"}
              </span>
            </button>

            {isDateOpen && (
              <div className="absolute top-full right-0 mt-1 z-10 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-2">
                <input
                  type="datetime-local"
                  className="px-2 py-1 rounded bg-white/10 border border-border-subtle text-text-primary text-xs"
                  value={dueDateValue}
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

          <div ref={schedulePickerRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-tertiary hover:bg-white/5 transition-colors whitespace-nowrap"
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
                  ? `Start At ${formatDateTime(scheduleLabelSource)}`
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

          <div ref={reminderRef} className="relative">
            <button
              type="button"
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                currentReminder
                  ? "text-amber-400 hover:bg-amber-500/10"
                  : "text-text-tertiary hover:bg-white/5"
              }`}
              onClick={() => setIsReminderOpen(!isReminderOpen)}
              title="Nhắc nhở"
            >
              <Bell size={12} />
              <span>{getReminderLabel(currentReminder)}</span>
            </button>

            {isReminderOpen && (
              <div className="absolute top-full right-0 mt-1 z-10 w-48 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-2 space-y-1">
                <p className="text-[10px] text-text-tertiary px-2 mb-1 uppercase tracking-wider">Nhắc trước Due At</p>
                {[
                  { label: "Không nhắc", value: "NONE" },
                  { label: "5 phút trước", value: "MINUTES_5" },
                  { label: "15 phút trước", value: "MINUTES_15" },
                  { label: "1 giờ trước", value: "HOUR_1" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`block w-full text-left px-3 py-1.5 rounded text-xs hover:bg-white/5 ${
                      (opt.value === "NONE" && !currentReminder) ||
                      (opt.value !== "NONE" && currentReminder)
                        ? ""
                        : ""
                    }`}
                    onClick={() => {
                      onReminderChange(opt.value);
                      setIsReminderOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={`p-1 rounded-md bg-transparent text-text-tertiary cursor-pointer opacity-60 hover:bg-red-500/10 hover:text-red-500 transition-all hover:opacity-100 ${
              isDeleting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={onDelete}
            disabled={isDeleting}
            aria-label="Xóa công việc"
          >
            {isDeleting ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskRow;
