import React, { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../api/auth.api";
import axios from "axios";
import apiClient, { setInMemoryToken } from "../../../shared/api/apiClient";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Silent refresh from cookie on mount
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

        const res = await axios.post(
          `${API_BASE_URL}/v1/api/auth/refresh`,
          {},
          { withCredentials: true }, // Gửi cookie (refresh token) cùng request
        );

        const token = res.data?.data?.accessToken;
        if (token) {
          setInMemoryToken(token);
          setAccessToken(token);

          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              localStorage.removeItem("user");
            }
          }
        }
      } catch {
        setInMemoryToken(null);
        setAccessToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
      } finally {
        setIsLoading(false);
      }
    };

    silentRefresh();
  }, []);

  const refreshSession = useCallback(async () => {
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    const res = await axios.post(
      `${API_BASE_URL}/v1/api/auth/refresh`,
      {},
      { withCredentials: true },
    );

    const token = res.data?.data?.accessToken;
    if (!token) {
      throw new Error("Missing access token after refresh");
    }

    setInMemoryToken(token);
    setAccessToken(token);

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }

    return token;
  }, []);
  const persistAuth = (data) => {
    setInMemoryToken(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.removeItem("accessToken");
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
  const logout = useCallback(async () => {
    try {
      // Gọi lên Backend để nó thực hiện hàm res.clearCookie('refreshToken')
      await apiClient.post("/v1/api/auth/logout");
    } catch (error) {
      console.warn("Logout API failed, forcing local logout", error);
    }
    setInMemoryToken(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
    navigate("/auth/login", { replace: true });
  }, [navigate]);

  /**
   * Update user fields in localStorage + React state (no backend call).
   * Used by Settings > Profile to save name/avatar changes.
   * @param {Object} updatedFields — fields to merge into the current user object
   */
  const updateUserInStorage = useCallback((updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken, // ép kiểu boolean
        isLoading,
        login,
        loginWithOAuth,
        refreshSession,
        register,
        logout,
        updateUserInStorage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
