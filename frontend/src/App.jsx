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
import { AppRouter } from "./router";
import { TasksProvider } from "./features/tasks/context/TasksContext";

function App() {
  return (
    <TasksProvider>
      <AppRouter />
    </TasksProvider>
  );
}

export default App;
