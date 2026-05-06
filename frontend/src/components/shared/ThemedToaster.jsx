import React from "react";
import { Toaster } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * ThemedToaster — Sonner Toaster that follows the active app theme.
 * Must be rendered inside a <ThemeProvider>.
 */
export default function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      theme={theme === "light" ? "light" : "dark"}
      richColors
      closeButton
      expand
      toastOptions={{
        duration: 3500,
        className: "shadow-lg",
      }}
    />
  );
}
