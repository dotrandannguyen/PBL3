import apiClient from "../../../shared/api/apiClient";

export const getCurrentUser = () => apiClient.get("/v1/api/user/me");

export const updateCurrentUser = (data) =>
  apiClient.patch("/v1/api/user/me", data);

export const getNotificationPreferences = () =>
  apiClient.get("/v1/api/user/me/notification-preferences");

export const updateNotificationPreferences = (data) =>
  apiClient.patch("/v1/api/user/me/notification-preferences", data);
