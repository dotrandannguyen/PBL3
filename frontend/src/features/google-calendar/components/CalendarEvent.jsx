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
            className={`w-full overflow-hidden border-y py-1.5 text-left leading-tight transition-all duration-200 ease-out hover:brightness-110 hover:-translate-y-[0.5px] ${
                isOverlay
                    ? 'shadow-2xl ring-1 ring-white/40 z-50 cursor-grabbing rounded-[6px] px-2.5'
                    : isDragging
                    ? 'opacity-30 cursor-grabbing rounded-[6px] px-2.5'
                    : `cursor-grab active:cursor-grabbing ${event.isStart === false ? 'ml-[-6px] pl-[8px] rounded-l-none border-l-transparent' : 'rounded-l-[6px] pl-2.5 border-l'} ${event.isEnd === false ? 'mr-[-6px] pr-[8px] rounded-r-none border-r-transparent' : 'rounded-r-[6px] pr-2.5 border-r'}`
            } ${className || 'mb-1'}`}
            style={{
                ...style,
                backgroundColor: event.color ? `${event.color}15` : 'rgba(255,255,255,0.06)',
                borderTopColor: event.color ? `${event.color}30` : 'rgba(255,255,255,0.1)',
                borderBottomColor: event.color ? `${event.color}30` : 'rgba(255,255,255,0.1)',
                borderRightColor: event.color ? `${event.color}30` : 'rgba(255,255,255,0.1)',
                borderLeftWidth: event.isStart === false ? '0' : '3px',
                borderLeftStyle: 'solid',
                borderLeftColor: event.isStart === false ? 'transparent' : (event.color || '#2383e2'),
                willChange: isDragging || isOverlay ? 'transform, opacity' : 'auto',
            }}
            {...props}
        >
            <div className="flex flex-col gap-0.5">
                <span className="truncate text-[13px] font-bold text-white tracking-wide">
                    {event.title || '\u00A0'}
                </span>
                {event.time && (
                    <span className="truncate text-[11px] font-medium text-white/60">
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
