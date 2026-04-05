import React, { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  pointerWithin,
} from "@dnd-kit/core";
import { toast } from "sonner";
import CalendarHeader from "../components/CalendarHeader";
import CalendarGrid from "../components/CalendarGrid";
import CalendarWeekGrid from "../components/CalendarWeekGrid";
import CalendarSidebar from "../components/CalendarSidebar";
import EventModal from "../components/EventModal";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../api/event.api";

const DEFAULT_EVENT_COLOR = "#2383e2";
const VALID_REMINDERS = new Set(["NONE", "MINUTES_5", "MINUTES_15", "HOUR_1"]);

const normalizeReminder = (value) =>
  VALID_REMINDERS.has(value) ? value : "NONE";

const toHHMM = (isoValue) => {
  if (!isoValue) return null;

  const dateObj = new Date(isoValue);
  if (Number.isNaN(dateObj.getTime())) {
    return null;
  }

  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const mapApiEventToUiEvent = (event) => ({
  ...event,
  id: String(event.id),
  reminder: normalizeReminder(event.reminder),
  endAt: event.endAt || null,
  endDate:
    event.endDate || (event.endAt ? event.endAt.slice(0, 10) : event.date),
  endTime: event.endTime || toHHMM(event.endAt),
});

const toApiPayload = (eventData) => ({
  title: eventData.title?.trim() || "",
  date: eventData.date,
  time: eventData.isAllDay ? "00:00" : eventData.time || "09:00",
  color: eventData.color || DEFAULT_EVENT_COLOR,
  location: eventData.location?.trim() || null,
  description: eventData.description?.trim() || null,
  repeat: "NONE",
  reminder: normalizeReminder(eventData.reminder),
});

const extractEvents = (response) => {
  const payload = response?.data?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const extractEvent = (response) => response?.data?.data || null;

const resolveCalendarError = (error, fallbackMessage) => {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) {
    return serverMessage;
  }

  if (error?.code === "ERR_NETWORK") {
    return "Không thể kết nối backend để đồng bộ lịch.";
  }

  return error?.message || fallbackMessage;
};

/**
 * CalendarPage — Nội dung trang lịch.
 * Layout (Sidebar + outer container) được xử lý bởi DashboardLayout.
 */
export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [prefillRange, setPrefillRange] = useState(null);
  const [viewMode, setViewMode] = useState("month");

  const loadEvents = useCallback(async () => {
    try {
      const response = await getEvents();
      const eventList = extractEvents(response);
      setEvents(eventList.map(mapApiEventToUiEvent));
    } catch (error) {
      const message = resolveCalendarError(error, "Không thể tải sự kiện.");
      toast.error(message);
      console.error("Load events error:", error);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const handleFocus = () => {
      loadEvents();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadEvents]);

  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      );
    } else {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() - 7,
        ),
      );
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      );
    } else {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() + 7,
        ),
      );
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
    }),
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeEvent = active.data.current?.event;
    const newDateStr = over.data.current?.date;

    if (activeEvent && newDateStr && activeEvent.date !== newDateStr) {
      const previousEvents = events;

      setEvents((prev) =>
        prev.map((item) =>
          item.id === activeEvent.id ? { ...item, date: newDateStr } : item,
        ),
      );

      try {
        const response = await updateEvent(activeEvent.id, {
          date: newDateStr,
        });
        const updatedEvent = extractEvent(response);
        if (updatedEvent) {
          const normalized = mapApiEventToUiEvent(updatedEvent);
          setEvents((prev) =>
            prev.map((item) =>
              item.id === normalized.id ? { ...item, ...normalized } : item,
            ),
          );
        }
      } catch (error) {
        setEvents(previousEvents);
        const message = resolveCalendarError(
          error,
          "Không thể cập nhật ngày sự kiện.",
        );
        toast.error(message);
        console.error("Update event date error:", error);
      }
    }
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

  const handleSaveEvent = async (eventData) => {
    const payload = toApiPayload(eventData);
    if (!payload.title || !payload.date) {
      return false;
    }

    try {
      if (editingEvent) {
        const response = await updateEvent(editingEvent.id, payload);
        const updatedEvent = extractEvent(response);
        if (updatedEvent) {
          const normalized = mapApiEventToUiEvent({
            ...editingEvent,
            ...updatedEvent,
            endAt:
              updatedEvent.endAt ??
              eventData.endAt ??
              editingEvent.endAt ??
              null,
            endDate:
              updatedEvent.endDate ??
              eventData.endDate ??
              editingEvent.endDate ??
              updatedEvent.date ??
              editingEvent.date,
            endTime:
              updatedEvent.endTime ??
              eventData.endTime ??
              editingEvent.endTime ??
              null,
          });
          setEvents((prev) =>
            prev.map((item) =>
              item.id === String(editingEvent.id)
                ? { ...item, ...normalized }
                : item,
            ),
          );
        }
      } else {
        const response = await createEvent(payload);
        const createdEvent = extractEvent(response);
        if (createdEvent) {
          const normalized = mapApiEventToUiEvent({
            ...createdEvent,
            endAt: createdEvent.endAt ?? eventData.endAt ?? null,
            endDate:
              createdEvent.endDate ??
              eventData.endDate ??
              createdEvent.date ??
              eventData.date,
            endTime: createdEvent.endTime ?? eventData.endTime ?? null,
          });

          setEvents((prev) => [...prev, normalized]);
        }
      }

      setEditingEvent(null);
      return true;
    } catch (error) {
      const message = resolveCalendarError(
        error,
        "Không thể lưu sự kiện vào lịch.",
      );
      toast.error(message);
      console.error("Save event error:", error);
      return false;
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((item) => item.id !== String(eventId)));
      setEditingEvent(null);
      return true;
    } catch (error) {
      const message = resolveCalendarError(error, "Không thể xóa sự kiện.");
      toast.error(message);
      console.error("Delete event error:", error);
      return false;
    }
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
          <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
          >
            {viewMode === "month" ? (
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
