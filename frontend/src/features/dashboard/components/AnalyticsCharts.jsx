import React from 'react';

/**
 * SparkLine — a minimal SVG line chart for trend data.
 *
 * Props:
 *   data       - array of numbers (y-values)
 *   width      - SVG width (default 120)
 *   height     - SVG height (default 36)
 *   color      - stroke color class (Tailwind not supported in SVG, use hex directly)
 *   fillColor  - fill hex (semi-transparent)
 */
export function SparkLine({ data = [], width = 120, height = 36, color = '#2383e2', fillColor = 'rgba(35,131,226,0.12)' }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data, min + 1);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / (max - min)) * h;
    return [x, y];
  });

  const polyline = points.map((p) => p.join(',')).join(' ');
  const fillPath = `M${points[0][0]},${height} ${points.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${points[points.length - 1][0]},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={fillPath} fill={fillColor} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* end dot */}
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

/**
 * ProductivityChart — horizontal bar chart by day of week.
 *
 * Props:
 *   data - array of { dayName, completionRate, total, completed }
 */
export function ProductivityChart({ data = [] }) {
  const [tooltip, setTooltip] = React.useState(null);

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const rate = Number(d.completionRate) || 0;
        const color =
          rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-accent-primary' : 'bg-red-500';

        return (
          <div
            key={d.dayName}
            className="flex items-center gap-3 group cursor-default"
            onMouseEnter={() => setTooltip(d)}
            onMouseLeave={() => setTooltip(null)}
          >
            <span className="text-xs text-text-tertiary w-11 shrink-0">{d.dayName?.slice(0, 3)}</span>
            <div className="flex-1 h-2 rounded-full bg-bg-hover overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary w-9 text-right tabular-nums">
              {rate.toFixed(0)}%
            </span>
          </div>
        );
      })}

      {tooltip && (
        <div className="mt-1 text-xs text-text-tertiary px-1">
          {tooltip.dayName}: {tooltip.completed}/{tooltip.total} tasks completed
        </div>
      )}
    </div>
  );
}
