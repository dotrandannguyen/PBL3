import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const CalendarHeader = ({ currentDate, onPrev, onNext, onToday, onAddEvent }) => {
    const month = MONTHS[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    return (
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            {/* Left: Navigation */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onToday}
                    className="px-3 py-1.5 text-sm rounded-md border border-border-subtle
                               text-text-primary bg-transparent hover:bg-bg-hover
                               transition-colors duration-150 cursor-pointer"
                >
                    Today
                </button>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="p-1.5 rounded-md text-text-secondary hover:bg-bg-hover
                                   transition-colors duration-150 cursor-pointer border-none bg-transparent"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        className="p-1.5 rounded-md text-text-secondary hover:bg-bg-hover
                                   transition-colors duration-150 cursor-pointer border-none bg-transparent"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <h2 className="text-lg font-semibold text-text-primary m-0">
                    {month} {year}
                </h2>
            </div>

            {/* Right: Add Event */}
            <button
                type="button"
                onClick={onAddEvent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md
                           bg-accent-primary text-white border-none cursor-pointer
                           hover:bg-accent-hover transition-colors duration-150"
            >
                <Plus size={16} />
                Add Event
            </button>
        </header>
    );
};

export default CalendarHeader;
