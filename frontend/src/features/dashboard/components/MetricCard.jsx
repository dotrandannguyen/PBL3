import React from 'react';

/**
 * MetricCard — a single KPI card with icon, value, label, and optional delta badge.
 *
 * Props:
 *   icon         - Lucide React icon component
 *   label        - string
 *   value        - number | string
 *   delta        - { delta, growthPct } | null
 *   accentClass  - Tailwind color class for the accent ring / icon
 *   glowClass    - Tailwind gradient class for the background glow
 *   subtitle     - optional string
 */
export function MetricCard({ icon, label, value, delta, accentClass, glowClass, subtitle }) {
  const hasGrowth = delta && delta.growthPct !== null && delta.growthPct !== undefined;
  const positive = hasGrowth && delta.growthPct >= 0;
  const growthColor = positive ? 'text-emerald-400' : 'text-red-400';
  const growthSign = positive ? '+' : '';

  return (
    <div className="relative rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-5 overflow-hidden group hover:border-border-focused transition-colors duration-200">
      {/* glow orb */}
      <div
        className={`absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 ${glowClass}`}
      />
      <div className="relative">
        {/* Icon */}
        <div
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-bg-hover ring-1 ${accentClass} mb-3`}
        >
          {icon}
        </div>

        {/* Value */}
        <div className="text-3xl font-bold text-text-primary tracking-tight leading-none">
          {value}
        </div>

        {/* Label + subtitle */}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-tertiary">{label}</span>
          {subtitle && (
            <span className="text-xs text-text-tertiary opacity-60">· {subtitle}</span>
          )}
        </div>

        {/* Delta badge */}
        {hasGrowth && (
          <div
            className={`mt-3 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-bg-hover ${growthColor}`}
          >
            <span>{growthSign}{delta.growthPct.toFixed(1)}%</span>
            <span className="text-text-tertiary font-normal">vs prev</span>
          </div>
        )}
      </div>
    </div>
  );
}
