import React, { useState, useEffect, useRef, useCallback } from 'react';
import CalendarEvent from './CalendarEvent';
import { useDroppable } from '@dnd-kit/core';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_MINS = 15; // 15-minute granularity
const SLOTS_PER_HOUR = 60 / SLOT_MINS; // 4 slots per hour

const getStartOfWeek = (date) => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
    newDate.setDate(diff);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};

// Calculate overlapping columns — per-cluster so non-overlapping events get full width
const calculateOverlaps = (dayEvents) => {
    if (!dayEvents.length) return [];

    const parsed = dayEvents.map(e => {
        const [sh, sm] = e.time ? e.time.split(':').map(Number) : [0, 0];
        const [eh, em] = e.endTime ? e.endTime.split(':').map(Number) : [sh + 1, sm];
        return { ...e, startMin: sh * 60 + sm, endMin: eh * 60 + em };
    }).sort((a, b) => a.startMin - b.startMin);

    // 1. Group into overlap clusters
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

    // 2. For each cluster, assign columns
    const result = [];
    clusters.forEach(cluster => {
        const columns = [];
        cluster.forEach(evt => {
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
        cluster.forEach(evt => {
            evt.colIdx = evt._colIdx;
            evt.numCols = numCols;
            delete evt._colIdx;
            result.push(evt);
        });
    });

    return result;
};

// Single droppable per day column — lightweight, no per-slot hooks
const WeekDayColumn = React.memo(({ dateKey, blockEvents, onEventClick, selectionStart, selectionCurrent, handleMouseDown, handleMouseEnter }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${dateKey}`,
        data: { date: dateKey },
    });

    return (
        <div
            ref={setNodeRef}
            className={`relative flex flex-col border-r border-border-subtle last:border-r-0 h-full group transition-colors duration-100 ${isOver ? 'bg-accent-primary/5' : ''}`}
        >
            {/* Clickable 15-min Cells for selection (no dnd hooks — just mouse events) */}
            <div className="absolute inset-0 flex flex-col z-0">
                {HOURS.map(hour => (
                    <div key={`${dateKey}-${hour}`} className="h-[60px] w-full flex flex-col">
                        {Array.from({ length: SLOTS_PER_HOUR }, (_, slotIdx) => (
                            <div
                                key={slotIdx}
                                className="flex-1 hover:bg-bg-block-hover/50 cursor-pointer transition-colors duration-75"
                                onMouseDown={(e) => handleMouseDown(dateKey, hour, slotIdx, e)}
                                onMouseEnter={() => handleMouseEnter(dateKey, hour, slotIdx)}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* Selection Box Overlay */}
            {selectionStart && selectionCurrent && selectionStart.dateKey === dateKey && selectionCurrent.dateKey === dateKey && (
                <div
                    className="absolute pointer-events-none z-20"
                    style={{
                        top: `${Math.min(selectionStart.mins, selectionCurrent.mins)}px`,
                        height: `${Math.abs(selectionCurrent.mins - selectionStart.mins) + SLOT_MINS}px`,
                        left: '2px',
                        right: '8px'
                    }}
                >
                    <div className="w-full h-full bg-accent-primary/20 border border-accent-primary rounded-[3px] shadow-sm backdrop-blur-[1px]" />
                </div>
            )}

            {/* Render Events */}
            <div className="absolute inset-0 pointer-events-none z-10">
                {blockEvents.map(event => {
                    const durationMins = event.endMin - event.startMin;

                    // Overlap positioning
                    const widthPct = 100 / event.numCols;
                    const leftPct = widthPct * event.colIdx;

                    return (
                        <div
                            key={event.id}
                            className="absolute pointer-events-auto"
                            style={{
                                top: `${event.startMin}px`,
                                height: `${Math.max(durationMins, 15)}px`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                paddingTop: '2px',
                                paddingBottom: '2px'
                            }}
                        >
                            <CalendarEvent event={event} onClick={onEventClick} className="!mb-0" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

const CalendarWeekGrid = ({ currentDate, events = [], onDateClick, onEventClick, onAddEventRange }) => {
    const startOfWeek = getStartOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
    });

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const formatDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Selection Drag state
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionCurrent, setSelectionCurrent] = useState(null);
    const gridRef = useRef(null);

    // Current Time
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleMouseUp = useCallback(() => {
        if (selectionStart && selectionCurrent) {
            if (selectionStart.dateKey === selectionCurrent.dateKey) {
                const startMins = Math.min(selectionStart.mins, selectionCurrent.mins);
                const endMins = Math.max(selectionStart.mins, selectionCurrent.mins) + SLOT_MINS;

                const d = new Date(weekDays.find(w => formatDateKey(w) === selectionStart.dateKey));

                const sh = Math.floor(startMins / 60);
                const sm = startMins % 60;
                const eh = Math.floor(endMins / 60);
                const em = endMins % 60;

                const startStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
                const endStr = `${String(Math.min(eh, 23)).padStart(2, '0')}:${String(Math.min(em, 59)).padStart(2, '0')}`;

                onAddEventRange?.(d, startStr, endStr);
            }
            setSelectionStart(null);
            setSelectionCurrent(null);
        }
    }, [selectionStart, selectionCurrent, weekDays, onAddEventRange]);

    const handleMouseDown = useCallback((dateKey, hour, slotIdx, e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const mins = hour * 60 + (slotIdx * SLOT_MINS);
        setSelectionStart({ dateKey, mins });
        setSelectionCurrent({ dateKey, mins });
    }, []);

    const handleMouseEnter = useCallback((dateKey, hour, slotIdx) => {
        if (selectionStart) {
            setSelectionCurrent({ dateKey, mins: hour * 60 + (slotIdx * SLOT_MINS) });
        }
    }, [selectionStart]);

    return (
        <div
            className="flex-1 flex flex-col bg-bg-main overflow-hidden text-text-primary"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Scrollable Container for both Header and Body guaranteeing alignment */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative select-none bg-bg-main" ref={gridRef}>

                {/* STICKY Week Header (Days) */}
                <div className="sticky top-0 z-40 flex border-b border-border-subtle bg-bg-sidebar shadow-sm">
                    <div className="w-[60px] flex-shrink-0 border-r border-border-subtle" />
                    <div className="flex-1 grid grid-cols-7">
                        {weekDays.map((day, idx) => {
                            const dayIsToday = isToday(day);
                            return (
                                <div key={idx} className="flex flex-col items-center justify-center py-2 border-r border-border-subtle last:border-r-0">
                                    <span className={`text-[11px] font-semibold uppercase mb-1 ${dayIsToday ? 'text-accent-primary' : 'text-text-secondary'}`}>
                                        {DAYS_OF_WEEK[idx]}
                                    </span>
                                    <span className={`text-xl flex items-center justify-center w-8 h-8 rounded-full ${dayIsToday ? 'bg-accent-primary text-white font-bold' : 'text-text-primary hover:bg-bg-hover cursor-pointer'}`}>
                                        {day.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Week Body (Time Grid) */}
                <div className="flex min-h-[1440px]" data-week-time-grid="true">
                    {/* Time Axis */}
                    <div className="w-[60px] flex flex-col flex-shrink-0 border-r border-border-subtle bg-bg-main">
                        {HOURS.map(hour => (
                            <div key={`time-${hour}`} className="h-[60px] flex justify-end pr-2 pt-1 border-b border-transparent">
                                <span className="text-[11px] text-text-tertiary">
                                    {hour === 0 ? '' : `${hour}:00`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    <div className="flex-1 grid grid-cols-7 relative">
                        {/* Horizontal Hour Lines (Background) */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col">
                            {HOURS.map(hour => (
                                <div key={`line-${hour}`} className="h-[60px] border-b border-border-subtle w-full opacity-50" />
                            ))}
                        </div>

                        {/* Current Time Line */}
                        <div
                            className="absolute z-30 pointer-events-none left-0 right-0 border-t-[2px] border-red-500"
                            style={{ top: `${(currentTime.getHours() * 60) + currentTime.getMinutes()}px` }}
                        >
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full absolute -top-[5px] -left-[5px] shadow-sm" />
                        </div>

                        {weekDays.map((day, dayIdx) => {
                            const dateKey = formatDateKey(day);
                            const rawDayEvents = events.filter(e => e.date === dateKey && e.time);
                            const blockEvents = calculateOverlaps(rawDayEvents);

                            return (
                                <WeekDayColumn
                                    key={dateKey}
                                    dateKey={dateKey}
                                    blockEvents={blockEvents}
                                    onEventClick={onEventClick}
                                    selectionStart={selectionStart}
                                    selectionCurrent={selectionCurrent}
                                    handleMouseDown={handleMouseDown}
                                    handleMouseEnter={handleMouseEnter}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarWeekGrid;
