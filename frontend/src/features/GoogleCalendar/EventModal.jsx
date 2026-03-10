import React, { useState, useEffect } from 'react';
import { X, Clock, Type, Palette } from 'lucide-react';

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

const EventModal = ({ isOpen, onClose, onSave, onDelete, event, selectedDate }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [color, setColor] = useState(EVENT_COLORS[0].value);

    useEffect(() => {
        if (event) {
            // Edit mode
            setTitle(event.title || '');
            setDate(event.date || '');
            setTime(event.time || '');
            setColor(event.color || EVENT_COLORS[0].value);
        } else if (selectedDate) {
            // New event mode
            setTitle('');
            const y = selectedDate.getFullYear();
            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(selectedDate.getDate()).padStart(2, '0');
            setDate(`${y}-${m}-${d}`);
            setTime('');
            setColor(EVENT_COLORS[0].value);
        }
    }, [event, selectedDate, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !date) return;

        onSave({
            id: event?.id || Date.now(),
            title: title.trim(),
            date,
            time: time || null,
            color,
        });
        onClose();
    };

    const isEditing = !!event;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-[fadeIn_150ms_ease]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-md bg-glass-bg backdrop-blur-xl border border-glass-border
                               rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_200ms_ease]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                        <h3 className="text-base font-semibold text-text-primary m-0">
                            {isEditing ? 'Edit Event' : 'New Event'}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-md text-text-secondary hover:bg-bg-hover
                                       transition-colors duration-150 cursor-pointer border-none bg-transparent"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 flex flex-col gap-4">
                        {/* Title */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                                <Type size={14} />
                                Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Event title..."
                                autoFocus
                                className="w-full px-3 py-2 text-sm rounded-md border border-border-subtle
                                           bg-bg-main text-text-primary placeholder:text-text-tertiary
                                           focus:outline-none focus:border-accent-primary
                                           transition-colors duration-150"
                            />
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                                <Clock size={14} />
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-md border border-border-subtle
                                           bg-bg-main text-text-primary
                                           focus:outline-none focus:border-accent-primary
                                           transition-colors duration-150"
                            />
                        </div>

                        {/* Time */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                                <Clock size={14} />
                                Time (optional)
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-md border border-border-subtle
                                           bg-bg-main text-text-primary
                                           focus:outline-none focus:border-accent-primary
                                           transition-colors duration-150"
                            />
                        </div>

                        {/* Color Picker */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                                <Palette size={14} />
                                Color
                            </label>
                            <div className="flex items-center gap-2">
                                {EVENT_COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setColor(c.value)}
                                        title={c.name}
                                        className={`
                                            w-6 h-6 rounded-full border-2 cursor-pointer
                                            transition-all duration-150 hover:scale-110
                                            ${color === c.value ? 'border-white scale-110' : 'border-transparent'}
                                        `}
                                        style={{ backgroundColor: c.value }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
                        <div>
                            {isEditing && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => { onDelete(event.id); onClose(); }}
                                    className="px-3 py-1.5 text-sm rounded-md text-red-400
                                               bg-transparent border border-red-400/30
                                               hover:bg-red-400/10 transition-colors duration-150 cursor-pointer"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-1.5 text-sm rounded-md text-text-secondary
                                           bg-transparent border border-border-subtle
                                           hover:bg-bg-hover transition-colors duration-150 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-1.5 text-sm rounded-md text-white
                                           bg-accent-primary border-none
                                           hover:bg-accent-hover transition-colors duration-150 cursor-pointer"
                            >
                                {isEditing ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
};

export default EventModal;
