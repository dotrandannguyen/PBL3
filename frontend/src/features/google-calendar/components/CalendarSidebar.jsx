import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MINI_DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Tạo danh sách ngày cho mini calendar
 */
const getMiniCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];

    for (let i = startDay - 1; i >= 0; i--) {
        days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
};

const CalendarSidebar = ({ currentDate, selectedDate, events, onDateSelect }) => {
    const [miniDate, setMiniDate] = React.useState(currentDate);
    const today = new Date();

    React.useEffect(() => {
        setMiniDate(currentDate);
    }, [currentDate]);

    const miniDays = getMiniCalendarDays(miniDate.getFullYear(), miniDate.getMonth());

    // Lấy sự kiện của ngày được chọn
    const selectedDateStr = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : null;
    const selectedEvents = selectedDateStr
        ? events.filter(e => e.date === selectedDateStr)
        : [];

    const isSameDay = (d1, d2) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

    return (
        <aside className="w-[240px] border-l border-border-subtle bg-bg-sidebar flex flex-col p-3 overflow-y-auto shrink-0">
            {/* Mini Calendar */}
            <div className="mb-4">
                {/* Mini Calendar Header */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">
                        {MONTHS[miniDate.getMonth()]} {miniDate.getFullYear()}
                    </span>
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => setMiniDate(new Date(miniDate.getFullYear(), miniDate.getMonth() - 1, 1))}
                            className="p-1 rounded text-text-secondary hover:bg-bg-hover
                                       transition-colors duration-150 cursor-pointer border-none bg-transparent"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setMiniDate(new Date(miniDate.getFullYear(), miniDate.getMonth() + 1, 1))}
                            className="p-1 rounded text-text-secondary hover:bg-bg-hover
                                       transition-colors duration-150 cursor-pointer border-none bg-transparent"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Mini Day Names */}
                <div className="grid grid-cols-7 gap-0 mb-1">
                    {MINI_DAY_NAMES.map((d, i) => (
                        <div key={i} className="text-center text-[10px] text-text-tertiary font-medium py-0.5">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Mini Days Grid */}
                <div className="grid grid-cols-7 gap-0">
                    {miniDays.map(({ date, isCurrentMonth }, index) => {
                        const isToday = isSameDay(date, today);
                        const isSelected = selectedDate && isSameDay(date, selectedDate);

                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => onDateSelect?.(date)}
                                className={`
                                    w-full aspect-square flex items-center justify-center text-[11px] rounded-full
                                    border-none cursor-pointer transition-colors duration-150 bg-transparent
                                    ${!isCurrentMonth ? 'text-text-tertiary' : 'text-text-primary'}
                                    ${isToday ? 'bg-accent-primary text-white font-bold' : ''}
                                    ${isSelected && !isToday ? 'bg-bg-active text-text-primary' : ''}
                                    ${!isToday && !isSelected ? 'hover:bg-bg-hover' : ''}
                                `}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Date Events */}
            <div className="border-t border-border-subtle pt-3">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    {selectedDate
                        ? `Events on ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`
                        : 'Select a date'
                    }
                </h3>

                {selectedEvents.length === 0 ? (
                    <p className="text-xs text-text-tertiary">No events</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {selectedEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-start gap-2 p-2 rounded-md bg-bg-hover"
                            >
                                <span
                                    className="w-2 h-2 rounded-full mt-1 shrink-0"
                                    style={{ backgroundColor: event.color }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-text-primary truncate m-0">
                                        {event.title}
                                    </p>
                                    {event.time && (
                                        <p className="text-[10px] text-text-tertiary m-0 mt-0.5">
                                            {event.time}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default CalendarSidebar;
