import React from 'react';

const CalendarEvent = ({ event, onClick }) => {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(event);
            }}
            className="w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate cursor-pointer
                       hover:brightness-125 transition-all duration-150 mb-0.5 border-none"
            style={{ backgroundColor: event.color + '33', color: event.color }}
        >
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: event.color }} />
            {event.time && <span className="opacity-80 mr-1">{event.time}</span>}
            {event.title}
        </button>
    );
};

export default CalendarEvent;
