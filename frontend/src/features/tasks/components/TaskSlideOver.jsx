import React, { useState, useEffect } from "react";
import { X, Calendar, Flag, AlignLeft, CheckCircle2, Circle, Clock, Check, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { formatDateVN, formatDateToISO } from "../utils/dateUtils";

const PriorityIcon = ({ priority, className }) => {
  const p = typeof priority === 'string' ? priority.toUpperCase() : priority;
  if (p === 'HIGH') return <Flag size={14} className={`text-red-400 ${className}`} />;
  if (p === 'MEDIUM') return <Flag size={14} className={`text-yellow-400 ${className}`} />;
  if (p === 'LOW') return <Flag size={14} className={`text-blue-400 ${className}`} />;
  return <Flag size={14} className={`text-text-tertiary ${className}`} />;
};

export default function TaskSlideOver({ isOpen, onClose, task, onUpdate }) {
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");

  useEffect(() => {
    if (task) {
      setLocalTitle(task.title || task.text || "");
      setLocalDesc(task.description || "");
    }
  }, [task, isOpen]);

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
      // Assuming the backend has a description field or can accept it.
      // If it doesn't, this will just gracefully be ignored by API or we add it later.
      await onUpdate(task.id, { description: localDesc });
      toast.success("Đã lưu nháp mô tả");
    }
  };

  const [isRendered, setIsRendered] = useState(false);
  useEffect(() => {
    if (isOpen) {
      // Timeout ensures the initial mount happens before applying transition class
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
        className={`fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 transition-opacity duration-300 ${isOpen && isRendered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[50%] min-w-[400px] max-w-[800px] bg-bg-main shadow-2xl z-50 
                    border-l border-border-subtle flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                    ${isOpen && isRendered ? 'translate-x-0' : 'translate-x-full'}`}
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
              <span className="text-xs text-text-secondary select-none font-medium text-left">Đánh dấu hoàn thành</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary transition-colors border-none bg-transparent cursor-pointer">
              <MoreVertical size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary transition-colors border-none bg-transparent cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="px-10 py-8 flex flex-col gap-6">

            {/* Title */}
            <div className="w-full">
              <textarea
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Tiêu đề công việc"
                className="w-full text-3xl font-bold bg-transparent text-text-primary placeholder-text-tertiary/50 border-none outline-none resize-none overflow-hidden"
                rows={1}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
              />
            </div>

            {/* Properties */}
            <div className="flex flex-col gap-4 mt-2">

              {/* Status */}
              <div className="flex items-center group">
                <div className="w-32 flex items-center gap-2 text-text-tertiary">
                  <Clock size={15} />
                  <span className="text-[13px]">Trạng thái</span>
                </div>
                <div className="flex-1 text-[13px] text-text-primary">
                  <span className="px-2 py-1 rounded hover:bg-bg-hover cursor-pointer inline-flex items-center">
                    {task?.completed ? 'Đã xong' : 'Chưa làm'}
                  </span>
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center group">
                <div className="w-32 flex items-center gap-2 text-text-tertiary">
                  <Flag size={15} />
                  <span className="text-[13px]">Mức độ</span>
                </div>
                <div className="flex-1 text-[13px] text-text-primary">
                  <span className="px-2 py-1 rounded hover:bg-bg-hover cursor-pointer inline-flex items-center gap-2">
                    <PriorityIcon priority={task?.priority} />
                    <span className="capitalize">{task?.priority?.toLowerCase() || 'Medium'}</span>
                  </span>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center group">
                <div className="w-32 flex items-center gap-2 text-text-tertiary">
                  <Calendar size={15} />
                  <span className="text-[13px]">Thời hạn</span>
                </div>
                <div className="flex-1 text-[13px] text-text-primary">
                  <input
                    type="date"
                    value={task?.dueDate ? formatDateToISO(task.dueDate) : ""}
                    onChange={async (e) => await onUpdate(task.id, { dueDate: e.target.value })}
                    className="bg-transparent text-text-primary  hover:bg-bg-hover px-2 py-1 rounded cursor-pointer outline-none border-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

            </div>

            {/* Divider */}
            <hr className="border-t border-border-subtle/50 my-2" />

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="text-[14px] text-text-secondary font-medium pb-1 flex items-center gap-2">
                <AlignLeft size={16} className="text-text-tertiary" /> Phụ chú / Mô tả chi tiết
              </div>
              <textarea
                value={localDesc}
                onChange={(e) => setLocalDesc(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Nhập mô tả hoặc ghi chú của bạn vào đây..."
                className="w-full min-h-[300px] text-[14px] leading-relaxed bg-transparent text-text-primary placeholder-text-tertiary/40 border p-3 rounded-xl border-border-subtle hover:border-text-tertiary/40 focus:border-accent-primary outline-none resize-none transition-colors"
              />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
