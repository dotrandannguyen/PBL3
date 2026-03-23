import React from 'react';
import CalendarEvent from './CalendarEvent';

const CalendarDayCell = ({ date, isToday, isCurrentMonth, events = [], onClick, onEventClick, onAddEvent }) => {
    const dayNumber = date.getDate();

    return (
        <div
            onClick={(e) => {
                onClick?.(date);
                // Mở Modal trực tiếp khi bấm vào ô lịch
                onAddEvent?.(date);
            }}
            className={`
                calendar-day-cell min-h-[100px] border-r border-b border-border-subtle p-1.5 cursor-pointer
                transition-colors duration-200 hover:bg-bg-block-hover group relative
                ${!isCurrentMonth ? 'opacity-40' : ''}
            `}
        >
            {/* Hover Tooltip (Thông tin pop up) */}
            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] p-2.5 rounded-xl bg-bg-sidebar border border-border-subtle shadow-2xl pointer-events-none select-none">
                <div className="text-xs font-semibold text-text-primary mb-1.5 pb-1 border-b border-border-subtle">
                    {date.toLocaleDateString('en-GB')}
                </div>
                {events.length === 0 ? (
                    <div className="text-[11px] text-text-tertiary">No events. Click to add.</div>
                ) : (
                    <div className="flex flex-col gap-1.5 max-h-[120px] overflow-hidden">
                        {events.map((e) => (
                            <div key={e.id} className="text-[11px] font-medium truncate flex items-center gap-1.5" style={{ color: e.color }}>
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
