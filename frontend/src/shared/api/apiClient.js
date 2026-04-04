import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const NETWORK_ERROR_MESSAGE = `Không thể kết nối server (${API_BASE_URL}).`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach stored access token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on 401, clear stored auth and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response && error.code === "ERR_NETWORK") {
      error.message = NETWORK_ERROR_MESSAGE;
    }

    if (error.code === "ECONNABORTED") {
      error.message = "Kết nối server quá thời gian chờ, vui lòng thử lại.";
    }

    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const EXCLUDED_URLS = [
        "/auth/login",
        "/auth/register",
        "/health",
        "/auth/google/url",
        "/auth/github/url",
        "/integrations/", // <-- Thêm dòng này để ngăn 401 từ Github/Gmail làm văng app
      ];
      const isExcluded = EXCLUDED_URLS.some((url) => requestUrl.includes(url));

      // Only auto-redirect if we were carrying a token (i.e. not the login call itself)
      const hadToken = !!localStorage.getItem("accessToken");
      if (hadToken && !isExcluded) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
