import React from 'react';
import CalendarEvent from './CalendarEvent';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getStartOfWeek = (date) => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
    newDate.setDate(diff);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};

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

    const [selectionStart, setSelectionStart] = React.useState(null);
    const [selectionCurrent, setSelectionCurrent] = React.useState(null);

    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (selectionStart && selectionCurrent) {
                if (selectionStart.dateKey === selectionCurrent.dateKey) {
                    const startH = Math.min(selectionStart.hour, selectionCurrent.hour);
                    const endH = Math.max(selectionStart.hour, selectionCurrent.hour) + 1;
                    
                    const d = new Date(weekDays.find(w => formatDateKey(w) === selectionStart.dateKey));
                    
                    const startStr = `${String(startH).padStart(2, '0')}:00`;
                    const endStr = `${String(endH).padStart(2, '0')}:00`;
                    
                    onAddEventRange?.(d, startStr, endStr);
                }
                setSelectionStart(null);
                setSelectionCurrent(null);
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [selectionStart, selectionCurrent]);

    const handleMouseDown = (dateKey, hour, e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setSelectionStart({ dateKey, hour });
        setSelectionCurrent({ dateKey, hour });
    };

    const handleMouseEnter = (dateKey, hour) => {
        if (selectionStart) {
            setSelectionCurrent({ dateKey, hour });
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-bg-main overflow-hidden text-text-primary">
            {/* Week Header (Days) */}
            <div className="flex border-b border-border-subtle bg-bg-sidebar">
                <div className="w-[60px] flex-shrink-0 border-r border-border-subtle" /> {/* Time column spacer */}
                <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((day, idx) => {
                        const dayIsToday = isToday(day);
                        return (
                            <div key={idx} className="flex flex-col items-center justify-center py-2 border-r border-border-subtle last:border-r-0">
                                <span className={`text-[11px] font-medium uppercase mb-1 ${dayIsToday ? 'text-accent-primary' : 'text-text-secondary'}`}>
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative select-none">
                <div className="flex min-h-[1440px]"> {/* 24 hours * 60px height per hour */}
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

                        {weekDays.map((day, dayIdx) => {
                            const dateKey = formatDateKey(day);
                            // Get events for this day
                            const dayEvents = events.filter(e => e.date === dateKey);

                            return (
                                <div key={dateKey} className="relative flex flex-col border-r border-border-subtle last:border-r-0 h-full group">
                                    {/* Clickable Hour Cells */}
                                    <div className="absolute inset-0 flex flex-col z-0">
                                        {HOURS.map(hour => (
                                            <div 
                                                key={`${dateKey}-${hour}`} 
                                                className="h-[60px] w-full hover:bg-bg-block-hover cursor-pointer border-r border-transparent transition-colors"
                                                onMouseDown={(e) => handleMouseDown(dateKey, hour, e)}
                                                onMouseEnter={() => handleMouseEnter(dateKey, hour)}
                                            />
                                        ))}
                                    </div>

                                    {/* Selection Box Overlay */}
                                    {selectionStart && selectionCurrent && selectionStart.dateKey === dateKey && selectionCurrent.dateKey === dateKey && (
                                        <div 
                                            className="absolute pointer-events-none z-20"
                                            style={{
                                                top: `${Math.min(selectionStart.hour, selectionCurrent.hour) * 60}px`,
                                                height: `${(Math.abs(selectionCurrent.hour - selectionStart.hour) + 1) * 60}px`,
                                                left: '2px',
                                                right: '8px'
                                            }}
                                        >
                                            <div className="w-full h-full bg-accent-primary/20 border-2 border-accent-primary rounded-[4px]" />
                                        </div>
                                    )}

                                    {/* Render Events */}
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        {dayEvents.map(event => {
                                            if (!event.time) return null; // All day events need a different handling or top bar
                                            
                                            const [eventHour, eventMin] = event.time.split(':').map(Number);
                                            const startMinutes = (eventHour * 60) + (eventMin || 0);
                                            const topPos = (startMinutes / 60) * 60; // 60px per hour
                                            
                                            // Handle duration if exists, otherwise default 1 hr (60px)
                                            let durationMins = 60;
                                            if (event.endTime) {
                                                const [endH, endM] = event.endTime.split(':').map(Number);
                                                durationMins = (endH * 60 + (endM || 0)) - startMinutes;
                                            }
                                            if (durationMins < 30) durationMins = 30; // Min height

                                            return (
                                                <div 
                                                    key={event.id}
                                                    className="absolute pointer-events-auto shadow-sm"
                                                    style={{ 
                                                        top: `${topPos}px`, 
                                                        height: `${durationMins}px`,
                                                        left: '2px',
                                                        right: '8px',
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
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarWeekGrid;
