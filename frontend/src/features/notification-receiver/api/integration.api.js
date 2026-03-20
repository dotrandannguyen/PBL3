import apiClient from "../../../shared/api/apiClient";

export const integrationAPI = {
  getGmailPreview: async () => {
    const response = await apiClient.get("/v1/api/integrations/preview/gmail");
    return response.data;
  },
  getGithubPreview: async () => {
    const response = await apiClient.get("/v1/api/integrations/preview/github");
    return response.data;
  },
};
