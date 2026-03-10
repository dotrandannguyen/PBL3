import React, { useState } from 'react';
import { Calendar, FileText, BookOpen, Rocket, CheckSquare } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import Sidebar from '../workspace/Sidebar';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import CalendarSidebar from './CalendarSidebar';
import EventModal from './EventModal';

// Mock Events Data
const MOCK_EVENTS = [
    { id: 1, title: 'Team Standup', date: '2026-03-10', time: '09:00', color: '#2383e2' },
    { id: 2, title: 'Design Review', date: '2026-03-10', time: '14:00', color: '#9065b0' },
    { id: 3, title: 'Sprint Planning', date: '2026-03-12', time: '10:00', color: '#0f7b6c' },
    { id: 4, title: 'Lunch with Team', date: '2026-03-14', time: '12:00', color: '#d9730d' },
    { id: 5, title: 'Project Deadline', date: '2026-03-17', color: '#e03e3e' },
    { id: 6, title: 'Code Review', date: '2026-03-19', time: '15:00', color: '#2383e2' },
    { id: 7, title: 'Workshop: React', date: '2026-03-21', time: '09:00', color: '#dfab01' },
    { id: 8, title: 'Client Meeting', date: '2026-03-25', time: '11:00', color: '#d44c90' },
    { id: 9, title: 'Release v2.0', date: '2026-03-28', color: '#0f7b6c' },
    { id: 10, title: 'Retrospective', date: '2026-03-31', time: '16:00', color: '#787774' },
];

const SIDEBAR_PAGES = [
    { id: 'welcome1', icon: <Rocket size={14} />, label: 'Getting Started', type: 'private' },
    { id: 'welcome2', icon: <BookOpen size={14} />, label: 'Quick Guide', type: 'private' },
    { id: 'todo', icon: <CheckSquare size={14} />, label: 'To Do List', type: 'private' },
    { id: 'todolist1', icon: <FileText size={14} />, label: 'Todo List', type: 'private', indent: true },
    { id: 'todolist2', icon: <FileText size={14} />, label: 'To Do List', type: 'private', indent: true },
];

const CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [events, setEvents] = useState(MOCK_EVENTS);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    // Navigation
    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Date click → chọn ngày
    const handleDateClick = (date) => {
        setSelectedDate(date);
    };

    // Event click → mở modal sửa event
    const handleEventClick = (event) => {
        setEditingEvent(event);
        setShowModal(true);
    };

    // Add Event button
    const handleAddEvent = () => {
        setEditingEvent(null);
        setShowModal(true);
    };

    // Save event (tạo mới hoặc sửa)
    const handleSaveEvent = (eventData) => {
        if (editingEvent) {
            // Edit
            setEvents(events.map(e => e.id === eventData.id ? eventData : e));
        } else {
            // Create
            setEvents([...events, eventData]);
        }
        setEditingEvent(null);
    };

    // Delete event
    const handleDeleteEvent = (eventId) => {
        setEvents(events.filter(e => e.id !== eventId));
    };

    return (
        <AppLayout
            sidebar={
                <Sidebar
                    activePage="todo"
                    onPageClick={(id) => {
                        window.location.href = '/app';
                    }}
                    pages={SIDEBAR_PAGES}
                    onAddNewList={() => { }}
                />
            }
        >
            <div className="flex flex-1 overflow-hidden">
                {/* Main Calendar Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <CalendarHeader
                        currentDate={currentDate}
                        onPrev={handlePrevMonth}
                        onNext={handleNextMonth}
                        onToday={handleToday}
                        onAddEvent={handleAddEvent}
                    />
                    <CalendarGrid
                        currentDate={currentDate}
                        events={events}
                        onDateClick={handleDateClick}
                        onEventClick={handleEventClick}
                    />
                </div>

                {/* Right Sidebar */}
                <CalendarSidebar
                    currentDate={currentDate}
                    selectedDate={selectedDate}
                    events={events}
                    onDateSelect={setSelectedDate}
                />
            </div>

            {/* Event Modal */}
            <EventModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingEvent(null); }}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                event={editingEvent}
                selectedDate={selectedDate || new Date()}
            />
        </AppLayout>
    );
};

export default CalendarPage;
