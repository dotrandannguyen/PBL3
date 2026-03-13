import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuth from "@/hooks/useAuth";

/**
 * ProtectedRoute — Route guard dùng Outlet pattern (tương thích createBrowserRouter).
 * Redirect về /auth/login nếu chưa đăng nhập.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
}
