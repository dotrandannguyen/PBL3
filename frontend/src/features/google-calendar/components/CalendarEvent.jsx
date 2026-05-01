import React from 'react';
import { useDraggable } from '@dnd-kit/core';

/**
 * CalendarEventUI — pure presentation. Used in the grid AND as DragOverlay.
 *
 * data-event-block="true" lets the week-grid drag-to-create selection skip
 * over existing events.
 */
export const CalendarEventUI = React.forwardRef(
    ({ event, isDragging, isOverlay, className, style, onClick, ...props }, ref) => (
        <button
            ref={ref}
            type="button"
            data-event-block="true"
            onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && !isOverlay) onClick?.(event);
            }}
            className={`block h-full w-full overflow-hidden rounded-[4px] border border-border-subtle bg-white/5 px-2 py-1.5 text-left text-[11px] leading-snug transition-[background-color,border-color,box-shadow,opacity] duration-150 ease-out hover:border-white/20 hover:bg-white/10 ${
                isOverlay
                    ? 'shadow-2xl ring-1 ring-white/40 z-50 cursor-grabbing'
                    : isDragging
                    ? 'opacity-30 cursor-grabbing'
                    : 'cursor-grab active:cursor-grabbing'
            } ${className || 'mb-1'}`}
            style={{
                ...style,
                borderLeft: `3px solid ${event.color || '#2383e2'}`,
                willChange: isDragging || isOverlay ? 'transform, opacity' : 'auto',
            }}
            {...props}
        >
            <div className="flex flex-col">
                <span className="truncate font-medium text-text-primary">
                    {event.title}
                </span>
                {event.time && (
                    <span className="mt-0.5 truncate text-[10px] text-text-tertiary">
                        {event.time}
                        {event.endTime ? ` – ${event.endTime}` : ''}
                    </span>
                )}
            </div>
        </button>
    )
);
CalendarEventUI.displayName = 'CalendarEventUI';

const CalendarEvent = ({ event, onClick, className }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `event-${event.id}`,
        data: { event },
    });

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
