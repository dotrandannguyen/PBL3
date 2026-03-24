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
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(EVENT_COLORS[0].value);
    const [type, setType] = useState('event');
    const [reminder, setReminder] = useState('30_min');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    useEffect(() => {
        if (event) {
            // Edit mode
            setTitle(event.title || '');
            setDate(event.date || '');
            setTime(event.time || '');
            setEndTime(event.endTime || '');
            setIsAllDay(event.isAllDay || false);
            setDescription(event.description || '');
            setColor(event.color || EVENT_COLORS[0].value);
            setType(event.type || 'event');
            setReminder(event.reminder || '30_min');
        } else if (selectedDate) {
            // New event mode
            setTitle('');
            const y = selectedDate.getFullYear();
            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(selectedDate.getDate()).padStart(2, '0');
            setDate(`${y}-${m}-${d}`);
            setTime('');
            setEndTime('');
            setIsAllDay(false);
            setDescription('');
            setColor(EVENT_COLORS[0].value);
            setType('event');
            setReminder('30_min');
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
            time: isAllDay ? null : (time || null),
            endTime: isAllDay ? null : (endTime || null),
            isAllDay,
            description: description.trim(),
            color,
            type,
            reminder,
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
                                <button
                                    type="button"
                                    onClick={() => setType('event')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer border-none transition-colors
                                        ${type === 'event' 
                                            ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#e8f0fe]/20 dark:text-blue-300' 
                                            : 'bg-transparent text-text-secondary hover:bg-bg-hover'}`}
                                >
                                    Sự kiện
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('task')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer border-none transition-colors
                                        ${type === 'task' 
                                            ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#e8f0fe]/20 dark:text-blue-300' 
                                            : 'bg-transparent text-text-secondary hover:bg-bg-hover'}`}
                                >
                                    Việc cần làm
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 mt-2">
                            {/* Row: Date/Time */}
                            <div className="flex items-start gap-4">
                                <div className="mt-1.5 text-text-secondary shrink-0">
                                    <Clock size={20} />
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="bg-transparent text-text-primary text-[15px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded cursor-pointer transition-colors"
                                            />
                                            {!isAllDay && (
                                                <>
                                                    <input
                                                        type="time"
                                                        value={time}
                                                        onChange={(e) => setTime(e.target.value)}
                                                        className="bg-transparent text-text-primary text-[15px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded cursor-pointer transition-colors min-w-[90px]"
                                                    />
                                                    <span className="text-text-secondary">-</span>
                                                    <input
                                                        type="time"
                                                        value={endTime}
                                                        onChange={(e) => setEndTime(e.target.value)}
                                                        className="bg-transparent text-text-primary text-[15px] focus:outline-none hover:bg-bg-hover px-2 py-1.5 rounded cursor-pointer transition-colors min-w-[90px]"
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-bg-hover px-2 py-1 rounded w-max transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isAllDay} 
                                                    onChange={(e) => setIsAllDay(e.target.checked)}
                                                    className="w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary cursor-pointer accent-accent-primary"
                                                />
                                                <span className="text-[14px] text-text-primary">Cả ngày</span>
                                            </label>
                                            <div className="text-[13px] text-text-tertiary px-2 cursor-pointer hover:bg-bg-hover w-max rounded">
                                                Không lặp lại
                                            </div>
                                        </div>
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
                            <div className="flex items-start gap-4">
                                <div className="text-text-secondary shrink-0 mt-2">
                                    <AlignLeft size={20} />
                                </div>
                                <div className="flex-1 w-full">
                                    <textarea 
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Thêm mô tả hoặc tệp đính kèm" 
                                        rows={3}
                                        className="w-full bg-bg-hover/30 text-text-primary text-[15px] focus:outline-none focus:bg-bg-hover px-3 py-2 rounded-md transition-colors placeholder:text-text-secondary resize-none" 
                                    />
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
                                <div className="flex-1 w-full relative">
                                    <select
                                        value={reminder}
                                        onChange={(e) => setReminder(e.target.value)}
                                        className="w-full bg-transparent text-[15px] text-text-primary focus:outline-none hover:bg-bg-hover px-1 py-1.5 -ml-1 rounded cursor-pointer transition-colors border-none"
                                    >
                                        <option value="none" className="bg-bg-main">Không nhắc</option>
                                        <option value="10_min" className="bg-bg-main">10 phút trước</option>
                                        <option value="30_min" className="bg-bg-main">30 phút trước</option>
                                        <option value="1_hour" className="bg-bg-main">1 giờ trước</option>
                                        <option value="1_day" className="bg-bg-main">Ngày hôm trước lúc 5PM</option>
                                    </select>
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
                                    onClick={() => setShowConfirmDelete(true)}
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
