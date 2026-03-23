import React, { useState, useEffect } from 'react';
import { X, Clock, AlignLeft, Calendar as CalendarIcon, Bell, MapPin } from 'lucide-react';

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
                className="fixed inset-0 bg-black/50 z-40 animate-[fadeIn_150ms_ease]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-[500px] bg-bg-main
                               rounded-[8px] shadow-2xl overflow-hidden animate-[fadeIn_200ms_ease] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Controls */}
                    <div className="flex justify-between items-center px-4 py-2 bg-bg-hover/30 rounded-t-[8px]">
                        <div className="w-8 h-2 rounded bg-border-subtle cursor-ns-resize opacity-50" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full text-text-secondary hover:bg-bg-hover
                                       transition-colors duration-150 cursor-pointer border-none bg-transparent"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 pb-2 pt-4 flex flex-col gap-5">
                        {/* Title Input */}
                        <div className="pl-12 relative">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Thêm tiêu đề và thời gian"
                                autoFocus
                                className="w-full text-[22px] bg-transparent text-text-primary placeholder:text-text-tertiary
                                           border-b-2 border-transparent focus:border-accent-primary
                                           focus:outline-none py-1 transition-colors leading-tight font-normal"
                            />
                            {/* Type toggle (Event / Task) */}
                            <div className="flex gap-2 mt-3 mb-1">
                                <span className="px-3 py-1.5 bg-[#e8f0fe] text-[#1967d2] dark:bg-[#e8f0fe]/20 dark:text-blue-300 rounded-md text-sm font-medium cursor-default">Sự kiện</span>
                                <span className="px-3 py-1.5 hover:bg-bg-hover text-text-secondary rounded-md text-sm font-medium cursor-pointer transition">Việc cần làm</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 mt-2">
                            {/* Row: Date/Time */}
                            <div className="flex items-start gap-4">
                                <div className="mt-1.5 text-text-secondary shrink-0">
                                    <Clock size={20} />
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="bg-transparent text-text-primary text-[15px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded cursor-pointer transition-colors"
                                        />
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="bg-transparent text-text-primary text-[15px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded cursor-pointer transition-colors min-w-[90px]"
                                        />
                                    </div>
                                    <div className="text-[13px] text-text-tertiary mt-0.5 px-2 cursor-pointer hover:bg-bg-hover w-max rounded">
                                        Không lặp lại
                                    </div>
                                </div>
                            </div>

                            {/* Row: Location */}
                            <div className="flex items-center gap-4">
                                <div className="text-text-secondary shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div className="flex-1 w-full relative">
                                    <input type="text" placeholder="Thêm vị trí" className="w-full bg-transparent text-text-primary text-[15px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded transition-colors placeholder:text-text-secondary leading-tight" />
                                </div>
                            </div>

                            {/* Row: Description */}
                            <div className="flex items-center gap-4">
                                <div className="text-text-secondary shrink-0">
                                    <AlignLeft size={20} />
                                </div>
                                <div className="flex-1 w-full">
                                    <input type="text" placeholder="Thêm mô tả hoặc tệp đính kèm trên Google Drive" className="w-full bg-transparent text-text-primary text-[15px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded transition-colors placeholder:text-text-secondary leading-tight" />
                                </div>
                            </div>

                            {/* Row: Color/Calendar/Profile */}
                            <div className="flex items-start gap-4">
                                <div className="mt-1.5 text-text-secondary shrink-0">
                                    <CalendarIcon size={20} />
                                </div>
                                <div className="flex-1 flex flex-col gap-2 w-full mt-1">
                                    <div className="flex items-center gap-4 hover:bg-bg-hover p-1.5 -ml-1.5 rounded cursor-pointer transition-colors w-max">
                                        <span className="text-[15px] text-text-primary pl-1 font-medium">Thành Luân Nguyễn</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 ml-1 flex-wrap">
                                        {EVENT_COLORS.map((c) => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setColor(c.value)}
                                                className={`w-[18px] h-[18px] rounded-full border-[1.5px] cursor-pointer transition-all hover:scale-110 
                                                          ${color === c.value ? 'border-white !scale-125' : 'border-transparent'}`}
                                                style={{ backgroundColor: c.value }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Row: Notification */}
                            <div className="flex items-center gap-4">
                                <div className="text-text-secondary shrink-0">
                                    <Bell size={20} />
                                </div>
                                <div className="flex-1">
                                    <span className="text-[15px] text-text-primary hover:bg-bg-hover px-2 py-1.5 rounded cursor-pointer transition-colors">Ngày hôm trước lúc 5PM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 mt-2 bg-transparent border-t border-border-subtle">
                        <div className="flex items-center">
                            {isEditing && onDelete ? (
                                <button
                                    type="button"
                                    onClick={() => { onDelete(event.id); onClose(); }}
                                    className="text-[14px] text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded font-medium transition cursor-pointer border-none bg-transparent"
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
                                className="px-3 py-1.5 text-[14px] font-medium text-accent-primary bg-transparent
                                           hover:bg-accent-primary/10 rounded border-none cursor-pointer transition"
                            >
                                Tuỳ chọn khác
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-1.5 text-[14px] font-medium rounded text-white
                                           bg-[#0b57d0] border-none hover:bg-[#0842a0] 
                                           transition-colors duration-150 cursor-pointer shadow-sm"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
};

export default EventModal;
