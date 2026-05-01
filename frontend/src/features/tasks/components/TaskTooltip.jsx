import React from 'react';
import { Calendar, User, Flag } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * TaskTooltip — Hover popover for task rows
 *
 * Displays: Title, Status, Assignee, Priority, Due Date
 * Positioned absolutely above the parent TaskRow (which is `position: relative`).
 */
const TaskTooltip = ({ task, currentUser }) => {
    const { t } = useLanguage();

    const STATUS_STYLES = {
        PENDING: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: t('tooltip.status.pending') },
        IN_PROGRESS: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: t('tooltip.status.inProgress') },
        DONE: { bg: 'bg-green-500/15', text: 'text-green-400', label: t('tooltip.status.done') },
    };

    const PRIORITY_STYLES = {
        HIGH: { bg: 'bg-red-500/15', text: 'text-red-400', label: t('task.priority.high'), icon: '🔴' },
        MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: t('task.priority.medium'), icon: '🟡' },
        LOW: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: t('task.priority.low'), icon: '🔵' },
    };

    const status = STATUS_STYLES[task.status] || STATUS_STYLES.PENDING;
    const priority = task.priority
        ? PRIORITY_STYLES[task.priority.toUpperCase()]
        : null;

    const assigneeName = currentUser?.fullName || currentUser?.email || 'You';
    const assigneeInitial = assigneeName[0]?.toUpperCase() || 'U';
    const dueDate = formatDate(task.dueDate || task.date);

    return (
        <div
            className="absolute bottom-full left-0 mb-2 z-50 w-72
                       bg-bg-sidebar border border-border-subtle
                       rounded-xl shadow-2xl p-4
                       pointer-events-none
                       opacity-0 animate-[tooltipIn_150ms_ease-out_forwards]"
            style={{
                // Inline animation definition as fallback
            }}
        >
            {/* Title */}
            <h4 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 mb-3">
                {task.title || task.text}
            </h4>

            {/* Status badge */}
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium w-14">{t('tooltip.label.status')}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                </span>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium w-14">{t('tooltip.label.assignee')}</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center text-[10px] font-semibold text-accent-primary flex-shrink-0">
                        {assigneeInitial}
                    </div>
                    <span className="text-xs text-text-secondary truncate max-w-[140px]">{assigneeName}</span>
                </div>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium w-14">{t('tooltip.label.priority')}</span>
                {priority ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${priority.bg} ${priority.text}`}>
                        {priority.label}
                    </span>
                ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                )}
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium w-14">{t('tooltip.label.due')}</span>
                <div className="flex items-center gap-1">
                    <Calendar size={11} className="text-text-tertiary" />
                    <span className="text-xs text-text-secondary">
                        {dueDate || t('tooltip.noDueDate')}
                    </span>
                </div>
            </div>

            {/* Tooltip arrow (pointing down) */}
            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-bg-sidebar border-r border-b border-border-subtle rotate-45" />
        </div>
    );
};

export default TaskTooltip;
