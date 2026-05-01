import React, { useEffect, useRef, useState } from 'react';
import CalendarEvent from './CalendarEvent';
import { useDroppable } from '@dnd-kit/core';

// Heights used to compute how many events fit before showing "+N more".
// These match the regular CalendarEvent (full title + time row + mb-1).
const EVENT_ROW_HEIGHT = 38;       // rendered button incl. 4px mb-1 spacer
const HEADER_RESERVED_HEIGHT = 28; // day-number row + mb-1
const MORE_LABEL_HEIGHT = 16;      // "+N more" label row
const VERTICAL_PADDING = 12;       // 6px top + 6px bottom

const CalendarDayCell = ({
    date,
    isToday,
    isCurrentMonth,
    events = [],
    onClick,
    onEventClick,
    onAddEvent,
}) => {
    const dayNumber = date.getDate();

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    const { setNodeRef, isOver } = useDroppable({
        id: `day-${dateKey}`,
        data: { date: dateKey },
    });

    // Sort events by start time, undated last
    const sortedEvents = [...events].sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
    });

    // Cap visible events based on actual cell height to avoid visual overflow.
    const cellRef = useRef(null);
    const [visibleCount, setVisibleCount] = useState(3);

    useEffect(() => {
        const el = cellRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;

        const compute = () => {
            const h = el.clientHeight;
            const available =
                h - HEADER_RESERVED_HEIGHT - MORE_LABEL_HEIGHT - VERTICAL_PADDING;
            const n = Math.max(1, Math.floor(available / EVENT_ROW_HEIGHT));
            setVisibleCount((prev) => (prev === n ? prev : n));
        };

        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const visibleEvents = sortedEvents.slice(0, visibleCount);
    const hiddenCount = sortedEvents.length - visibleEvents.length;

    const setRefs = (node) => {
        setNodeRef(node);
        cellRef.current = node;
    };

    return (
        <div
            ref={setRefs}
            onClick={() => {
                onClick?.(date);
                onAddEvent?.(date);
            }}
            className={`calendar-day-cell group relative flex min-h-[100px] cursor-pointer flex-col overflow-hidden border-b border-r border-border-subtle p-1.5 transition-colors duration-200 ${
                !isCurrentMonth ? 'opacity-40' : ''
            } ${isOver ? 'bg-accent-primary/10' : 'hover:bg-bg-block-hover'}`}
        >
            {/* Day Number */}
            <div className="mb-1 flex shrink-0 items-start justify-between">
                <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                            ? 'bg-accent-primary font-bold text-white shadow-sm'
                            : isCurrentMonth
                            ? 'text-text-primary group-hover:bg-bg-active'
                            : 'text-text-tertiary'
                    }`}
                >
                    {dayNumber}
                </span>
            </div>

            {/* Events — clipped to cell, dynamic count to avoid overflow */}
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {visibleEvents.map((event) => (
                    <CalendarEvent
                        key={event.id}
                        event={event}
                        onClick={onEventClick}
                    />
                ))}
                {hiddenCount > 0 && (
                    <span className="px-1 text-[10px] text-text-tertiary">
                        +{hiddenCount} more
                    </span>
                )}
            </div>
        </div>
    );
};

export default CalendarDayCell;
