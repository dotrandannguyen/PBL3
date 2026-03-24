import React from 'react';
import { useDraggable } from '@dnd-kit/core';

const CalendarEvent = ({ event, onClick }) => {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id: `event-${event.id}`,
        data: { event },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
    } : undefined;
    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (!isDragging) {
                    onClick?.(event);
                }
            }}
            className={`w-full text-left px-2 py-0.5 rounded-[4px] text-[11px] font-medium leading-tight truncate cursor-grab active:cursor-grabbing
                       hover:brightness-125 transition-all duration-150 mb-[3px] border block ${isDragging ? 'opacity-50 ring-2 ring-accent-primary z-50' : 'opacity-100'}`}
            style={{ 
                ...style,
                backgroundColor: event.color + '20', 
                color: event.color,
                borderColor: event.color + '30'
            }}
            {...listeners}
            {...attributes}
        >
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: event.color }} />
            {event.time && <span className="opacity-80 mr-1">{event.time}</span>}
            {event.title}
        </button>
    );
};

export default CalendarEvent;
