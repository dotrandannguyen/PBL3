import React from 'react';
import CalendarDayCell from './CalendarDayCell';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Tính toán ngày bắt đầu và kết thúc hiển thị trên lưới calendar
 */
const getCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Ngày bắt đầu (Monday = 1, ..., Sunday = 7) → điều chỉnh để Monday = 0
    let startDay = firstDay.getDay(); // 0 = Sunday
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday-based

    const days = [];

    // Ngày tháng trước
    for (let i = startDay - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        days.push(d);
    }

    // Ngày tháng hiện tại
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
    }

    // Ngày tháng sau (đủ 42 ô = 6 tuần)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push(new Date(year, month + 1, i));
    }

    return days;
};

/**
 * Lấy events cho một ngày cụ thể
 */
const getEventsForDate = (date, events) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
};

const CalendarGrid = ({ currentDate, events, onDateClick, onEventClick }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const days = getCalendarDays(year, month);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day Names Header */}
            <div className="grid grid-cols-7 border-b border-border-subtle">
                {DAY_NAMES.map((day) => (
                    <div
                        key={day}
                        className="text-center text-xs font-medium text-text-tertiary py-2
                                   border-r border-border-subtle last:border-r-0 uppercase tracking-wider"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
                {days.map((date, index) => {
                    const isToday =
                        date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();

                    const isCurrentMonth = date.getMonth() === month;
                    const dayEvents = getEventsForDate(date, events);

                    return (
                        <CalendarDayCell
                            key={index}
                            date={date}
                            isToday={isToday}
                            isCurrentMonth={isCurrentMonth}
                            events={dayEvents}
                            onClick={onDateClick}
                            onEventClick={onEventClick}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarGrid;
