import React from 'react';

/**
 * BarChart — weekly bar chart showing total vs completed tasks per day/week.
 *
 * Props:
 *   data    - array of { date|weekStart|month, total, completed, pending }
 *   labelKey - key name for x-axis label (default 'date')
 *   height  - chart height in px (default 200)
 */
export function BarChart({ data = [], labelKey = 'date', height = 200 }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-text-tertiary text-sm" style={{ height }}>
        No data for this period
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => Number(d.total) || 0), 1);
  const barW = Math.max(8, Math.min(40, Math.floor(680 / data.length) - 6));

  const [tooltip, setTooltip] = React.useState(null);

  const formatLabel = (val) => {
    if (!val) return '';
    // weekStart like "2026-05-12 00:00:00" or ISO
    const d = new Date(val);
    if (isNaN(d)) return String(val).slice(0, 10);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative select-none" style={{ height }}>
      {/* Y-axis grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <div
          key={f}
          className="absolute left-0 right-0 border-t border-border-subtle/60"
          style={{ bottom: `${f * 80}%`, top: 'auto' }}
        />
      ))}

      {/* Bars */}
      <div className="absolute inset-0 flex items-end gap-1 px-1 pb-7">
        {data.map((d, i) => {
          const total = Number(d.total) || 0;
          const completed = Number(d.completed) || 0;
          const pending = Number(d.pending) || 0;
          const totalH = (total / maxTotal) * 80;
          const completedH = (completed / maxTotal) * 80;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-0.5 group cursor-default"
              onMouseEnter={() => setTooltip({ i, ...d })}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Bar group */}
              <div className="relative w-full flex items-end justify-center gap-px" style={{ height: '80%' }}>
                {/* Total bar (background) */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-md bg-bg-hover ring-1 ring-border-subtle/60 transition-all duration-300"
                  style={{ width: barW, height: `${totalH}%` }}
                />
                {/* Completed bar (foreground) */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-md bg-accent-primary/80 group-hover:bg-accent-primary transition-all duration-300"
                  style={{ width: barW * 0.6, height: `${completedH}%` }}
                />
              </div>

              {/* X-axis label */}
              <span className="text-[10px] text-text-tertiary truncate w-full text-center leading-tight">
                {formatLabel(d[labelKey] ?? d.date ?? d.weekStart ?? d.month)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip !== null && (
        <div
          className="absolute z-20 bg-bg-sidebar border border-border-focused rounded-xl px-3 py-2 text-xs shadow-lg pointer-events-none"
          style={{
            bottom: '115%',
            left: `${(tooltip.i / data.length) * 100}%`,
            transform: 'translateX(-50%)',
            minWidth: 120,
          }}
        >
          <div className="font-medium text-text-primary mb-1">
            {formatLabel(tooltip[labelKey] ?? tooltip.date ?? tooltip.weekStart ?? tooltip.month)}
          </div>
          <div className="flex flex-col gap-0.5 text-text-secondary">
            <span>Total: <b className="text-text-primary">{tooltip.total ?? 0}</b></span>
            <span>Completed: <b className="text-emerald-400">{tooltip.completed ?? 0}</b></span>
            <span>Pending: <b className="text-blue-400">{tooltip.pending ?? 0}</b></span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-0 right-0 flex items-center gap-3 text-[10px] text-text-tertiary">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-bg-hover ring-1 ring-border-subtle/60 inline-block" />
          Total
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-primary/80 inline-block" />
          Completed
        </span>
      </div>
    </div>
  );
}
