import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { healthCheck } from "@/features/auth/api/auth.api";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemedToaster from "@/components/shared/ThemedToaster";
import useAuth from "@/features/auth/hooks/useAuth";

/**
 * RootLayout — Wrapper ngoài cùng cho toàn bộ ứng dụng.
 * - Bọc AuthProvider (cần useNavigate nên phải nằm trong RouterProvider)
 * - Thực hiện health check kết nối backend khi khởi động
 */
const AppProviders = () => {
  const { user, updateUserInStorage } = useAuth();

  return (
    <LanguageProvider
      userId={user?.id}
      initialLang={user?.language}
      onUserUpdate={updateUserInStorage}
    >
      <ThemeProvider
        userId={user?.id}
        initialTheme={user?.theme}
        onUserUpdate={updateUserInStorage}
      >
        <Outlet />
        <ThemedToaster />
      </ThemeProvider>
    </LanguageProvider>
  );
};

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
      <AppProviders />
    </AuthProvider>
  );
}
