import React from 'react';
import CalendarEvent from './CalendarEvent';
import { useDroppable } from '@dnd-kit/core';

const CalendarDayCell = ({ date, isToday, isCurrentMonth, events = [], onClick, onEventClick, onAddEvent }) => {
    const dayNumber = date.getDate();
    
    // Format date consistently (YYYY-MM-DD local time)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${dateKey}`,
        data: { date: dateKey },
    });

    // Sắp xếp sự kiện theo thời gian bắt đầu (cái nào sớm hơn lên trước)
    const sortedEvents = [...events].sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;  // Không có giờ → xuống dưới
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
    });

    return (
        <div
            ref={setNodeRef}
            onClick={(e) => {
                onClick?.(date);
                onAddEvent?.(date);
            }}
            className={`
                calendar-day-cell min-h-[100px] border-r border-b border-border-subtle p-1.5 cursor-pointer
                transition-colors duration-200 group relative
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${isOver ? 'bg-accent-primary/10' : 'hover:bg-bg-block-hover'}
            `}
        >
            {/* Day Number */}
            <div className="flex justify-between items-start mb-1">
                <span
                    className={`
                        text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday
                            ? 'bg-accent-primary text-white font-bold shadow-sm'
                            : isCurrentMonth
                                ? 'text-text-primary hover:bg-bg-active hover:rounded-md'
                                : 'text-text-tertiary'
                        }
                    `}
                >
                    {dayNumber}
                </span>
            </div>

            {/* Events */}
            <div className="flex flex-col gap-0.5 overflow-hidden">
                {sortedEvents.slice(0, 3).map((event) => (
                    <CalendarEvent key={event.id} event={event} onClick={onEventClick} />
                ))}
                {sortedEvents.length > 3 && (
                    <span className="text-[10px] text-text-tertiary px-1">
                        +{sortedEvents.length - 3} more
                    </span>
                )}
            </div>
        </div>
    );
};

export default CalendarDayCell;
