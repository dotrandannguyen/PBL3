import React from 'react';
import CalendarEvent from './CalendarEvent';

const CalendarDayCell = ({ date, isToday, isCurrentMonth, events = [], onClick, onEventClick }) => {
    const dayNumber = date.getDate();

    return (
        <div
            onClick={() => onClick?.(date)}
            className={`
                calendar-day-cell min-h-[100px] border-r border-b border-border-subtle p-1 cursor-pointer
                transition-colors duration-150 hover:bg-bg-hover
                ${!isCurrentMonth ? 'opacity-40' : ''}
            `}
        >
            {/* Day Number */}
            <div className="flex justify-center mb-1">
                <span
                    className={`
                        text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday
                            ? 'bg-accent-primary text-white font-bold'
                            : isCurrentMonth
                                ? 'text-text-primary hover:bg-bg-active'
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
