import apiClient from "../../../utils/apiClient";

/** Sample connectivity test — GET /health */
export const healthCheck = () => apiClient.get("/health");

/** POST /v1/api/auth/register  — body: { name, email, password } */
export const registerUser = (data) =>
  apiClient.post("/v1/api/auth/register", data);

/** POST /v1/api/auth/login  — body: { email, password } */
export const loginUser = (data) => apiClient.post("/v1/api/auth/login", data);

/** GET /v1/api/auth/google/url  — returns { data: { url } } */
export const getGoogleAuthUrl = () => apiClient.get("/v1/api/auth/google/url");

/** GET /v1/api/auth/github/url  — returns { data: { url } } */
export const getGithubAuthUrl = () => apiClient.get("/v1/api/auth/github/url");
