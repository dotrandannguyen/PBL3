import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CalendarEvent from './CalendarEvent';
import { useDroppable } from '@dnd-kit/core';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_MINS = 15;
const SLOT_PX = 15; // 1 minute = 1 px so 15-min slot = 15px (HOUR_HEIGHT is 60px)
const HOUR_HEIGHT = 60;

const getStartOfWeek = (date) => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
    newDate.setDate(diff);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};

const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatHHMM = (totalMins) => {
    const clamped = Math.max(0, Math.min(totalMins, 24 * 60));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Calculate overlapping columns — per-cluster
const calculateOverlaps = (dayEvents) => {
    if (!dayEvents.length) return [];

    const parsed = dayEvents
        .map((e) => {
            const [sh, sm] = e.time ? e.time.split(':').map(Number) : [0, 0];
            const [eh, em] = e.endTime
                ? e.endTime.split(':').map(Number)
                : [sh + 1, sm];
            return { ...e, startMin: sh * 60 + sm, endMin: eh * 60 + em };
        })
        .sort((a, b) => a.startMin - b.startMin);

    const clusters = [];
    let currentCluster = [parsed[0]];
    let clusterEnd = parsed[0].endMin;

    for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].startMin < clusterEnd) {
            currentCluster.push(parsed[i]);
            clusterEnd = Math.max(clusterEnd, parsed[i].endMin);
        } else {
            clusters.push(currentCluster);
            currentCluster = [parsed[i]];
            clusterEnd = parsed[i].endMin;
        }
    }
    clusters.push(currentCluster);

    const result = [];
    clusters.forEach((cluster) => {
        const columns = [];
        cluster.forEach((evt) => {
            let placed = false;
            for (let colIdx = 0; colIdx < columns.length; colIdx++) {
                const lastEvent = columns[colIdx][columns[colIdx].length - 1];
                if (lastEvent.endMin <= evt.startMin) {
                    columns[colIdx].push(evt);
                    placed = true;
                    evt._colIdx = colIdx;
                    break;
                }
            }
            if (!placed) {
                evt._colIdx = columns.length;
                columns.push([evt]);
            }
        });

        const numCols = columns.length;
        cluster.forEach((evt) => {
            evt.colIdx = evt._colIdx;
            evt.numCols = numCols;
            delete evt._colIdx;
            result.push(evt);
        });
    });

    return result;
};

/* ─── Per-day droppable column ──────────────────────────────────────── */

const WeekDayColumn = React.memo(
    ({
        dateKey,
        blockEvents,
        onEventClick,
        dayIdx,
        isSelectionDay,
        selectionTop,
        selectionHeight,
        dropPreview,
    }) => {
        const { setNodeRef, isOver } = useDroppable({
            id: `day-${dateKey}`,
            data: { date: dateKey },
        });

        return (
            <div
                ref={setNodeRef}
                data-week-day-column={dateKey}
                data-day-idx={dayIdx}
                className={`relative flex h-full flex-col border-r border-border-subtle transition-colors duration-150 last:border-r-0 ${
                    isOver ? 'bg-accent-primary/[0.06]' : ''
                }`}
            >
                {/* Selection box overlay */}
                {isSelectionDay && (
                    <div
                        className="pointer-events-none absolute z-20 left-[2px] right-[8px]"
                        style={{
                            top: `${selectionTop}px`,
                            height: `${selectionHeight}px`,
                        }}
                    >
                        <div className="h-full w-full rounded-[4px] border border-accent-primary/70 bg-accent-primary/15 shadow-sm backdrop-blur-[1px]" />
                    </div>
                )}

                {/* Drop preview ghost */}
                {dropPreview && (
                    <div
                        className="pointer-events-none absolute z-20 left-[2px] right-[8px]"
                        style={{
                            top: `${dropPreview.top}px`,
                            height: `${Math.max(dropPreview.durationMins, 18)}px`,
                        }}
                    >
                        <div className="h-full w-full rounded-[4px] border-2 border-dashed border-accent-primary/70 bg-accent-primary/10" />
                        <div className="absolute -top-5 left-0 whitespace-nowrap rounded-md bg-accent-primary px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md">
                            {String(Math.floor(dropPreview.startMins / 60)).padStart(2, '0')}
                            :
                            {String(dropPreview.startMins % 60).padStart(2, '0')}
                        </div>
                    </div>
                )}

                {/* Events */}
                <div className="pointer-events-none absolute inset-0 z-10">
                    {blockEvents.map((event) => {
                        const durationMins = event.endMin - event.startMin;
                        const widthPct = 100 / event.numCols;
                        const leftPct = widthPct * event.colIdx;

                        return (
                            <div
                                key={event.id}
                                className="pointer-events-auto absolute"
                                style={{
                                    top: `${event.startMin}px`,
                                    height: `${Math.max(durationMins, 18)}px`,
                                    left: `calc(${leftPct}% + 2px)`,
                                    width: `calc(${widthPct}% - 4px)`,
                                    paddingTop: '2px',
                                    paddingBottom: '2px',
                                }}
                            >
                                <CalendarEvent
                                    event={event}
                                    onClick={onEventClick}
                                    className="!mb-0"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
);
WeekDayColumn.displayName = 'WeekDayColumn';

/* ─── Main grid ──────────────────────────────────────────────────────── */

const CalendarWeekGrid = ({
    currentDate,
    events = [],
    onEventClick,
    onAddEventRange,
    dropPreview,
}) => {
    const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
    const weekDays = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startOfWeek);
                d.setDate(d.getDate() + i);
                return d;
            }),
        [startOfWeek]
    );

    const isToday = (date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    /* ── Selection state (drag-to-create) ──────────────────────────── */
    const [selection, setSelection] = useState(null);
    // shape: { dayIdx, dateKey, startMins, currentMins }
    const gridScrollRef = useRef(null);
    const timeGridRef = useRef(null);
    const dayColumnsRef = useRef(null); // wrapper covering 7 day columns

    /* ── Current time line ─────────────────────────────────────────── */
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    /* ── Convert pointer (clientX, clientY) → { dayIdx, mins } ─────── */
    const pointerToCell = useCallback(
        (clientX, clientY) => {
            const grid = dayColumnsRef.current;
            if (!grid) return null;
            const rect = grid.getBoundingClientRect();

            const relX = clientX - rect.left;
            const relY = clientY - rect.top;

            const colWidth = rect.width / 7;
            let dayIdx = Math.floor(relX / colWidth);
            dayIdx = Math.max(0, Math.min(6, dayIdx));

            // Y position → minutes (1px = 1 min)
            let mins = Math.max(0, Math.min(relY, 24 * 60 - 1));
            // Snap down to slot boundary
            mins = Math.floor(mins / SLOT_MINS) * SLOT_MINS;
            return { dayIdx, mins };
        },
        []
    );

    /* ── Selection: pointerdown on the day-columns wrapper ─────────── */
    const handlePointerDown = useCallback(
        (e) => {
            // Only left button & only when the click landed on the empty grid surface
            if (e.button !== 0) return;
            // Skip if user clicked on an event or other interactive element
            const target = e.target;
            if (target.closest('[data-event-block="true"]')) return;
            if (target.closest('[data-no-select="true"]')) return;

            const cell = pointerToCell(e.clientX, e.clientY);
            if (!cell) return;

            const day = weekDays[cell.dayIdx];
            if (!day) return;

            e.preventDefault();
            setSelection({
                dayIdx: cell.dayIdx,
                dateKey: formatDateKey(day),
                startMins: cell.mins,
                currentMins: cell.mins,
            });
        },
        [pointerToCell, weekDays]
    );

    /* ── Selection: track pointer move on document while dragging ──── */
    useEffect(() => {
        if (!selection) return;

        const handleMove = (e) => {
            const cell = pointerToCell(e.clientX, e.clientY);
            if (!cell) return;
            // Lock day to where selection started (single-day events)
            setSelection((prev) =>
                prev
                    ? {
                          ...prev,
                          currentMins: cell.mins,
                      }
                    : prev
            );
        };

        const handleUp = () => {
            setSelection((prev) => {
                if (!prev) return null;
                const startMins = Math.min(prev.startMins, prev.currentMins);
                const endMins =
                    Math.max(prev.startMins, prev.currentMins) + SLOT_MINS;
                const day = weekDays[prev.dayIdx];

                if (day && endMins > startMins) {
                    onAddEventRange?.(
                        new Date(day),
                        formatHHMM(startMins),
                        formatHHMM(Math.min(endMins, 24 * 60))
                    );
                }
                return null;
            });
        };

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
        return () => {
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);
        };
    }, [selection, pointerToCell, weekDays, onAddEventRange]);

    /* ── Selection display values ──────────────────────────────────── */
    const selectionDisplay = useMemo(() => {
        if (!selection) return null;
        const startMins = Math.min(selection.startMins, selection.currentMins);
        const endMins =
            Math.max(selection.startMins, selection.currentMins) + SLOT_MINS;
        return {
            dayIdx: selection.dayIdx,
            top: startMins,
            height: endMins - startMins,
            startStr: formatHHMM(startMins),
            endStr: formatHHMM(Math.min(endMins, 24 * 60)),
        };
    }, [selection]);

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-bg-main text-text-primary">
            {/* Scrollable container */}
            <div
                ref={gridScrollRef}
                className="relative flex-1 select-none overflow-x-hidden overflow-y-auto bg-bg-main"
            >
                {/* STICKY Week Header */}
                <div
                    data-no-select="true"
                    className="sticky top-0 z-40 flex border-b border-border-subtle bg-bg-sidebar shadow-sm"
                >
                    <div className="w-[60px] flex-shrink-0 border-r border-border-subtle" />
                    <div className="grid flex-1 grid-cols-7">
                        {weekDays.map((day, idx) => {
                            const dayIsToday = isToday(day);
                            return (
                                <div
                                    key={idx}
                                    className="flex flex-col items-center justify-center border-r border-border-subtle py-2 last:border-r-0"
                                >
                                    <span
                                        className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
                                            dayIsToday
                                                ? 'text-accent-primary'
                                                : 'text-text-tertiary'
                                        }`}
                                    >
                                        {DAYS_OF_WEEK[idx]}
                                    </span>
                                    <span
                                        className={`flex h-9 w-9 items-center justify-center rounded-full text-[19px] transition-colors ${
                                            dayIsToday
                                                ? 'bg-accent-primary font-semibold text-white shadow-sm'
                                                : 'text-text-primary hover:bg-bg-hover'
                                        }`}
                                    >
                                        {day.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Week body (time grid) */}
                <div
                    ref={timeGridRef}
                    data-week-time-grid="true"
                    className="flex min-h-[1440px]"
                >
                    {/* Time axis */}
                    <div
                        data-no-select="true"
                        className="flex w-[60px] flex-shrink-0 flex-col border-r border-border-subtle bg-bg-main"
                    >
                        {HOURS.map((hour) => (
                            <div
                                key={`time-${hour}`}
                                className="flex h-[60px] justify-end border-b border-transparent pr-2 pt-1"
                            >
                                <span className="text-[11px] tabular-nums text-text-tertiary">
                                    {hour === 0 ? '' : `${hour}:00`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns wrapper — captures pointer-down for selection */}
                    <div
                        ref={dayColumnsRef}
                        onPointerDown={handlePointerDown}
                        className="relative grid flex-1 grid-cols-7"
                        style={{ touchAction: 'none' }}
                    >
                        {/* Background hour lines */}
                        <div className="pointer-events-none absolute inset-0 flex flex-col">
                            {HOURS.map((hour) => (
                                <div
                                    key={`line-${hour}`}
                                    className="h-[60px] w-full border-b border-border-subtle/50"
                                />
                            ))}
                        </div>

                        {/* Half-hour faint lines */}
                        <div className="pointer-events-none absolute inset-0 flex flex-col">
                            {HOURS.map((hour) => (
                                <div
                                    key={`half-${hour}`}
                                    className="h-[60px] w-full"
                                    style={{
                                        borderBottom:
                                            '1px dashed rgba(255,255,255,0.025)',
                                        marginTop: '30px',
                                        height: '0',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Current time line */}
                        <div
                            className="pointer-events-none absolute left-0 right-0 z-30 border-t-[2px] border-red-500"
                            style={{
                                top: `${
                                    currentTime.getHours() * 60 +
                                    currentTime.getMinutes()
                                }px`,
                            }}
                        >
                            <div className="absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
                        </div>

                        {/* Day columns */}
                        {weekDays.map((day, dayIdx) => {
                            const dateKey = formatDateKey(day);
                            const rawDayEvents = events.filter(
                                (e) => e.date === dateKey && e.time
                            );
                            const blockEvents = calculateOverlaps(rawDayEvents);

                            const isSelectionDay =
                                !!selectionDisplay &&
                                selectionDisplay.dayIdx === dayIdx;
                            const isDropDay =
                                !!dropPreview && dropPreview.dateKey === dateKey;

                            return (
                                <WeekDayColumn
                                    key={dateKey}
                                    dateKey={dateKey}
                                    dayIdx={dayIdx}
                                    blockEvents={blockEvents}
                                    onEventClick={onEventClick}
                                    isSelectionDay={isSelectionDay}
                                    selectionTop={
                                        isSelectionDay
                                            ? selectionDisplay.top
                                            : 0
                                    }
                                    selectionHeight={
                                        isSelectionDay
                                            ? selectionDisplay.height
                                            : 0
                                    }
                                    dropPreview={
                                        isDropDay ? dropPreview : null
                                    }
                                />
                            );
                        })}

                        {/* Selection time bubble */}
                        {selectionDisplay && (
                            <div
                                className="pointer-events-none absolute z-40 -translate-y-full whitespace-nowrap rounded-md bg-accent-primary px-2 py-1 text-[10px] font-semibold text-white shadow-md"
                                style={{
                                    top: `${selectionDisplay.top - 4}px`,
                                    left: `calc(${
                                        (selectionDisplay.dayIdx * 100) / 7
                                    }% + 4px)`,
                                }}
                            >
                                {selectionDisplay.startStr} –{' '}
                                {selectionDisplay.endStr}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarWeekGrid;
