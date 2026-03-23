import React from 'react';

const CalendarEvent = ({ event, onClick }) => {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(event);
            }}
            className="w-full text-left px-2 py-0.5 rounded-[4px] text-[11px] font-medium leading-tight truncate cursor-pointer
                       hover:brightness-125 transition-all duration-150 mb-[3px] border"
            style={{ 
                backgroundColor: event.color + '20', 
                color: event.color,
                borderColor: event.color + '30'
            }}
        >
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: event.color }} />
            {event.time && <span className="opacity-80 mr-1">{event.time}</span>}
            {event.title}
        </button>
    );
};

export default CalendarEvent;
