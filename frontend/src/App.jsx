import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import WorkspacePage from "./features/workspace/pages/WorkspacePage";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import MailReceiverPage from "./features/NotificationReceiver/pages/MailReceiverPage";
import CalendarPage from "./features/GoogleCalendar/pages/CalendarPage";
import OAuthCallbackPage from "./features/auth/pages/OAuthCallbackPage";
import { AuthProvider } from "./features/auth/context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { healthCheck } from "./features/auth/api/auth.api";

// AuthProvider uses useNavigate so it must live inside <Router>
function AppRoutes() {
  useEffect(() => {
    healthCheck()
      .then((res) => console.log("[Health Check] Backend OK ✓", res.data))
      .catch((err) =>
        console.error("[Health Check] Backend unreachable ✗", err.message),
      );
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route path="/mail" element={<MailReceiverPage />} />
      <Route path="/work" element={<WorkspacePage />} />
      <Route path="/calendar" element={<CalendarPage />} />

    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
