/**
 * Root App Component
 *
 * File: frontend/src/App.jsx
 *
 * Mục đích: Cấu hình global providers + routing
 *
 * Providers:
 * - LanguageProvider: App-wide language / translation (vi, ja, en)
 * - ThemeProvider: Light/Dark theme management
 * - TasksProvider: State management cho tasks (từ features/tasks/context)
 * - AppRouter: React Router DOM routes
 * - Toaster: Toast notifications (từ sonner)
 *
 * Docs: "Context Provider composition", "React Router setup"
 */

import React from "react";
import { Toaster } from "sonner";
import { AppRouter } from "./router";
import { TasksProvider } from "./features/tasks/context/TasksContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <TasksProvider>
          <AppRouter />
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            expand
          />
        </TasksProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

