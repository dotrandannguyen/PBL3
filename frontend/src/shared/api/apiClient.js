import axios from "axios";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const NETWORK_ERROR_MESSAGE = `Không thể kết nối server (${API_BASE_URL}).`;

let inMemoryAccessToken = null;

export const setInMemoryToken = (token) => {
  inMemoryAccessToken = token;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Gửi cookie (refresh token) cùng request
  headers: {
    "Content-Type": "application/json",
  },
});
// Các biến quản lý việc refresh token (Tránh việc gọi refresh nhiều lần cùng lúc nếu có 3 API cùng fail 401)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: attach stored access token to every request
apiClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  // Log request để debug
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor: on 401/403/500, log error và handle
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const errorMessage = error.response?.data?.message || error.message;
    const originalRequest = error.config;

    if (!error.response && error.code === "ERR_NETWORK") {
      error.message = NETWORK_ERROR_MESSAGE;
    }

    if (error.code === "ECONNABORTED") {
      error.message = "Kết nối server quá thời gian chờ, vui lòng thử lại.";
    }

    // Log chi tiết lỗi
    console.error(`[API Error] ${method} ${url} - Status: ${status}`);
    console.error(`[API Error Message] ${errorMessage}`);
    console.error(`[Full Error Response]`, error.response?.data || error);

    if (status === 401) {
      const requestUrl = error.config?.url || "";
      const EXCLUDED_URLS = [
        "/auth/login",
        "/auth/register",
        "/health",
        "/auth/google/url",
        "/auth/github/url",
        "/auth/refresh",
        "/integrations/",
      ];
      const isExcluded = EXCLUDED_URLS.some((path) =>
        requestUrl.includes(path),
      );
      const hadToken = !!inMemoryAccessToken;
      console.warn(
        `[401 Unauthorized] ${method} ${url} - Had Token: ${hadToken}`,
      );

      if (hadToken && !isExcluded && !originalRequest?._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/v1/api/auth/refresh`,
            {},
            { withCredentials: true }, // Bắt buộc phải có để gửi Cookie lên Backend
          );
          const newAccessToken = refreshResponse.data?.data?.accessToken;

          if (!newAccessToken) {
            throw new Error("Missing access token after refresh");
          }

          setInMemoryToken(newAccessToken);
          localStorage.removeItem("accessToken");
          apiClient.defaults.headers.Authorization = `Bearer ${newAccessToken}`;

          // Trả token về cho các request đang xếp hàng
          processQueue(null, newAccessToken);
          // Cập nhật request hiện tại và chạy lại
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // BƯỚC 2: Thêm console.log để CÓ THỂ NHÌN THẤY LỖI
          console.error(
            "LỖI REFRESH TOKEN:",
            refreshError.response?.data || refreshError.message,
          );
          processQueue(refreshError, null);
          toast.error(`Phiên đăng nhập hết hạn: ${errorMessage}`);

          setInMemoryToken(null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");

          setTimeout(() => {
            window.location.href = "/auth/login?reason=session_expired";
          }, 1500);

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    } else if (status === 403) {
      console.warn(`[403 Forbidden] ${method} ${url}`);
      toast.error(`Bạn không có quyền truy cập: ${errorMessage}`);
    } else if (status === 500) {
      console.error(`[500 Server Error] ${method} ${url}`);
      toast.error(`Lỗi server: ${errorMessage}`);
    } else if (error.code === "ECONNABORTED") {
      console.error(`[Timeout] ${method} ${url}`);
      toast.error("Kết nối bị timeout, vui lòng thử lại");
    } else if (
      error.message === "Network Error" ||
      error.message === NETWORK_ERROR_MESSAGE
    ) {
      console.error(`[Network Error] ${method} ${url}`);
      toast.error(error.message);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
