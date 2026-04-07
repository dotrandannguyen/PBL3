import apiClient from "../../../shared/api/apiClient";

export const getEvents = (params) =>
  apiClient.get("/v1/api/events", { params });

export const getEvent = (id) => apiClient.get(`/v1/api/events/${id}`);

export const createEvent = (data) => apiClient.post("/v1/api/events", data);

export const updateEvent = (id, data) =>
  apiClient.patch(`/v1/api/events/${id}`, data);

export const deleteEvent = (id) => apiClient.delete(`/v1/api/events/${id}`);
