import React from "react";

/**
 * Toggle — modern switch with subtle spring on the thumb.
 *
 * Props:
 *   checked   — boolean
 *   onChange  — (next: boolean) => void
 *   size      — "sm" | "md", default "md"
 *   disabled  — boolean
 *   id        — string (for label association)
 *   ariaLabel — accessible label
 */
export default function Toggle({
  checked = false,
  onChange,
  size = "md",
  disabled = false,
  id,
  ariaLabel,
  className = "",
}) {
  const dims =
    size === "sm"
      ? { track: "h-[18px] w-[32px]", thumb: "h-[14px] w-[14px]", on: "translate-x-[15px]", off: "translate-x-[2px]" }
      : { track: "h-[22px] w-[40px]", thumb: "h-[18px] w-[18px]", on: "translate-x-[19px]", off: "translate-x-[2px]" };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative inline-flex shrink-0 ${dims.track} items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        checked
          ? "bg-accent-primary shadow-inner shadow-accent-primary/20"
          : "bg-white/[0.08] hover:bg-white/[0.12]"
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-block ${dims.thumb} transform rounded-full bg-white shadow-sm shadow-black/20 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          checked ? dims.on : dims.off
        }`}
      />
    </button>
  );
}
