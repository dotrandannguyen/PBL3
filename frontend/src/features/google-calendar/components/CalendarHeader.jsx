import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const CalendarHeader = ({ currentDate, onPrev, onNext, onToday, viewMode, onViewModeChange }) => {
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

            {/* Right: View Mode Toggle */}
            {onViewModeChange && (
                <div className="flex items-center bg-bg-hover rounded-md p-0.5 border border-border-subtle">
                    <button
                        type="button"
                        onClick={() => onViewModeChange('month')}
                        className={`px-3 py-1 text-[13px] font-medium rounded-sm transition-colors cursor-pointer border-none
                            ${viewMode === 'month' ? 'bg-bg-sidebar text-text-primary shadow-sm' : 'text-text-secondary bg-transparent hover:text-text-primary'}`}
                    >
                        Tháng
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewModeChange('week')}
                        className={`px-3 py-1 text-[13px] font-medium rounded-sm transition-colors cursor-pointer border-none
                            ${viewMode === 'week' ? 'bg-bg-sidebar text-text-primary shadow-sm' : 'text-text-secondary bg-transparent hover:text-text-primary'}`}
                    >
                        Tuần
                    </button>
                </div>
            )}
        </header>
    );
};

export default CalendarHeader;
