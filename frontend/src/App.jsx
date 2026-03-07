import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import WorkspacePage from "./pages/WorkspacePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MailReceiverPage from "./pages/MailReceiverPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import { AuthProvider } from "./features/auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { healthCheck } from "./features/auth/auth.api";

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
