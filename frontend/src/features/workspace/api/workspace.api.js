import apiClient from "../../../shared/api/apiClient";

export const getWorkspaces = async () => {
  const response = await apiClient.get("/v1/api/workspaces");
  return response.data;
};

export const createWorkspace = async (data) => {
  const response = await apiClient.post("/v1/api/workspaces", data);
  return response.data;
};

export const updateWorkspace = async (id, data) => {
  const response = await apiClient.patch(`/v1/api/workspaces/${id}`, data);
  return response.data;
};

export const deleteWorkspace = async (id) => {
  const response = await apiClient.delete(`/v1/api/workspaces/${id}`);
  return response.data;
};
