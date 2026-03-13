import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { healthCheck } from "@/features/auth/api/auth.api";

/**
 * RootLayout — Wrapper ngoài cùng cho toàn bộ ứng dụng.
 * - Bọc AuthProvider (cần useNavigate nên phải nằm trong RouterProvider)
 * - Thực hiện health check kết nối backend khi khởi động
 */
export function RootLayout() {
  useEffect(() => {
    healthCheck()
      .then((res) => console.log("[Health Check] Backend OK ✓", res.data))
      .catch((err) =>
        console.error("[Health Check] Backend unreachable ✗", err.message),
      );
  }, []);

  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
