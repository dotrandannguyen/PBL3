import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, AlignLeft, Bell, MapPin, Users, Video, ChevronDown, GripHorizontal, Calendar as CalendarIcon } from 'lucide-react';

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

// Format time display: "13:30" → "1:30 PM"
const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
};

// Calculate duration label
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

// Parse user input like "1:30 PM", "13:30", "1:30PM", "130pm" → "HH:MM" (24h)
const parseTimeInput = (input) => {
    if (!input) return null;
    const s = input.trim().toLowerCase().replace(/\s+/g, '');
    // Try "HH:MM" 24-hour
    let match = s.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        const h = parseInt(match[1]), m = parseInt(match[2]);
        if (h >= 0 && h < 24 && m >= 0 && m < 60)
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    // Try "H:MMam/pm" or "H:MM am/pm"
    match = s.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    if (match) {
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const ampm = match[3];
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        if (h >= 0 && h < 24 && m >= 0 && m < 60)
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    // Try "HMMam/pm" (no colon, e.g. "130pm")
    match = s.match(/^(\d{1,2})(\d{2})(am|pm)$/);
    if (match) {
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const ampm = match[3];
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        if (h >= 0 && h < 24 && m >= 0 && m < 60)
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
};

// ─── Custom TimePicker: editable input + dropdown ──────
const TimePicker = ({ value, onChange, startTimeRef }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Sync display text when value changes externally
    useEffect(() => {
        if (!isOpen) {
            setInputText(value ? formatTimeDisplay(value) : '');
        }
    }, [value, isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                commitInput();
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputText]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            inputRef.current?.select();
            // Scroll to selected item
            setTimeout(() => {
                const selected = containerRef.current?.querySelector('[data-selected="true"]');
                if (selected) selected.scrollIntoView({ block: 'center' });
            }, 50);
        }
    }, [isOpen]);

    const commitInput = () => {
        const parsed = parseTimeInput(inputText);
        if (parsed) {
            onChange(parsed);
        } else {
            // Reset to current value
            setInputText(value ? formatTimeDisplay(value) : '');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitInput();
            setIsOpen(false);
        }
        if (e.key === 'Escape') {
            setInputText(value ? formatTimeDisplay(value) : '');
            setIsOpen(false);
        }
    };

    const handleSelect = (slot) => {
        onChange(slot);
        setInputText(formatTimeDisplay(slot));
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Closed state: chip button */}
            {!isOpen ? (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer border border-transparent
                               bg-bg-hover text-text-primary hover:bg-bg-active transition-all duration-150"
                >
                    {value ? formatTimeDisplay(value) : '—'}
                </button>
            ) : (
                /* Open state: editable input */
                <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-[100px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-accent-primary/40
                               bg-accent-primary/10 text-accent-primary focus:outline-none"
                    placeholder="7:00 PM"
                />
            )}

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1.5 w-[220px] max-h-[200px] overflow-y-auto
                               bg-bg-sidebar border border-border-subtle rounded-xl shadow-2xl z-[60]"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {TIME_SLOTS.map(slot => {
                        const duration = startTimeRef ? getDurationLabel(startTimeRef, slot) : '';
                        if (startTimeRef && slot <= startTimeRef) return null;
                        const isSelected = slot === value;

                        return (
                            <button
                                key={slot}
                                type="button"
                                data-selected={isSelected ? 'true' : 'false'}
                                onClick={() => handleSelect(slot)}
                                className={`w-full text-left px-4 py-2 text-[13px] cursor-pointer border-none transition-colors
                                    ${isSelected
                                        ? 'bg-accent-primary/15 text-accent-primary font-semibold'
                                        : 'bg-transparent text-text-primary hover:bg-bg-hover'}`}
                            >
                                {formatTimeDisplay(slot)}
                                {duration && (
                                    <span className="text-text-tertiary ml-1.5 font-normal">({duration})</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Custom Select Dropdown ──────
const CustomSelect = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="relative flex-1" ref={containerRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className={`w-full bg-bg-hover text-text-primary text-[13px] pl-4 pr-3 py-1.5 rounded-full border-none cursor-pointer 
                            focus:outline-none flex justify-between items-center transition-colors hover:bg-bg-active
                            ${isOpen ? 'ring-2 ring-accent-primary/20' : ''}`}
            >
                <span className="truncate">{selectedOption?.label}</span>
                <ChevronDown size={14} className={`text-text-tertiary transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <div
                className={`absolute left-0 right-0 top-[calc(100%+6px)] bg-bg-sidebar border border-border-subtle rounded-xl 
                           shadow-2xl z-50 flex flex-col py-1.5 transition-all duration-200 origin-top
                           ${isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 translate-y-[-4px] invisible pointer-events-none'}`}
            >
                {options.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            onChange(opt.value);
                            setIsOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-[13px] cursor-pointer transition-colors border-none min-h-[34px] flex items-center
                            ${opt.value === value ? 'bg-accent-primary/10 text-accent-primary font-medium' : 'bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'}
                        `}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── Main EventModal ───────────────────────────────────
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
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const [status, setStatus] = useState('busy');
    const [visibility, setVisibility] = useState('default');

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
                const now = new Date();
                const currentH = now.getHours();
                const defaultStart = `${String(currentH).padStart(2, '0')}:00`;
                const endH = currentH + 1 < 24 ? currentH + 1 : 23;
                const defaultEnd = `${String(endH).padStart(2, '0')}:00`;
                setTime(defaultStart);
                setEndTime(defaultEnd);
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
                className="fixed inset-0 bg-black/40 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-[480px] bg-bg-main rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.35)]
                               overflow-visible flex flex-col border border-border-subtle"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ─── Header ─── */}
                    <div className="flex justify-between items-center px-5 pt-3 pb-1">
                        <GripHorizontal size={18} className="text-text-tertiary cursor-grab" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover
                                       transition-colors cursor-pointer border-none bg-transparent"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* ─── Body ─── */}
                    <div className="px-6 pb-2 pt-1 flex flex-col gap-5">

                        {/* Title Input */}
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Thêm tiêu đề"
                            autoFocus
                            className="w-full text-[22px] bg-transparent text-text-primary placeholder:text-text-tertiary
                                       border-none border-b-2 border-b-transparent focus:border-b-accent-primary
                                       focus:outline-none py-1.5 transition-colors font-normal leading-tight"
                            style={{ borderBottom: '2px solid', borderBottomColor: title ? 'var(--accent-primary, #2383e2)' : 'var(--border-subtle, #333)' }}
                        />

                        {/* Event Type Tabs */}
                        <div className="flex gap-2 items-center">
                            <button
                                type="button"
                                className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold cursor-default border-none transition-all duration-150
                                           bg-accent-primary/15 text-accent-primary"
                            >
                                Sự kiện
                            </button>
                        </div>


                        {/* ─── Date & Time Section ─── */}
                        <div className="flex items-start gap-4">
                            <Clock size={18} className="text-text-tertiary mt-2 shrink-0" />
                            <div className="flex-1 flex flex-col gap-2.5">
                                {/* Row 1: Date + Times */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="relative">
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer
                                                       bg-bg-hover text-text-primary hover:bg-bg-active transition-colors border-none"
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
                                            tabIndex={-1}
                                        />
                                    </div>

                                    {!isAllDay && (
                                        <>
                                            <TimePicker value={time} onChange={handleStartTimeChange} />
                                            <span className="text-text-tertiary text-xs">–</span>
                                            <TimePicker value={endTime} onChange={setEndTime} startTimeRef={time} />
                                        </>
                                    )}
                                </div>

                                {/* Row 2: All-day + Timezone */}
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                                            ${isAllDay ? 'bg-text-primary border-text-primary' : 'bg-transparent border-text-tertiary'}`}
                                            onClick={(e) => { e.preventDefault(); setIsAllDay(!isAllDay); }}
                                        >
                                            {isAllDay && (
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4L3.5 6.5L9 1" stroke="var(--bg-main, #191919)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-[13px] text-text-primary">Cả ngày</span>
                                    </label>
                                    <span className="text-[13px] text-accent-primary cursor-pointer hover:underline">Múi giờ</span>
                                </div>
                            </div>
                        </div>

                        {/* ─── Info Rows ─── */}
                        <div className="flex flex-col gap-4">
                            {/* Guests */}
                            <div className="flex items-center gap-4">
                                <Users size={18} className="text-text-tertiary shrink-0" />
                                <span className="text-[13px] text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
                                    Thêm khách
                                </span>
                            </div>

                            {/* Google Meet */}
                            <div className="flex items-center gap-4">
                                <Video size={18} className="text-text-tertiary shrink-0" />
                                <span className="text-[13px] text-text-secondary cursor-pointer hover:text-text-primary transition-colors truncate">
                                    Thêm hội nghị truyền hình trên Google Meet
                                </span>
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-4">
                                <MapPin size={18} className="text-text-tertiary shrink-0" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Thêm vị trí"
                                    className="flex-1 bg-transparent text-text-primary text-[13px] focus:outline-none
                                               placeholder:text-text-secondary border-none py-0"
                                />
                            </div>

                            {/* Description */}
                            <div className="flex items-start gap-4">
                                <AlignLeft size={18} className="text-text-tertiary shrink-0 mt-0.5" />
                                <textarea
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        // Auto-grow
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    placeholder="Thêm mô tả hoặc tệp đính kèm"
                                    rows={1}
                                    className="flex-1 bg-transparent text-text-primary text-[13px] focus:outline-none
                                               placeholder:text-text-secondary border-none resize-none py-0 overflow-hidden"
                                    style={{ minHeight: '20px' }}
                                />
                            </div>

                            {/* Calendar / Profile — Expandable */}
                            <div className="flex items-start gap-4">
                                <CalendarIcon size={18} className="text-text-tertiary shrink-0 mt-0.5" />
                                <div className="flex-1 flex flex-col gap-1.5">
                                    {/* Collapsed: clickable summary */}
                                    <button
                                        type="button"
                                        onClick={() => setShowProfilePopup(!showProfilePopup)}
                                        className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0 text-left w-full group"
                                    >
                                        <span className="text-[13px] text-text-primary font-medium">Thành Luân Nguyễn</span>
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <ChevronDown size={14} className={`text-text-tertiary transition-transform ${showProfilePopup ? 'rotate-180' : ''}`} />
                                    </button>

                                    {!showProfilePopup && (
                                        <span className="text-[11px] text-text-tertiary leading-tight">
                                            {status === 'busy' ? 'Bận' : 'Rảnh'} • {visibility === 'default' ? 'Chế độ hiển thị mặc định' : 'Riêng tư'} • Thông báo {reminder === '10_min' ? '10 phút' : reminder === '30_min' ? '30 phút' : reminder === '1_hour' ? '1 giờ' : reminder === '1_day' ? '1 ngày' : 'không'} trước
                                        </span>
                                    )}

                                    {/* Expanded popup */}
                                    {showProfilePopup && (
                                        <div className="flex flex-col gap-3 mt-2 p-3 bg-bg-hover/50 rounded-xl border border-border-subtle">
                                            {/* Color picker */}
                                            <div className="flex items-center gap-1.5">
                                                {EVENT_COLORS.map((c) => (
                                                    <button
                                                        key={c.value}
                                                        type="button"
                                                        onClick={() => setColor(c.value)}
                                                        className={`w-5 h-5 rounded-full cursor-pointer transition-all hover:scale-125 border-[1.5px]
                                                                  ${color === c.value ? 'border-text-primary scale-110' : 'border-transparent'}`}
                                                        style={{ backgroundColor: c.value }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Status */}
                                            <div className="flex items-center gap-3">
                                                <CalendarIcon size={16} className="text-text-tertiary shrink-0" />
                                                <CustomSelect
                                                    value={status}
                                                    onChange={setStatus}
                                                    options={[
                                                        { value: "busy", label: "Bận" },
                                                        { value: "free", label: "Rảnh" }
                                                    ]}
                                                />
                                            </div>

                                            {/* Visibility */}
                                            <div className="flex items-center gap-3">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary shrink-0">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                                                </svg>
                                                <CustomSelect
                                                    value={visibility}
                                                    onChange={setVisibility}
                                                    options={[
                                                        { value: "default", label: "Chế độ hiển thị mặc định" },
                                                        { value: "private", label: "Riêng tư" },
                                                        { value: "public", label: "Công khai" }
                                                    ]}
                                                />
                                            </div>

                                            {/* Notification */}
                                            <div className="flex items-center gap-3">
                                                <Bell size={16} className="text-text-tertiary shrink-0" />
                                                <CustomSelect
                                                    value={reminder}
                                                    onChange={setReminder}
                                                    options={[
                                                        { value: "none", label: "Không nhắc" },
                                                        { value: "10_min", label: "10 phút trước" },
                                                        { value: "30_min", label: "30 phút trước" },
                                                        { value: "1_hour", label: "1 giờ trước" },
                                                        { value: "1_day", label: "1 ngày trước" }
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Footer ─── */}
                    <div className="flex items-center justify-between px-6 py-3.5 mt-1 border-t border-border-subtle">
                        <div>
                            {isEditing && onDelete ? (
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmDelete(true)}
                                    className="text-[13px] text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg font-medium
                                               transition cursor-pointer border-none bg-transparent"
                                >
                                    Xoá
                                </button>
                            ) : (
                                <div />
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className="text-[13px] font-medium text-accent-primary bg-transparent
                                           hover:bg-accent-primary/10 px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
                            >
                                Tuỳ chọn khác
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-1.5 text-[13px] font-semibold rounded-full text-white
                                           bg-accent-primary border-none hover:brightness-110
                                           transition-all duration-150 cursor-pointer shadow-sm"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ─── Delete Confirmation ─── */}
            {showConfirmDelete && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
                    <div className="bg-bg-main rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border-subtle">
                        <h3 className="text-base font-semibold text-text-primary mb-2">Xoá sự kiện</h3>
                        <p className="text-[13px] text-text-secondary mb-5">Bạn có chắc chắn muốn xoá sự kiện này không?</p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmDelete(false)}
                                className="px-4 py-1.5 text-[13px] font-medium rounded-lg text-text-secondary bg-transparent
                                           hover:bg-bg-hover transition-colors border-none cursor-pointer"
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
                                className="px-4 py-1.5 text-[13px] font-medium rounded-lg text-white bg-red-600
                                           hover:bg-red-700 transition-colors border-none cursor-pointer"
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
