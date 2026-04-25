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

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'app-theme';

/**
 * Resolve the localStorage key for the current user.
 * Falls back to a generic key when no user is available.
 */
const getStorageKey = (userId) =>
  userId ? `${THEME_STORAGE_KEY}-${userId}` : THEME_STORAGE_KEY;

export function ThemeProvider({ children, userId }) {
  const [theme, setThemeState] = useState(() => {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    return stored === 'light' ? 'light' : 'dark'; // default dark
  });

  // Re-read from storage when userId changes (login / logout)
  useEffect(() => {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    const resolved = stored === 'light' ? 'light' : 'dark';
    setThemeState(resolved);
  }, [userId]);

  // Apply data-theme attribute to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme) => {
      const value = newTheme === 'light' ? 'light' : 'dark';
      setThemeState(value);
      const key = getStorageKey(userId);
      localStorage.setItem(key, value);
    },
    [userId],
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
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}

export default ThemeContext;
