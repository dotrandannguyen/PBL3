import React, { useState } from "react";
import { DndContext, useSensor, useSensors, PointerSensor, pointerWithin, DragOverlay } from '@dnd-kit/core';
import CalendarHeader from "../components/CalendarHeader";
import CalendarGrid from "../components/CalendarGrid";
import CalendarWeekGrid from "../components/CalendarWeekGrid";
import CalendarSidebar from "../components/CalendarSidebar";
import EventModal from "../components/EventModal";
import { CalendarEventUI } from "../components/CalendarEvent";

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
  const [prefillRange, setPrefillRange] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [activeEvent, setActiveEvent] = useState(null);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    }
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleDateClick = (date) => setSelectedDate(date);

  const handleEventClick = (event) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // minimum drag distance before initiating drag
      },
    })
  );

  const handleDragStart = (event) => {
    setActiveEvent(event.active.data.current?.event || null);
  };

  const handleDragEnd = (event) => {
    setActiveEvent(null);
    const { active, over, delta } = event;
    if (!over) return;

    const activeEvent = active.data.current?.event;
    if (!activeEvent) return;

    const newDateStr = over.data.current?.date || activeEvent.date;

    setEvents(prev => prev.map(e => {
      if (String(e.id) !== String(activeEvent.id)) return e;

      let updatedEvent = { ...e };
      let changed = false;

      // Update date if dragged to a different day column
      if (activeEvent.date !== newDateStr) {
        updatedEvent.date = newDateStr;
        changed = true;
      }

      // In Week view, adjust time based on vertical pixel drag 
      // (1 pixel = 1 minute, since 60px = 1 hour)
      if (viewMode === 'week' && e.time && typeof delta.y === 'number') {
        const timeToMins = (t) => {
          const [h, m] = t.split(':').map(Number);
          return Math.round(h * 60 + m);
        };
        const minsToTime = (totalMins) => {
          // Clamp to boundaries to prevent dragging into invalid hours (next day)
          const clamped = Math.max(0, Math.min(24 * 60 - 15, totalMins));
          const h = Math.floor(clamped / 60);
          const m = Math.floor(clamped % 60);
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        };

        // Snap vertical shift to 15-minute intervals for better UX
        const deltaMins = Math.round(delta.y / 15) * 15;

        if (deltaMins !== 0) {
          const startMins = timeToMins(e.time);
          let duration = 60; // default 1 hour fallback
          if (e.endTime) {
            duration = timeToMins(e.endTime) - startMins;
          }

          const newStartMins = startMins + deltaMins;
          updatedEvent.time = minsToTime(newStartMins);
          updatedEvent.endTime = minsToTime(newStartMins + duration);
          changed = true;
        }
      }

      return changed ? updatedEvent : e;
    }));
  };

  const handleAddEvent = (date) => {
    if (date instanceof Date) {
      setSelectedDate(date);
    }
    setEditingEvent(null);
    setPrefillRange(null);
    setShowModal(true);
  };

  const handleAddEventRange = (date, startTime, endTime) => {
    if (date instanceof Date) {
      setSelectedDate(date);
    }
    setEditingEvent(null);
    setPrefillRange({ startTime, endTime });
    setShowModal(true);
  };

  const handleSaveEvent = (eventData) => {
    setEvents(prev => {
      if (editingEvent) {
        return prev.map((e) => (String(e.id) === String(eventData.id) ? eventData : e));
      } else {
        return [...prev, eventData];
      }
    });
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(prev => prev.filter((e) => String(e.id) !== String(eventId)));
  };

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CalendarHeader
            currentDate={currentDate}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
            {viewMode === 'month' ? (
              <CalendarGrid
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                onAddEvent={handleAddEvent}
              />
            ) : (
              <CalendarWeekGrid
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                onAddEventRange={handleAddEventRange}
              />
            )}
            <DragOverlay>
              {activeEvent ? (
                <CalendarEventUI event={activeEvent} isOverlay={true} style={{ width: '100%', height: '100%' }} />
              ) : null}
            </DragOverlay>
          </DndContext>
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
          setPrefillRange(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
        selectedDate={selectedDate || new Date()}
        prefillRange={prefillRange}
      />
    </>
  );
}
