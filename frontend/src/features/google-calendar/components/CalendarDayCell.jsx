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

    return (
        <div
            ref={setNodeRef}
            onClick={(e) => {
                onClick?.(date);
                // Mở Modal trực tiếp khi bấm vào ô lịch
                onAddEvent?.(date);
            }}
            className={`
                calendar-day-cell min-h-[100px] border-r border-b border-border-subtle p-1.5 cursor-pointer
                transition-colors duration-200 group relative
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${isOver ? 'bg-accent-primary/10' : 'hover:bg-bg-block-hover'}
            `}
        >
            {/* Hover Tooltip (Thông tin pop up) */}
            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] p-2.5 rounded-xl bg-bg-sidebar border border-border-subtle shadow-2xl">
                <div className="text-xs font-semibold text-text-primary mb-1.5 pb-1 px-1 border-b border-border-subtle">
                    {date.toLocaleDateString('vi-VN')}
                </div>
                {events.length === 0 ? (
                    <div className="text-[11px] text-text-tertiary px-1">No events. Click to add.</div>
                ) : (
                    <div className="flex flex-col gap-0.5 max-h-[120px] overflow-hidden">
                        {events.map((e) => (
                            <div 
                                key={e.id} 
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    onEventClick?.(e);
                                }}
                                className="text-[11px] font-medium truncate flex items-center gap-1.5 p-1.5 rounded-[6px] hover:bg-bg-hover cursor-pointer transition-colors" 
                                style={{ color: e.color }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                                {e.title}
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                {events.slice(0, 3).map((event) => (
                    <CalendarEvent key={event.id} event={event} onClick={onEventClick} />
                ))}
                {events.length > 3 && (
                    <span className="text-[10px] text-text-tertiary px-1">
                        +{events.length - 3} more
                    </span>
                )}
            </div>
        </div>
    );
};

export default CalendarDayCell;
