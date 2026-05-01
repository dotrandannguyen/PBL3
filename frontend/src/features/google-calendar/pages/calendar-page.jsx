import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
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
import { CalendarEventUI } from "../components/CalendarEvent";
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

const parseTimeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const minsToTimeStr = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

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

const toApiPayload = (eventData) => {
  const isAllDay = Boolean(eventData.isAllDay);
  const endTime = isAllDay ? null : eventData.endTime || null;
  const endDate = isAllDay
    ? null
    : eventData.endDate || (endTime ? eventData.date : null);

  return {
    title: eventData.title?.trim() || "",
    date: eventData.date,
    time: isAllDay ? "00:00" : eventData.time || "09:00",
    endDate,
    endTime,
    color: eventData.color || DEFAULT_EVENT_COLOR,
    location: eventData.location?.trim() || null,
    description: eventData.description?.trim() || null,
    repeat: "NONE",
    reminder: normalizeReminder(eventData.reminder),
  };
};

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
  const [activeEvent, setActiveEvent] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [dropPreview, setDropPreview] = useState(null);
  const [draggedRect, setDraggedRect] = useState(null);
  // shape: { dateKey, mins, top, dayIdx, durationMins }
  const dragJustEndedRef = useRef(false);
  // Real pointer position tracked via window listener — more accurate than
  // dragged-element rect for translating drop position to time.
  const dragPointerRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  // Cache of which event we're dragging so we can build a drop preview
  const draggingEventRef = useRef(null);

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
        distance: 3, // lower threshold → quicker drag activation
      },
    }),
  );

  // Track real pointer position globally so we can use it for drop math
  useEffect(() => {
    const onPointerMove = (e) => {
      dragPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  const handleDragStart = (event) => {
    const draggedEvent = event.active.data.current?.event;
    setActiveEvent(draggedEvent || null);
    draggingEventRef.current = draggedEvent || null;

    const initialRect = event.active.rect.current?.initial;
    setDraggedRect(initialRect || null);

    // Capture pointer offset within the dragged element. Used so the dropped
    // event aligns with the grab point rather than always anchoring to top.
    const activator = event.activatorEvent;
    if (initialRect && activator) {
      dragOffsetRef.current = {
        x: (activator.clientX ?? 0) - initialRect.left,
        y: (activator.clientY ?? 0) - initialRect.top,
      };
    } else {
      dragOffsetRef.current = { x: 0, y: 0 };
    }
  };

  // Compute drop time from REAL pointer position relative to time grid.
  // We anchor the event's TOP to (pointerY - clickOffset) so the event lands
  // exactly where the user grabbed it from.
  const computeDropMinutes = () => {
    const timeGrid = document.querySelector('[data-week-time-grid="true"]');
    if (!timeGrid) return null;

    const gridRect = timeGrid.getBoundingClientRect();
    // pointer Y relative to grid top
    const pointerY = dragPointerRef.current.y - gridRect.top;
    // anchor the event TOP at (pointer - offset)
    const eventTopY = pointerY - dragOffsetRef.current.y;
    const rawMins = Math.max(0, Math.min(eventTopY, 24 * 60 - 1));
    // Snap to 15-minute intervals
    return Math.round(rawMins / 15) * 15;
  };

  // Live drop preview while dragging in week view
  const handleDragMove = (dragEvent) => {
    if (viewMode !== "week") return;
    const overData = dragEvent.over?.data?.current;
    if (!overData?.date) {
      setDropPreview(null);
      return;
    }
    const dropMins = computeDropMinutes();
    if (dropMins == null) return;
    const draggedEvent = draggingEventRef.current;
    if (!draggedEvent) return;

    const oldStart = parseTimeToMins(draggedEvent.time);
    const oldEnd = draggedEvent.endTime
      ? parseTimeToMins(draggedEvent.endTime)
      : oldStart + 60;
    const duration = oldEnd - oldStart;

    setDropPreview({
      dateKey: overData.date,
      top: dropMins,
      durationMins: Math.max(15, duration),
      startMins: dropMins,
      endMins: Math.min(dropMins + duration, 24 * 60),
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveEvent(null);
    setDropPreview(null);
    setDraggedRect(null);
    draggingEventRef.current = null;

    // Suppress the click event that fires on the drop-target cell after drag ends
    dragJustEndedRef.current = true;
    setTimeout(() => {
      dragJustEndedRef.current = false;
    }, 120);

    if (!over) return;

    const draggedEvent = active.data.current?.event;
    const newDateStr = over.data.current?.date;

    if (!draggedEvent || !newDateStr) return;

    // Calculate new time values
    let newTime = draggedEvent.time;
    let newEndTime = draggedEvent.endTime;

    // Week view: compute time from pointer position (snapped to 15 min)
    if (viewMode === "week") {
      const dropMins = computeDropMinutes();
      if (dropMins !== null) {
        const oldStartMins = parseTimeToMins(draggedEvent.time);
        const oldEndMins = draggedEvent.endTime
          ? parseTimeToMins(draggedEvent.endTime)
          : oldStartMins + 60;
        const duration = oldEndMins - oldStartMins;

        const newStartMins = dropMins;
        const newEndMins = Math.min(newStartMins + duration, 24 * 60 - 1);

        newTime = minsToTimeStr(newStartMins);
        newEndTime = minsToTimeStr(newEndMins);
      }
    }

    // Check if anything actually changed
    const hasChanged =
      draggedEvent.date !== newDateStr ||
      draggedEvent.time !== newTime ||
      draggedEvent.endTime !== newEndTime;

    if (!hasChanged) return;

    const previousEvents = events;

    // Optimistic update — preserve duration
    setEvents((prev) =>
      prev.map((item) =>
        item.id === draggedEvent.id
          ? {
              ...item,
              date: newDateStr,
              time: newTime,
              endTime: newEndTime,
              endDate: newDateStr,
            }
          : item,
      ),
    );

    try {
      const updatePayload = {
        date: newDateStr,
        time: newTime,
      };
      if (newEndTime) {
        updatePayload.endTime = newEndTime;
        updatePayload.endDate = newDateStr;
      }
      const response = await updateEvent(draggedEvent.id, updatePayload);
      const updatedEvent = extractEvent(response);
      if (updatedEvent) {
        const normalized = mapApiEventToUiEvent({
          ...draggedEvent,
          ...updatedEvent,
          endTime: updatedEvent.endTime ?? newEndTime,
          endDate: updatedEvent.endDate ?? newDateStr,
        });
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
        "Không thể cập nhật sự kiện.",
      );
      toast.error(message);
      console.error("Update event date error:", error);
    }
  };

  const handleAddEvent = (date) => {
    // Skip opening modal if a drag just ended (click fires on drop-target cell)
    if (dragJustEndedRef.current) {
      dragJustEndedRef.current = false;
      return;
    }
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
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
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
                dropPreview={dropPreview}
              />
            )}
            <DragOverlay
              dropAnimation={{
                duration: 150,
                easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
              style={{ cursor: "grabbing" }}
            >
              {activeEvent ? (
                // No width/height override: dnd-kit's overlay wrapper sizes to
                // the dragged element's bounding rect, and CalendarEventUI uses
                // h-full w-full so it fills exactly that — cursor stays at the
                // exact grab point, no horizontal shift.
                <CalendarEventUI
                  event={activeEvent}
                  isOverlay
                  style={{
                    width: draggedRect?.width,
                    height: draggedRect?.height,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  }}
                />
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
