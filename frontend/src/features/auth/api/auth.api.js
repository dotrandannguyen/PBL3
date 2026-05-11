import apiClient from "../../../shared/api/apiClient";

/** Sample connectivity test — GET /health */
export const healthCheck = () => apiClient.get("/health");

/** POST /v1/api/auth/register  — body: { name, email, password } */
export const registerUser = (data) =>
  apiClient.post("/v1/api/auth/register", data);

/** POST /v1/api/auth/login  — body: { email, password } */
export const loginUser = (data) => apiClient.post("/v1/api/auth/login", data);

/** GET /v1/api/auth/google/url  — returns { data: { url } } */
export const getGoogleAuthUrl = () => apiClient.get("/v1/api/auth/google/url");

/** GET /v1/api/auth/google/link-url  — returns { data: { url } } */
export const getGoogleLinkUrl = () =>
  apiClient.get("/v1/api/auth/google/link-url");

/** GET /v1/api/auth/github/url  — returns { data: { url } } */
export const getGithubAuthUrl = () => apiClient.get("/v1/api/auth/github/url");

/** GET /v1/api/auth/github/link-url  — returns { data: { url } } */
export const getGithubLinkUrl = () =>
  apiClient.get("/v1/api/auth/github/link-url");

/** GET /v1/api/auth/slack/url  — returns { data: { url } } */
export const getSlackAuthUrl = () => apiClient.get("/v1/api/auth/slack/url");

/** GET /v1/api/auth/slack/link-url  — returns { data: { url } } */
export const getSlackLinkUrl = () =>
  apiClient.get("/v1/api/auth/slack/link-url");
