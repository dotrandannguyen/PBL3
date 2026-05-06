/**
 * Cấu hình Router
 * Thiết lập định tuyến tập trung sử dụng React Router DOM
 * Định nghĩa tất cả các tuyến đường của ứng dụng và các component liên quan
 */
import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import { RootLayout } from "@/layouts/RootLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import {
  LoginPage,
  RegisterPage,
  GoogleCallbackPage,
  ProtectedRoute,
} from "@/features/auth";
import { WorkspacePage } from "@/features/workspace";
import { CalendarPage } from "@/features/google-calendar";
import { MailReceiverPage } from "@/features/notification-receiver";
import { SettingsPage } from "@/features/setting";
import { TrashPage } from "@/features/trash";
import { LandingPage } from "@/features/landing";
import { DashboardPage } from "@/features/dashboard";

// TODO: Import routes của các tính năng khi được xây dựng
// import { GithubRoutes } from '@/features/github';
// import { EmailRoutes } from '@/features/email';

const router = createBrowserRouter([
  {
    // RootLayout bọc AuthProvider + health check cho toàn bộ ứng dụng
    element: <RootLayout />,
    children: [
      // ── Public Auth Routes ──────────────────────────────────────────
      {
        path: "/auth",
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "google-callback", element: <GoogleCallbackPage /> },
          // backward compat — giữ route cũ trong khi cấu hình backend được cập nhật
          { path: "callback", element: <GoogleCallbackPage /> },
        ],
      },

      // ── Protected Routes (yêu cầu đăng nhập) ────────────────────────
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: "/app", element: <WorkspacePage /> },
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/calendar", element: <CalendarPage /> },
              { path: "/mail", element: <MailReceiverPage /> },
              { path: "/settings", element: <SettingsPage /> },
              { path: "/trash", element: <TrashPage /> },
            ],
          },
        ],
      },

      // ── Landing page (public) ───────────────────────────────────────
      { path: "/", element: <LandingPage /> },

      // ── Catch-all ────────────────────────────────────────────────────
      { path: "*", element: <Navigate to="/" replace /> },

      // TODO: Thêm route của các tính năng tại đây
      // ...GithubRoutes,
      // ...EmailRoutes,
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export { router };
