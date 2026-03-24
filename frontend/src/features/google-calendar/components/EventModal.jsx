import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, AlignLeft, Calendar as CalendarIcon, Bell, MapPin, Users, Video, ChevronDown } from 'lucide-react';

const EVENT_COLORS = [
    { name: 'Blue', value: '#2383e2' },
    { name: 'Red', value: '#e03e3e' },
    { name: 'Green', value: '#0f7b6c' },
    { name: 'Yellow', value: '#dfab01' },
    { name: 'Purple', value: '#9065b0' },
    { name: 'Pink', value: '#d44c90' },
    { name: 'Orange', value: '#d9730d' },
    { name: 'Gray', value: '#787774' },
];

// Generate time slots every 15 minutes
const generateTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hh = String(h).padStart(2, '0');
            const mm = String(m).padStart(2, '0');
            slots.push(`${hh}:${mm}`);
        }
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Format time to Vietnamese-style display (e.g., "6:30PM" → "6:30CH")
const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'CH' : 'SA';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')}${period}`;
};

// Calculate duration label between two time strings
const getDurationLabel = (startTime, endTimeStr) => {
    if (!startTime || !endTimeStr) return '';
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMins <= 0) return '';
    if (diffMins < 60) return `${diffMins} phút`;
    const hours = diffMins / 60;
    if (Number.isInteger(hours)) return `${hours} giờ`;
    return `${hours.toFixed(1).replace('.', ',')} giờ`;
};

// Format date in Vietnamese
const formatDateVN = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return `${dayNames[date.getDay()]}, ${d} tháng ${m}`;
};

// Custom TimePicker Dropdown component
const TimePicker = ({ value, onChange, label, startTimeRef, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll to the selected/nearest time when dropdown opens
    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const selectedItem = dropdownRef.current.querySelector('[data-selected="true"]');
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [isOpen]);

    const handleSelect = (slot) => {
        onChange(slot);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`px-3 py-1.5 rounded-md text-[14px] font-medium cursor-pointer border transition-colors
                    ${isOpen 
                        ? 'bg-[#e8f0fe] text-[#1967d2] border-[#1967d2]' 
                        : 'bg-bg-hover/50 text-text-primary border-transparent hover:bg-bg-hover'}`}
            >
                {value ? formatTimeDisplay(value) : (label || 'Chọn giờ')}
            </button>

            {isOpen && (
                <div 
                    ref={dropdownRef}
                    className="absolute top-full left-0 mt-1 w-[200px] max-h-[220px] overflow-y-auto
                               bg-bg-main border border-border-subtle rounded-lg shadow-2xl z-[60]
                               animate-[fadeIn_100ms_ease]"
                >
                    {TIME_SLOTS.map(slot => {
                        const duration = startTimeRef ? getDurationLabel(startTimeRef, slot) : '';
                        const isSelected = slot === value;
                        // Only show slots after start time for end time picker
                        if (startTimeRef && slot <= startTimeRef) return null;

                        return (
                            <button
                                key={slot}
                                type="button"
                                data-selected={isSelected ? 'true' : 'false'}
                                onClick={() => handleSelect(slot)}
                                className={`w-full text-left px-4 py-2.5 text-[14px] cursor-pointer border-none transition-colors
                                    ${isSelected 
                                        ? 'bg-[#e8f0fe] text-[#1967d2] font-medium' 
                                        : 'bg-transparent text-text-primary hover:bg-bg-hover'}`}
                            >
                                {formatTimeDisplay(slot)}
                                {duration && (
                                    <span className="text-text-tertiary ml-1">({duration})</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const EventModal = ({ isOpen, onClose, onSave, onDelete, event, selectedDate, prefillRange }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [color, setColor] = useState(EVENT_COLORS[0].value);
    const [type, setType] = useState('event');
    const [reminder, setReminder] = useState('30_min');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    useEffect(() => {
        if (event) {
            setTitle(event.title || '');
            setDate(event.date || '');
            setTime(event.time || '');
            setEndTime(event.endTime || '');
            setIsAllDay(event.isAllDay || false);
            setDescription(event.description || '');
            setLocation(event.location || '');
            setColor(event.color || EVENT_COLORS[0].value);
            setType(event.type || 'event');
            setReminder(event.reminder || '30_min');
            setShowConfirmDelete(false);
        } else if (selectedDate) {
            setTitle('');
            const y = selectedDate.getFullYear();
            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(selectedDate.getDate()).padStart(2, '0');
            setDate(`${y}-${m}-${d}`);
            if (prefillRange) {
                setTime(prefillRange.startTime || '');
                setEndTime(prefillRange.endTime || '');
                setIsAllDay(false);
            } else {
                setTime('');
                setEndTime('');
                setIsAllDay(false);
            }
            setDescription('');
            setLocation('');
            setColor(EVENT_COLORS[0].value);
            setType('event');
            setReminder('30_min');
            setShowConfirmDelete(false);
        }
    }, [event, selectedDate, isOpen, prefillRange]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !date) return;

        if (!isAllDay && time && endTime && endTime <= time) {
            alert('Giờ kết thúc phải lớn hơn giờ bắt đầu!');
            return;
        }

        onSave({
            id: event?.id || Date.now(),
            title: title.trim(),
            date,
            time: isAllDay ? null : (time || null),
            endTime: isAllDay ? null : (endTime || null),
            isAllDay,
            description: description.trim(),
            location: location.trim(),
            color,
            type,
            reminder,
        });
        onClose();
    };

    // Auto-set end time 1 hour after when start time changes
    const handleStartTimeChange = (newTime) => {
        setTime(newTime);
        if (newTime) {
            const [h, m] = newTime.split(':').map(Number);
            const endH = h + 1;
            if (endH < 24) {
                setEndTime(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
    };

    const isEditing = !!event;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/30 z-40 animate-[fadeIn_100ms_ease]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-[460px] bg-bg-main
                               rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.25)] overflow-visible animate-[fadeIn_150ms_ease] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Bar */}
                    <div className="flex justify-between items-center px-3 py-1.5 bg-bg-hover/40 rounded-t-lg">
                        <div className="w-8 h-1 rounded bg-border-subtle opacity-40" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full text-text-secondary hover:bg-bg-hover
                                       transition-colors duration-150 cursor-pointer border-none bg-transparent"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 pb-3 pt-3 flex flex-col gap-4">
                        {/* Title Input */}
                        <div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Thêm tiêu đề"
                                autoFocus
                                className="w-full text-[22px] bg-transparent text-text-primary placeholder:text-text-tertiary
                                           border-b-2 border-transparent focus:border-accent-primary
                                           focus:outline-none py-1 transition-colors leading-tight font-normal"
                            />
                        </div>

                        {/* Type Tabs */}
                        <div className="flex gap-1 items-center">
                            <button
                                type="button"
                                onClick={() => setType('event')}
                                className={`px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer border-none transition-colors
                                    ${type === 'event' 
                                        ? 'bg-[#d3e3fd] text-[#1a73e8]' 
                                        : 'bg-transparent text-text-secondary hover:bg-bg-hover'}`}
                            >
                                Sự kiện
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('task')}
                                className={`px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer border-none transition-colors
                                    ${type === 'task' 
                                        ? 'bg-[#d3e3fd] text-[#1a73e8]' 
                                        : 'bg-transparent text-text-secondary hover:bg-bg-hover'}`}
                            >
                                Việc cần làm
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('appointment')}
                                className={`px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer border-none transition-colors flex items-center gap-1
                                    ${type === 'appointment' 
                                        ? 'bg-[#d3e3fd] text-[#1a73e8]' 
                                        : 'bg-transparent text-text-secondary hover:bg-bg-hover'}`}
                            >
                                Lên lịch hẹn
                                <span className="bg-[#1a73e8] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">Mới</span>
                            </button>
                        </div>

                        {/* Date & Time Row */}
                        <div className="flex items-start gap-3">
                            <div className="mt-2 text-text-secondary shrink-0">
                                <Clock size={20} />
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Date chip */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-md text-[14px] font-medium cursor-pointer border border-transparent
                                                       bg-bg-hover/50 text-text-primary hover:bg-bg-hover transition-colors"
                                            onClick={() => document.getElementById('gc-date-input').showPicker?.()}
                                        >
                                            {formatDateVN(date) || 'Chọn ngày'}
                                        </button>
                                        <input
                                            id="gc-date-input"
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>

                                    {/* Time pickers */}
                                    {!isAllDay && (
                                        <>
                                            <TimePicker
                                                value={time}
                                                onChange={handleStartTimeChange}
                                                label="Giờ BĐ"
                                            />
                                            <span className="text-text-tertiary text-[14px]">–</span>
                                            <TimePicker
                                                value={endTime}
                                                onChange={setEndTime}
                                                label="Giờ KT"
                                                startTimeRef={time}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* All-day + Repeat */}
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-bg-hover px-2 py-1 rounded w-max transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={isAllDay} 
                                            onChange={(e) => setIsAllDay(e.target.checked)}
                                            className="w-4 h-4 rounded border-border-subtle text-accent-primary cursor-pointer accent-[#1a73e8]"
                                        />
                                        <span className="text-[13px] text-text-primary">Cả ngày</span>
                                    </label>
                                    <button type="button" className="flex items-center gap-1 text-[13px] text-text-tertiary px-2 py-1 cursor-pointer hover:bg-bg-hover rounded border-none bg-transparent transition-colors">
                                        Không lặp lại
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Guests row */}
                        <div className="flex items-center gap-3">
                            <div className="text-text-secondary shrink-0">
                                <Users size={20} />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Thêm khách" 
                                className="flex-1 bg-transparent text-text-primary text-[14px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded transition-colors placeholder:text-text-secondary border-none" 
                            />
                        </div>

                        {/* Video call row */}
                        <div className="flex items-center gap-3">
                            <div className="text-text-secondary shrink-0">
                                <Video size={20} />
                            </div>
                            <span className="text-[14px] text-text-secondary truncate">Thêm hội nghị truyền hình trên Google M...</span>
                        </div>

                        {/* Location row */}
                        <div className="flex items-center gap-3">
                            <div className="text-text-secondary shrink-0">
                                <MapPin size={20} />
                            </div>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={(e) => setLocation(e.target.value)} 
                                placeholder="Thêm vị trí" 
                                className="flex-1 bg-transparent text-text-primary text-[14px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded transition-colors placeholder:text-text-secondary border-none" 
                            />
                        </div>

                        {/* Description row */}
                        <div className="flex items-start gap-3">
                            <div className="text-text-secondary shrink-0 mt-1.5">
                                <AlignLeft size={20} />
                            </div>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Thêm mô tả" 
                                rows={2}
                                className="flex-1 bg-transparent text-text-primary text-[14px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded transition-colors placeholder:text-text-secondary resize-none border-none" 
                            />
                        </div>

                        {/* Notification row */}
                        <div className="flex items-center gap-3">
                            <div className="text-text-secondary shrink-0">
                                <Bell size={20} />
                            </div>
                            <select
                                value={reminder}
                                onChange={(e) => setReminder(e.target.value)}
                                className="bg-transparent text-[14px] text-text-primary focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded cursor-pointer transition-colors border-none"
                            >
                                <option value="none" className="bg-bg-main">Không nhắc</option>
                                <option value="10_min" className="bg-bg-main">10 phút trước</option>
                                <option value="30_min" className="bg-bg-main">30 phút trước</option>
                                <option value="1_hour" className="bg-bg-main">1 giờ trước</option>
                                <option value="1_day" className="bg-bg-main">Ngày hôm trước lúc 5PM</option>
                            </select>
                        </div>

                        {/* Calendar / Color */}
                        <div className="flex items-center gap-3">
                            <div className="text-text-secondary shrink-0">
                                <CalendarIcon size={20} />
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {EVENT_COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setColor(c.value)}
                                        className={`w-[18px] h-[18px] rounded-full cursor-pointer transition-all hover:scale-110 border-2
                                                  ${color === c.value ? 'border-text-primary scale-125' : 'border-transparent'}`}
                                        style={{ backgroundColor: c.value }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-5 py-3 bg-transparent border-t border-border-subtle">
                        <div>
                            {isEditing && onDelete ? (
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmDelete(true)}
                                    className="text-[13px] text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded font-medium transition cursor-pointer border-none bg-transparent"
                                >
                                    Xoá
                                </button>
                            ) : (
                                <div />
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="px-3 py-1.5 text-[13px] font-medium text-[#1a73e8] bg-transparent
                                           hover:bg-[#e8f0fe] rounded border-none cursor-pointer transition"
                            >
                                Tuỳ chọn khác
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-1.5 text-[13px] font-medium rounded text-white
                                           bg-[#1a73e8] border-none hover:bg-[#1765cc] hover:shadow-md
                                           transition-all duration-150 cursor-pointer"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Dialog */}
            {showConfirmDelete && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-[fadeIn_150ms_ease]">
                    <div className="bg-bg-main rounded-xl shadow-xl p-6 w-full max-w-sm border border-border-subtle animate-[scaleIn_150ms_ease]">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Xoá sự kiện</h3>
                        <p className="text-sm text-text-secondary mb-6">Bạn có chắc chắn muốn xoá sự kiện này không?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmDelete(false)}
                                className="px-4 py-2 text-sm font-medium rounded-md text-text-secondary bg-transparent hover:bg-bg-hover transition-colors border-none cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onDelete(event.id);
                                    setShowConfirmDelete(false);
                                    onClose();
                                }}
                                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors border-none cursor-pointer shadow-sm"
                            >
                                Xoá
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EventModal;
