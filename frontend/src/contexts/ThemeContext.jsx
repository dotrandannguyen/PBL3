/**
 * Theme Context — Light/Dark mode management
 *
 * Strategy:
 *   - Stores theme preference in localStorage keyed per user ID
 *   - Applies `data-theme` attribute on <html> element
 *   - CSS custom properties in index.css respond to [data-theme="light"]
 *
 * Usage:
 *   const { theme, setTheme } = useTheme();
 */

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { updateCurrentUser } from "../features/setting/api/user.api";

const ThemeContext = createContext(null);

export function ThemeProvider({
  children,
  userId,
  initialTheme,
  onUserUpdate,
}) {
  const [theme, setThemeState] = useState(
    initialTheme === "light" ? "light" : "dark",
  );

  useEffect(() => {
    const resolved = initialTheme === "light" ? "light" : "dark";
    setThemeState(resolved);
  }, [initialTheme]);

  // Apply data-theme attribute to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback(
    async (newTheme) => {
      const value = newTheme === "light" ? "light" : "dark";
      setThemeState(value);

      if (!userId) {
        return;
      }

      try {
        const response = await updateCurrentUser({ theme: value });
        const updated = response?.data?.data;
        if (updated && typeof onUserUpdate === "function") {
          onUserUpdate(updated);
        }
      } catch (error) {
        console.warn("Không thể lưu theme lên server", error);
      }
    },
    [userId, onUserUpdate],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return context;
}

export default ThemeContext;
