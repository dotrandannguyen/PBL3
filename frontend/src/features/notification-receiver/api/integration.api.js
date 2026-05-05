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
  getSlackPreview: async () => {
    const response = await apiClient.get("/v1/api/integrations/preview/slack");
    return response.data;
  },
  getGithubRepositories: async () => {
    const response = await apiClient.get(
      "/v1/api/integrations/github/repositories",
    );
    return response.data;
  },
  setupGithubWebhooks: async (repositoryIds) => {
    const response = await apiClient.post(
      "/v1/api/integrations/github/setup-webhooks",
      { repositoryIds },
    );
    return response.data;
  },
  disableGithubWebhook: async (repositoryId) => {
    const response = await apiClient.delete(
      "/v1/api/integrations/github/webhooks",
      { data: { repositoryId } },
    );
    return response.data;
  },
};
