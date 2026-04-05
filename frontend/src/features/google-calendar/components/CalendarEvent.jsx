import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export const CalendarEventUI = React.forwardRef(({ event, isDragging, isOverlay, className, style, onClick, ...props }, ref) => (
    <button
        ref={ref}
        type="button"
        onClick={(e) => {
            e.stopPropagation();
            if (!isDragging && !isOverlay) {
                onClick?.(event);
            }
        }}
        className={`w-full h-full text-left px-2 py-1.5 rounded-[4px] text-[11px] leading-snug overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-150 block border border-border-subtle bg-white/5 hover:bg-white/10 hover:border-white/20 ${isOverlay ? 'opacity-100 ring-1 ring-white/50 scale-[1.02] shadow-xl z-50' : isDragging ? 'opacity-0' : ''} ${className || 'mb-1'}`}
        style={{
            ...style,
            borderLeft: `3px solid ${event.color || '#2383e2'}`
        }}
        {...props}
    >
        <div className="flex flex-col">
            <span className="font-medium truncate text-text-primary">{event.title}</span>
            {event.time && <span className="text-text-tertiary text-[10px] truncate mt-0.5">{event.time}</span>}
        </div>
    </button>
));

const CalendarEvent = ({ event, onClick, className }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `event-${event.id}`,
        data: { event },
    });

    // when dragging, we just show it faded, DragOverlay handles the visual flying
    return (
        <CalendarEventUI
            ref={setNodeRef}
            event={event}
            onClick={onClick}
            className={className}
            isDragging={isDragging}
            {...listeners}
            {...attributes}
        />
    );
};

export default CalendarEvent;
