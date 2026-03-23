import React, { useState } from "react";
import CalendarHeader from "../components/CalendarHeader";
import CalendarGrid from "../components/CalendarGrid";
import CalendarSidebar from "../components/CalendarSidebar";
import EventModal from "../components/EventModal";

// Mock Events Data
const MOCK_EVENTS = [
  {
    id: 1,
    title: "Team Standup",
    date: "2026-03-10",
    time: "09:00",
    color: "#2383e2",
  },
  {
    id: 2,
    title: "Design Review",
    date: "2026-03-10",
    time: "14:00",
    color: "#9065b0",
  },
  {
    id: 3,
    title: "Sprint Planning",
    date: "2026-03-12",
    time: "10:00",
    color: "#0f7b6c",
  },
  {
    id: 4,
    title: "Lunch with Team",
    date: "2026-03-14",
    time: "12:00",
    color: "#d9730d",
  },
  { id: 5, title: "Project Deadline", date: "2026-03-17", color: "#e03e3e" },
  {
    id: 6,
    title: "Code Review",
    date: "2026-03-19",
    time: "15:00",
    color: "#2383e2",
  },
  {
    id: 7,
    title: "Workshop: React",
    date: "2026-03-21",
    time: "09:00",
    color: "#dfab01",
  },
  {
    id: 8,
    title: "Client Meeting",
    date: "2026-03-25",
    time: "11:00",
    color: "#d44c90",
  },
  { id: 9, title: "Release v2.0", date: "2026-03-28", color: "#0f7b6c" },
  {
    id: 10,
    title: "Retrospective",
    date: "2026-03-31",
    time: "16:00",
    color: "#787774",
  },
];

/**
 * CalendarPage — Nội dung trang lịch.
 * Layout (Sidebar + outer container) được xử lý bởi DashboardLayout.
 */
export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleDateClick = (date) => setSelectedDate(date);

  const handleEventClick = (event) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleAddEvent = (date) => {
    if (date instanceof Date) {
      setSelectedDate(date);
    }
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleSaveEvent = (eventData) => {
    if (editingEvent) {
      setEvents(events.map((e) => (e.id === eventData.id ? eventData : e)));
    } else {
      setEvents([...events, eventData]);
    }
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter((e) => e.id !== eventId));
  };

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CalendarHeader
            currentDate={currentDate}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            onToday={handleToday}
          />
          <CalendarGrid
            currentDate={currentDate}
            events={events}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
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
        onClose={() => {
          setShowModal(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
        selectedDate={selectedDate || new Date()}
      />
    </>
  );
}
