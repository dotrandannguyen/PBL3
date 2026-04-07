import React, { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../api/auth.api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // corrupted storage — clear it
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
    setIsLoading(false);
  }, []);
  const persistAuth = (data) => {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  /**
   * Login after OAuth callback — receives already-fetched { accessToken, refreshToken, user }.
   * Called by OAuthCallbackPage after reading tokens from URL params.
   */
  const loginWithOAuth = useCallback(
    (data) => {
      persistAuth(data);
      navigate("/app", { replace: true });
    },
    [navigate],
  );

  /**
   * Login with { email, password }.
   * Throws on error so the calling form can display the message.
   */
  const login = useCallback(
    async (credentials) => {
      const response = await loginUser(credentials);
      persistAuth(response.data.data);
      navigate("/app", { replace: true });
    },
    [navigate],
  );

  /**
   * Register with { name, email, password }.
   * On success redirects to /login. Throws on error.
   */
  const register = useCallback(
    async (formData) => {
      await registerUser(formData);
      navigate("/auth/login", { replace: true });
    },
    [navigate],
  );

  /** Clear session and redirect to /login. */
  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
    navigate("/auth/login", { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        loginWithOAuth,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
