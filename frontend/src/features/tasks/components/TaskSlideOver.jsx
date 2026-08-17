import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Flag,
  AlignLeft,
  CheckCircle2,
  Circle,
  Clock,
  Check,
  MoreVertical,
  Plus,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateVN, formatDateToISO } from "../utils/dateUtils";
import { useLanguage } from "../../../contexts/LanguageContext";

const PriorityIcon = ({ priority, className }) => {
  const p = typeof priority === "string" ? priority.toUpperCase() : priority;
  if (p === "HIGH")
    return <Flag size={14} className={`text-red-400 ${className}`} />;
  if (p === "MEDIUM")
    return <Flag size={14} className={`text-yellow-400 ${className}`} />;
  if (p === "LOW")
    return <Flag size={14} className={`text-blue-400 ${className}`} />;
  return <Flag size={14} className={`text-text-tertiary ${className}`} />;
};

export default function TaskSlideOver({ isOpen, onClose, task, onUpdate }) {
  const { t } = useLanguage();
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [localStartAt, setLocalStartAt] = useState("");
  const [localDueAt, setLocalDueAt] = useState("");

  const [isRendered, setIsRendered] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  const checkDueDateWarnings = () => {
    const warnings = [];
    if (localDueAt) {
      const dueDate = new Date(localDueAt);
      const now = new Date();

      if (dueDate < now) {
        warnings.push("pastDue");
      }
    }
    return warnings;
  };

  const computeScheduleWarnings = () => {
    const warnings = [];
    const now = new Date();

    const startObj = localStartAt ? new Date(localStartAt) : null;
    const endObj = localDueAt ? new Date(localDueAt) : null;

    if (startObj && startObj < now) {
      warnings.push({
        id: "start-past",
        text: "Lỗi: Thời gian bắt đầu đã qua.",
        tone: "error",
      });
    }

    if (startObj && endObj && endObj <= startObj) {
      warnings.push({
        id: "end-before-start",
        text: "Lỗi: Thời gian kết thúc phải sau thời gian bắt đầu.",
        tone: "error",
      });
    }

    if (endObj && endObj < now) {
      warnings.push({
        id: "end-past",
        text: "Lỗi: Thời gian kết thúc đã qua.",
        tone: "error",
      });
    }

    return warnings;
  };

  useEffect(() => {
    if (task && isOpen) {
      setLocalTitle(task.title || task.text || "");
      setLocalDesc(task.description || "");
      setLocalStartAt(
        task.scheduledAt ? formatDateToISO(task.scheduledAt) : "",
      );
      setLocalDueAt(task.dueDate ? formatDateToISO(task.dueDate) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleTitleBlur = async () => {
    if (task && localTitle.trim() && localTitle !== (task.title || task.text)) {
      await onUpdate(task.id, { title: localTitle });
    }
  };

  const handleDescBlur = async () => {
    if (task && localDesc !== (task.description || "")) {
      await onUpdate(task.id, { description: localDesc });
      toast.success(t("task.slideover.toast.descSaved"));
    }
  };

  const handleDateUpdate = async (startAt, dueDate) => {
    if (startAt && dueDate) {
      const startDate = new Date(startAt);
      const endDate = new Date(dueDate);
      if (startDate >= endDate) {
        toast.error(
          t("task.slideover.toast.invalidSchedule") ||
            "Thời gian bắt đầu phải trước ngày hết hạn.",
        );
        return;
      }
    }
  };

  const toIsoOrNull = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsRendered(true), 10);
    } else {
      setIsRendered(false);
    }
  }, [isOpen]);

  if (!isOpen && !isRendered) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 transition-opacity duration-300 ${isOpen && isRendered ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[calc(50vw-130px)] min-w-[400px] max-w-[800px] bg-bg-main shadow-2xl z-50 
                    border-l border-border-subtle flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                    ${isOpen && isRendered ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate(task.id, { completed: !task.completed })}
              className="p-1 rounded hover:bg-bg-hover text-text-tertiary transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5"
            >
              {task?.completed ? (
                <div className="bg-accent-primary rounded-sm w-[15px] h-[15px] flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="border border-text-tertiary rounded-sm w-[15px] h-[15px]" />
              )}
              <span className="text-xs text-text-secondary select-none font-medium text-left">
                {t("task.slideover.markDone")}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary transition-colors border-none bg-transparent cursor-pointer">
              <MoreVertical size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-6">
          {/* Main Box */}
          <div className="border border-border-subtle rounded-xl p-4 bg-bg-sidebar shadow-md">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <Plus size={18} className="text-text-tertiary" />
              <input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder={t("task.slideover.titlePlaceholder")}
                className="flex-1 bg-transparent border-none text-text-primary text-[15px] outline-none placeholder-text-tertiary"
              />
              <button
                onClick={onClose}
                className="px-3 py-1.5 border border-border-subtle rounded-lg text-xs text-text-tertiary hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t("task.slideover.collapse")}
              </button>
            </div>

            {/* Description Body */}
            <div className="mt-3">
              <textarea
                value={localDesc}
                onChange={(e) => setLocalDesc(e.target.value)}
                onBlur={handleDescBlur}
                placeholder={t("task.slideover.descPlaceholder")}
                className="w-full bg-bg-main/30 border-none outline-none resize-none p-3 rounded-lg text-text-secondary text-sm placeholder-text-tertiary/70"
                rows={3}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            {/* Due Date */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-md bg-transparent text-sm cursor-pointer transition-colors ${checkDueDateWarnings().includes("pastDue") ? "border-red-500/60 text-red-400 hover:bg-red-500/10" : "border-border-subtle text-text-primary hover:bg-white/5"}`}
            >
              <input
                type="datetime-local"
                value={localDueAt}
                onChange={(e) => {
                  setLocalDueAt(e.target.value);
                }}
                className="bg-transparent text-inherit border-none outline-none p-0 max-w-[160px] text-sm"
                style={{ colorScheme: "dark" }}
              />
              <Calendar size={14} />
            </div>

            {/* Due Date Warnings */}
            {checkDueDateWarnings().includes("pastDue") && (
              <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle
                  size={14}
                  className="text-red-400 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-400">
                    {t("task.slideover.warning.pastDue") ||
                      "Chú ý: Hạn chót đang ở quá khứ."}
                  </p>
                  <p className="text-xs text-red-400/70 mt-0.5">
                    {t("task.slideover.warning.cannotCreate") ||
                      "Không thể tạo task."}
                  </p>
                </div>
              </div>
            )}

            {/* Created At */}
            {task?.createdAt && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-border-subtle rounded-md bg-bg-main/30 text-text-secondary text-[13px]">
                <Clock size={14} />
                <span>
                  {t("task.slideover.createdAt")}:{" "}
                  {formatDateVN(task.createdAt)}
                </span>
              </div>
            )}

            {/* Priority Selector */}
            <div className="relative">
              <button
                onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                className={`px-3 py-1.5 border bg-transparent rounded-md text-[13px] transition-colors font-medium cursor-pointer flex items-center gap-1.5 ${
                  task?.priority === "HIGH"
                    ? "border-red-500/50 text-red-500 hover:bg-red-500/10"
                    : task?.priority === "LOW"
                      ? "border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                      : task?.priority === "MEDIUM"
                        ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                        : "border-border-subtle text-text-primary hover:bg-white/5"
                }`}
              >
                <PriorityIcon
                  priority={task?.priority}
                  className={
                    task?.priority === "HIGH"
                      ? "text-red-500"
                      : task?.priority === "LOW"
                        ? "text-blue-500"
                        : task?.priority === "MEDIUM"
                          ? "text-yellow-500"
                          : "text-text-tertiary"
                  }
                />
                {task?.priority === "HIGH"
                  ? t("task.priority.high")
                  : task?.priority === "LOW"
                    ? t("task.priority.low")
                    : task?.priority === "MEDIUM"
                      ? t("task.priority.medium")
                      : t("task.priority.none")}
              </button>

              {isPriorityOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-bg-sidebar border border-border-subtle rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-20 min-w-[120px]">
                  <button
                    onClick={async () => {
                      await onUpdate(task.id, { priority: "HIGH" });
                      setIsPriorityOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-red-500 hover:bg-red-500/10 text-[13px] font-medium"
                  >
                    <Flag size={14} className="text-red-500" />{" "}
                    {t("task.priority.high")}
                  </button>
                  <button
                    onClick={async () => {
                      await onUpdate(task.id, { priority: "MEDIUM" });
                      setIsPriorityOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-yellow-500 hover:bg-yellow-500/10 text-[13px] font-medium"
                  >
                    <Flag size={14} className="text-yellow-500" />{" "}
                    {t("task.priority.medium")}
                  </button>
                  <button
                    onClick={async () => {
                      await onUpdate(task.id, { priority: "LOW" });
                      setIsPriorityOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-blue-500 hover:bg-blue-500/10 text-[13px] font-medium"
                  >
                    <Flag size={14} className="text-blue-500" />{" "}
                    {t("task.priority.low")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Box Grid */}
          <div className="mt-5 border border-border-subtle rounded-xl p-4 bg-bg-sidebar shadow-md">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-tertiary font-medium">
                  {t("task.slideover.startDate")}
                </label>
                <div
                  className={`flex items-center gap-2 px-2.5 py-1.5 bg-bg-main/50 border rounded-md group transition-colors ${computeScheduleWarnings().some((w) => w.id === "start-past" || w.id === "end-before-start") ? "border-red-500/50 focus-within:border-red-500 text-red-400" : "border-border-subtle hover:border-text-tertiary"}`}
                >
                  <input
                    type="datetime-local"
                    className="bg-transparent border-none outline-none text-text-primary text-[13px] flex-1 min-w-0"
                    style={{ colorScheme: "dark" }}
                    value={localStartAt}
                    onChange={(e) => {
                      setLocalStartAt(e.target.value);
                    }}
                  />
                  <Calendar size={14} className="text-text-tertiary" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-tertiary font-medium">
                  {t("task.slideover.endDate")}
                </label>
                <div
                  className={`flex items-center gap-2 px-2.5 py-1.5 bg-bg-main/50 border rounded-md transition-colors ${computeScheduleWarnings().some((w) => w.id === "end-past" || w.id === "end-before-start") ? "border-red-500/50 focus-within:border-red-500 text-red-400" : "border-border-subtle focus-within:border-text-tertiary"}`}
                >
                  <input
                    type="datetime-local"
                    className="bg-transparent border-none outline-none text-text-primary text-[13px] flex-1 min-w-0"
                    style={{ colorScheme: "dark" }}
                    value={localDueAt}
                    onChange={(e) => {
                      setLocalDueAt(e.target.value);
                    }}
                  />
                  <Calendar size={14} className="text-text-tertiary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings/Errors */}
        {computeScheduleWarnings().length > 0 && (
          <div className="border-t border-border-subtle/40 px-6 py-3 space-y-2">
            {computeScheduleWarnings().map((warning) => (
              <div
                key={warning.id}
                className={`text-[12px] flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
                  warning.tone === "error"
                    ? "bg-red-500/10 text-red-300 border border-red-500/20"
                    : "bg-white/[0.03] text-text-secondary"
                }`}
              >
                <span className="leading-relaxed flex-1">{warning.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer with Update Button */}
        <div className="p-5 border-t border-border-subtle/50 bg-bg-sidebar mt-auto">
          {checkDueDateWarnings().includes("pastDue") ? (
            <button
              disabled
              className="w-full py-2.5 bg-red-600 text-white font-medium rounded-lg text-[13px] cursor-not-allowed shadow-md opacity-60"
            >
              {t("task.slideover.cannotCreate") || "Không thể tạo"}
            </button>
          ) : (
            <button
              onClick={async () => {
                const nextStartAt = toIsoOrNull(localStartAt);
                const nextDueDate = toIsoOrNull(localDueAt);

                if (nextDueDate && new Date(nextDueDate) < new Date()) {
                  toast.error(
                    t("task.slideover.toast.pastDueDate") ||
                      "Hạn chót không được ở quá khứ.",
                  );
                  return;
                }

                await handleDateUpdate(nextStartAt, nextDueDate);

                const patch = {};
                if ((task?.scheduledAt || null) !== nextStartAt) {
                  patch.startAt = nextStartAt;
                }
                if ((task?.dueDate || null) !== nextDueDate) {
                  patch.dueDate = nextDueDate;
                }
                if (Object.keys(patch).length > 0) {
                  await onUpdate(task.id, patch);
                }

                await handleTitleBlur();
                await handleDescBlur();
                toast.success(t("task.slideover.toast.updated"));
                onClose();
              }}
              className="w-full py-2.5 bg-[#2383E2] hover:bg-[#1D6FC0] text-white font-medium rounded-lg text-[13px] transition-colors cursor-pointer shadow-md"
            >
              {t("task.slideover.updateBtn")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
