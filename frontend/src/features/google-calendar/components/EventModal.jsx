import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Clock, AlignLeft, Bell, MapPin, Users, Video, ChevronDown, GripHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

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
// getDurationLabel is now defined inside the component to access t()

// Format date in Vietnamese
// formatDateLocal is now defined inside the component to access t()

/* ── Helpers from incoming (logic) ──────────────────────────── */
// getReminderLabel is now defined inside the component to access t()

const toHHMM = (isoValue) => {
    if (!isoValue) return '';
    const dateObj = new Date(isoValue);
    if (Number.isNaN(dateObj.getTime())) return '';
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const toDateOnly = (isoValue) => {
    if (!isoValue) return '';
    const dateObj = new Date(isoValue);
    if (Number.isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Parse user input like "1:30 PM", "13:30", "1:30PM", "130pm" → "HH:MM" (24h)
const parseTimeInput = (input) => {
    if (!input) return null;
    const s = input.trim().toLowerCase().replace(/\s+/g, '');
    let match = s.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        const h = parseInt(match[1]), m = parseInt(match[2]);
        if (h >= 0 && h < 24 && m >= 0 && m < 60)
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
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

// ─── Custom TimePicker: editable input + dropdown (UI from HEAD) ──────
const TimePicker = ({ value, onChange, startTimeRef }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

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

// ─── Custom Select Dropdown (UI from HEAD) ──────
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
// UI: HEAD (CustomSelect, TimePicker, layout)
// Logic: Incoming (endDate, isTaskLinkedEvent, calendarOwnerName, async onSave/onDelete, reminder enums)
const EventModal = ({ isOpen, onClose, onSave, onDelete, event, selectedDate, prefillRange }) => {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [color, setColor] = useState(EVENT_COLORS[0].value);
    const [type, setType] = useState('event');
    const [reminder, setReminder] = useState('NONE');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const [status, setStatus] = useState('busy');
    const [visibility, setVisibility] = useState('default');

    // Translated helpers (need t() from context)
    const getDurationLabel = (startTime, endTimeStr) => {
        if (!startTime || !endTimeStr) return '';
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTimeStr.split(':').map(Number);
        const diffMins = (eh * 60 + em) - (sh * 60 + sm);
        if (diffMins <= 0) return '';
        if (diffMins < 60) return `${diffMins} ${t('cal.duration.minutes')}`;
        const hours = diffMins / 60;
        if (Number.isInteger(hours)) return `${hours} ${t('cal.duration.hours')}`;
        return `${hours.toFixed(1)} ${t('cal.duration.hours')}`;
    };

    const formatDateLocal = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayName = t(`cal.dayName.${dateObj.getDay()}`);
        const monthWord = t('cal.dateFormat.month');
        return monthWord ? `${dayName}, ${d} ${monthWord} ${m}` : `${dayName}, ${t(`cal.month.${m - 1}`)} ${d}`;
    };

    const getReminderLabel = (rem) => {
        if (rem === 'MINUTES_5') return t('cal.modal.remind5').replace(` ${t('cal.modal.reminderBefore')}`, '');
        if (rem === 'MINUTES_15') return t('cal.modal.remind15').replace(` ${t('cal.modal.reminderBefore')}`, '');
        if (rem === 'HOUR_1') return t('cal.modal.remind60').replace(` ${t('cal.modal.reminderBefore')}`, '');
        return t('cal.modal.noReminder');
    };

    // Logic from incoming: detect task-linked events
    const isTaskLinkedEvent = Boolean(event?.endAt);

    // Logic from incoming: resolve calendar owner name
    const calendarOwnerName = useMemo(() => {
        if (event?.calendarOwner && typeof event.calendarOwner === 'string') {
            return event.calendarOwner;
        }
        try {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) return t('cal.modal.myCalendar');
            const parsedUser = JSON.parse(storedUser);
            return parsedUser?.fullName || parsedUser?.name || parsedUser?.email || t('cal.modal.myCalendar');
        } catch {
            return t('cal.modal.myCalendar');
        }
    }, [event, t]);

    useEffect(() => {
        if (event) {
            setTitle(event.title || '');
            setDate(event.date || '');
            setTime(event.time || '');
            setEndTime(event.endTime || toHHMM(event.endAt));
            setEndDate(event.endDate || toDateOnly(event.endAt) || event.date || '');
            setIsAllDay(isTaskLinkedEvent ? false : (event.isAllDay || false));
            setDescription(event.description || '');
            setLocation(event.location || '');
            setColor(event.color || EVENT_COLORS[0].value);
            setType(event.type || 'event');
            setReminder(event.reminder || 'NONE');
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
                setEndDate(`${y}-${m}-${d}`);
                setIsAllDay(false);
            } else {
                const now = new Date();
                const currentH = now.getHours();
                const defaultStart = `${String(currentH).padStart(2, '0')}:00`;
                const endH = currentH + 1 < 24 ? currentH + 1 : 23;
                const defaultEnd = `${String(endH).padStart(2, '0')}:00`;
                setTime(defaultStart);
                setEndTime(defaultEnd);
                setEndDate(`${y}-${m}-${d}`);
                setIsAllDay(false);
            }
            setDescription('');
            setLocation('');
            setColor(EVENT_COLORS[0].value);
            setType('event');
            setReminder('NONE');
            setShowConfirmDelete(false);
        }
    }, [event, selectedDate, isOpen, prefillRange, isTaskLinkedEvent]);

    if (!isOpen) return null;

    // Logic from incoming: async submit with endDate, endAt
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !date) return;

        const resolvedEndDate = endDate || date;
        const startAt = !isAllDay && time ? new Date(`${date}T${time}:00`) : null;
        const endAt = !isAllDay && endTime ? new Date(`${resolvedEndDate}T${endTime}:00`) : null;

        if (startAt && endAt && !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()) && endAt <= startAt) {
            alert(t('cal.modal.endTimeError'));
            return;
        }

        const didSave = await onSave({
            id: event?.id || Date.now(),
            title: title.trim(),
            date,
            time: isAllDay ? null : (time || null),
            endTime: isAllDay ? null : (endTime || null),
            endDate: isAllDay ? null : resolvedEndDate,
            endAt: (isAllDay || !endAt || Number.isNaN(endAt.getTime())) ? null : endAt.toISOString(),
            isAllDay,
            description: description.trim(),
            location: location.trim(),
            color,
            type,
            reminder,
        });

        if (didSave !== false) {
            onClose();
        }
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

    // Logic from incoming: separate start/end date handlers
    const handleStartDateChange = (newDate) => {
        setDate(newDate);
        setEndDate((prev) => prev || newDate);
    };

    const handleEndDateChange = (newDate) => {
        setEndDate(newDate);
    };

    const resolvedEndDateForUi = endDate || date;
    const isSameDayRange = Boolean(date) && Boolean(resolvedEndDateForUi) && date === resolvedEndDateForUi;

    const isEditing = !!event;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-backdrop-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <form
                    onSubmit={handleSubmit}
                    className="flex w-full max-w-[420px] flex-col overflow-visible rounded-xl border border-border-subtle bg-bg-main shadow-[0_16px_60px_rgba(0,0,0,0.4)] animate-modal-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ─── Header ─── */}
                    <div className="flex items-center justify-between px-4 pt-2.5 pb-0.5">
                        <GripHorizontal size={16} className="cursor-grab text-text-tertiary/60" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border-none bg-transparent p-1.5 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary active:scale-90"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* ─── Body ─── */}
                    <div className="flex flex-col gap-4 px-5 pb-2 pt-1">

                        {/* Title Input */}
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('cal.modal.addTitle')}
                            autoFocus
                            className="w-full border-b-2 border-b-transparent border-none bg-transparent py-1 text-[18px] font-medium leading-tight text-text-primary placeholder:text-text-tertiary focus:border-b-accent-primary focus:outline-none"
                            style={{ borderBottom: '2px solid', borderBottomColor: title ? 'var(--accent-primary, #2383e2)' : 'var(--border-subtle, #333)' }}
                        />

                        {/* Event Type Tabs */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="cursor-default rounded-md border-none bg-accent-primary/15 px-2.5 py-1 text-[12px] font-semibold text-accent-primary"
                            >
                                {t('cal.modal.event')}
                            </button>
                        </div>


                        {/* ─── Date & Time Section ─── */}
                        <div className="flex items-start gap-3">
                            <Clock size={16} className="mt-1.5 shrink-0 text-text-tertiary" />
                            <div className="flex flex-1 flex-col gap-2">
                                {/* Row 1: Start Date + Start Time */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-[76px] text-[13px] font-medium text-text-secondary">
                                        {t('cal.modal.start')}
                                    </span>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer
                                                       bg-bg-hover text-text-primary hover:bg-bg-active transition-colors border-none"
                                            onClick={() => document.getElementById('gc-start-date-input').showPicker?.()}
                                        >
                                            {formatDateLocal(date) || t('cal.modal.selectDate')}
                                        </button>
                                        <input
                                            id="gc-start-date-input"
                                            type="date"
                                            value={date}
                                            onChange={(e) => handleStartDateChange(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            tabIndex={-1}
                                        />
                                    </div>

                                    {!isAllDay && (
                                        <TimePicker value={time} onChange={handleStartTimeChange} />
                                    )}
                                </div>

                                {/* Row 2: End Date + End Time (logic from incoming) */}
                                {!isAllDay && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="w-[76px] text-[13px] font-medium text-text-secondary">
                                            {t('cal.modal.end')}
                                        </span>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer
                                                           bg-bg-hover text-text-primary hover:bg-bg-active transition-colors border-none"
                                                onClick={() => document.getElementById('gc-end-date-input').showPicker?.()}
                                            >
                                                {formatDateLocal(resolvedEndDateForUi) || t('cal.modal.selectDate')}
                                            </button>
                                            <input
                                                id="gc-end-date-input"
                                                type="date"
                                                value={resolvedEndDateForUi}
                                                onChange={(e) => handleEndDateChange(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                tabIndex={-1}
                                            />
                                        </div>

                                        <TimePicker
                                            value={endTime}
                                            onChange={setEndTime}
                                            startTimeRef={isSameDayRange ? time : null}
                                        />
                                    </div>
                                )}

                                {/* Row 3: All-day + Timezone */}
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                                            ${isAllDay ? 'bg-text-primary border-text-primary' : 'bg-transparent border-text-tertiary'}
                                            ${isTaskLinkedEvent ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!isTaskLinkedEvent) {
                                                    setIsAllDay(!isAllDay);
                                                }
                                            }}
                                        >
                                            {isAllDay && (
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4L3.5 6.5L9 1" stroke="var(--bg-main, #191919)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-[13px] text-text-primary">{t('cal.modal.allDay')}</span>
                                    </label>
                                    <span className="text-[13px] text-accent-primary cursor-pointer hover:underline">{t('cal.modal.timezone')}</span>
                                </div>

                                {isTaskLinkedEvent && (
                                    <p className="text-[11px] text-text-tertiary">
                                        {t('cal.modal.taskLinkedHint')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ─── Info Rows ─── */}
                        <div className="flex flex-col gap-3">
                            {/* Guests */}
                            <div className="flex items-center gap-3">
                                <Users size={16} className="shrink-0 text-text-tertiary" />
                                <span className="cursor-pointer text-[12.5px] text-text-secondary transition-colors hover:text-text-primary">
                                    {t('cal.modal.addGuests')}
                                </span>
                            </div>

                            {/* Google Meet */}
                            <div className="flex items-center gap-3">
                                <Video size={16} className="shrink-0 text-text-tertiary" />
                                <span className="cursor-pointer truncate text-[12.5px] text-text-secondary transition-colors hover:text-text-primary">
                                    {t('cal.modal.addMeet')}
                                </span>
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-3">
                                <MapPin size={16} className="shrink-0 text-text-tertiary" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder={t('cal.modal.addLocation')}
                                    className="flex-1 border-none bg-transparent py-0 text-[12.5px] text-text-primary placeholder:text-text-secondary focus:outline-none"
                                />
                            </div>

                            {/* Description */}
                            <div className="flex items-start gap-3">
                                <AlignLeft size={16} className="mt-0.5 shrink-0 text-text-tertiary" />
                                <textarea
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    placeholder={t('cal.modal.addDesc')}
                                    rows={1}
                                    className="flex-1 resize-none overflow-hidden border-none bg-transparent py-0 text-[12.5px] text-text-primary placeholder:text-text-secondary focus:outline-none"
                                    style={{ minHeight: '20px' }}
                                />
                            </div>

                            {/* Calendar / Profile — Expandable */}
                            <div className="flex items-start gap-3">
                                <CalendarIcon size={16} className="mt-0.5 shrink-0 text-text-tertiary" />
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowProfilePopup(!showProfilePopup)}
                                        className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0 text-left w-full group"
                                    >
                                        <span className="text-[13px] text-text-primary font-medium">{calendarOwnerName}</span>
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <ChevronDown size={14} className={`text-text-tertiary transition-transform ${showProfilePopup ? 'rotate-180' : ''}`} />
                                    </button>

                                    {!showProfilePopup && (
                                        <span className="text-[11px] text-text-tertiary leading-tight">
                                            {status === 'busy' ? t('cal.modal.busy') : t('cal.modal.free')} • {visibility === 'default' ? t('cal.modal.visDefault') : t('cal.modal.visPrivate')} • {t('cal.modal.notification')} {getReminderLabel(reminder)} {t('cal.modal.reminderBefore')}
                                        </span>
                                    )}

                                    {/* Expanded popup (UI from HEAD with CustomSelect) */}
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
                                                        { value: "busy", label: t('cal.modal.busy') },
                                                        { value: "free", label: t('cal.modal.free') }
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
                                                        { value: "default", label: t('cal.modal.visDefault') },
                                                        { value: "private", label: t('cal.modal.visPrivate') },
                                                        { value: "public", label: t('cal.modal.visPublic') }
                                                    ]}
                                                />
                                            </div>

                                            {/* Notification (with incoming enum values) */}
                                            <div className="flex items-center gap-3">
                                                <Bell size={16} className="text-text-tertiary shrink-0" />
                                                <CustomSelect
                                                    value={reminder}
                                                    onChange={setReminder}
                                                    options={[
                                                        { value: "NONE", label: t('cal.modal.noReminder') },
                                                        { value: "MINUTES_5", label: t('cal.modal.remind5') },
                                                        { value: "MINUTES_15", label: t('cal.modal.remind15') },
                                                        { value: "HOUR_1", label: t('cal.modal.remind60') }
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
                    <div className="mt-1 flex items-center justify-between border-t border-border-subtle px-5 py-3">
                        <div>
                            {isEditing && onDelete ? (
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmDelete(true)}
                                    className="cursor-pointer rounded-md border-none bg-transparent px-2.5 py-1.5 text-[12.5px] font-medium text-red-400 transition hover:bg-red-500/10 active:scale-[0.97]"
                                >
                                    {t('cal.modal.delete')}
                                </button>
                            ) : (
                                <div />
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="cursor-pointer rounded-md border-none bg-transparent px-2.5 py-1.5 text-[12.5px] font-medium text-accent-primary transition-colors hover:bg-accent-primary/10 active:scale-[0.97]"
                            >
                                {t('cal.modal.moreOptions')}
                            </button>
                            <button
                                type="submit"
                                className="cursor-pointer rounded-md border-none bg-accent-primary px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-accent-hover hover:shadow-md hover:shadow-accent-primary/20 active:scale-[0.97]"
                            >
                                {t('cal.modal.save')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ─── Delete Confirmation (logic from incoming: async onDelete) ─── */}
            {showConfirmDelete && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
                    <div className="bg-bg-main rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border-subtle">
                        <h3 className="text-base font-semibold text-text-primary mb-2">{t('cal.modal.deleteTitle')}</h3>
                        <p className="text-[13px] text-text-secondary mb-5">{t('cal.modal.deleteConfirm')}</p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmDelete(false)}
                                className="px-4 py-1.5 text-[13px] font-medium rounded-lg text-text-secondary bg-transparent
                                           hover:bg-bg-hover transition-colors border-none cursor-pointer"
                            >
                                {t('cal.modal.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const didDelete = await onDelete(event.id);
                                    setShowConfirmDelete(false);
                                    if (didDelete !== false) {
                                        onClose();
                                    }
                                }}
                                className="px-4 py-1.5 text-[13px] font-medium rounded-lg text-white bg-red-600
                                           hover:bg-red-700 transition-colors border-none cursor-pointer"
                            >
                                {t('cal.modal.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EventModal;
