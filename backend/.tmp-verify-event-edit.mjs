import { eventService } from "./src/modules/events/event.service.js";

const userId = "bd2be7d6-6c3e-4e01-ac85-0352f5e01c02";
const created = await eventService.createEvent(userId, {
  title: "[TMP] edit-time-check",
  date: "2026-04-16",
  time: "22:00",
  reminder: "NONE",
  startAt: "2026-04-16T22:00:00.000Z",
  endAt: "2026-04-16T23:00:00.000Z"
});
const updated = await eventService.updateEvent(userId, created.id, {
  time: "23:00",
  startAt: "2026-04-16T23:00:00.000Z",
  endAt: "2026-04-17T00:15:00.000Z"
});
const fetched = await eventService.getEventById(userId, created.id);
console.log(JSON.stringify({
  created: { id: created.id, time: created.time, endAt: created.endAt, eventEndAt: created.eventEndAt },
  updated: { time: updated.time, endAt: updated.endAt, eventEndAt: updated.eventEndAt },
  fetched: { time: fetched.time, endAt: fetched.endAt, eventEndAt: fetched.eventEndAt }
}, null, 2));
await eventService.deleteEvent(userId, created.id);
