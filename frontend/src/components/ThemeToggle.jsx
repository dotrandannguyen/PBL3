import React from "react";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = ({ theme, toggleTheme }) => {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="theme-toggle-btn"
    >
      <span
        style={{
          display: "inline-flex",
          transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.25s ease",
          transform: isDark ? "rotate(-90deg)" : "rotate(0deg)",
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  );
};

export default ThemeToggle;
