import axios from "axios";
import { toast } from "sonner";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
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
  // Log request để debug
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor: on 401/403/500, log error và handle
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const errorMessage = error.response?.data?.message || error.message;

    // Log chi tiết lỗi
    console.error(`[API Error] ${method} ${url} - Status: ${status}`);
    console.error(`[API Error Message] ${errorMessage}`);
    console.error(`[Full Error Response]`, error.response?.data || error);

    if (status === 401) {
      const hadToken = !!localStorage.getItem("accessToken");
      console.warn(
        `[401 Unauthorized] ${method} ${url} - Had Token: ${hadToken}`,
      );

      if (hadToken) {
        // Hiển thị error message rõ ràng
        toast.error(`Phiên đăng nhập hết hạn: ${errorMessage}`);

        // Xóa token
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        // Delay để user kịp thấy error, rồi redirect
        setTimeout(() => {
          window.location.href = "/auth/login?reason=session_expired";
        }, 1500);
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
    } else if (error.message === "Network Error") {
      console.error(`[Network Error] ${method} ${url}`);
      toast.error("Lỗi mạng, không thể kết nối đến server");
    }

    return Promise.reject(error);
  },
);

export default apiClient;
