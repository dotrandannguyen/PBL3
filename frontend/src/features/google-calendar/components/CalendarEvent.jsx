import React from 'react';
import { useDraggable } from '@dnd-kit/core';

const CalendarEvent = ({ event, onClick, className }) => {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id: `event-${event.id}`,
        data: { event },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        transition: isDragging ? 'none' : undefined,
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
            className={`w-full h-full text-left px-2 py-1 rounded-[3px] text-[11px] leading-tight overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-sm transition-all duration-150 border block ${isDragging ? 'opacity-50 ring-2 ring-accent-primary z-50' : 'opacity-100'} ${className || 'mb-[3px]'}`}
            style={{ 
                ...style,
                backgroundColor: event.color + '15', 
                color: '#333333',
                borderColor: event.color + '30',
                borderWidth: '1px'
            }}
            {...listeners}
            {...attributes}
        >
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                <span className="font-semibold truncate text-[#111]">{event.title}</span>
            </div>
            {event.time && <div className="opacity-70 text-[10px] pl-3 truncate">{event.time}</div>}
        </button>
    );
};

export default CalendarEvent;
