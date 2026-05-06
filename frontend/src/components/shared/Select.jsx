import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Select — custom dropdown matching the rest of the app aesthetic.
 *
 * Props:
 *   value     — currently selected option id
 *   options   — array of { value, label, hint? }
 *   onChange  — (value) => void
 *   width     — string (Tailwind class), default w-44
 *   align     — "left" | "right" — dropdown panel alignment
 *   disabled  — boolean
 *   placeholder — string
 */
export default function Select({
  value,
  options = [],
  onChange,
  width = "w-48",
  align = "right",
  disabled = false,
  placeholder = "Select…",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  const current = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (!open) {
        if (
          e.key === "Enter" ||
          e.key === " " ||
          e.key === "ArrowDown" ||
          e.key === "ArrowUp"
        ) {
          e.preventDefault();
          setOpen(true);
          setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (highlight >= 0) {
          onChange?.(options[highlight].value);
          setOpen(false);
        }
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    },
    [open, options, value, highlight, onChange, disabled]
  );

  const alignClass = align === "left" ? "left-0" : "right-0";

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group flex h-9 ${width} items-center justify-between gap-2 rounded-lg border bg-bg-main px-3 text-sm transition-all duration-150 ${
          disabled
            ? "cursor-not-allowed opacity-50 border-border-subtle"
            : open
              ? "border-accent-primary ring-2 ring-accent-primary/20 text-text-primary"
              : "border-border-subtle hover:border-border-focused text-text-primary"
        }`}
      >
        <span className="truncate text-left">
          {current ? (
            current.label
          ) : (
            <span className="text-text-tertiary">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-tertiary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className={`absolute ${alignClass} top-full z-30 mt-1.5 ${width} max-h-64 overflow-y-auto rounded-lg border border-border-subtle bg-bg-sidebar p-1 shadow-2xl shadow-black/50 animate-dropdown-in`}
        >
          {options.map((opt, idx) => {
            const isActive = opt.value === value;
            const isHighlighted = idx === highlight;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-100 ${
                  isHighlighted
                    ? "bg-white/[0.06] text-text-primary"
                    : isActive
                      ? "text-accent-primary"
                      : "text-text-secondary"
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{opt.label}</span>
                  {opt.hint && (
                    <span className="block text-[11px] text-text-tertiary truncate">
                      {opt.hint}
                    </span>
                  )}
                </span>
                {isActive && (
                  <Check size={13} className="shrink-0 text-accent-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
