/**
 * Root App Component
 *
 * File: frontend/src/App.jsx
 *
 * Mục đích: Cấu hình global providers + routing
 *
 * Providers:
 * - TasksProvider: State management cho tasks (từ features/tasks/context)
 * - AppRouter: React Router DOM routes
 * - Toaster: Toast notifications (từ sonner)
 *
 * Docs: "Context Provider composition", "React Router setup"
 */

import React, { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { AppRouter } from "./router";
import { TasksProvider } from "./features/tasks/context/TasksContext";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    document.documentElement.classList.add("theme-transition");
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 400);
  };

  return (
    <TasksProvider>
      <AppRouter />
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <Toaster
        position="top-right"
        theme={theme}
        richColors
        closeButton
        expand
      />
    </TasksProvider>
  );
}

export default App;
