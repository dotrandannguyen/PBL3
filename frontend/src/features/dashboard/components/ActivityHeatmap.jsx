import React from 'react';

/**
 * ActivityHeatmap — GitHub-style activity heatmap.
 *
 * Props:
 *   data     - array of { date: 'YYYY-MM-DD', count: number }
 *   days     - number of days to show (default 84 = 12 weeks)
 */
export function ActivityHeatmap({ data = [], days = 84 }) {
  // Build a lookup map: date-string → count
  const countMap = React.useMemo(() => {
    const m = {};
    data.forEach((d) => { m[d.date] = Number(d.count) || 0; });
    return m;
  }, [data]);

  // Generate the grid of days (most recent = bottom-right)
  const cells = React.useMemo(() => {
    const list = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      list.push({ date: iso, count: countMap[iso] ?? 0, dayOfWeek: d.getDay() });
    }
    return list;
  }, [countMap, days]);

  // Max value for intensity scaling
  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  const getColor = (count) => {
    if (count === 0) return 'bg-bg-hover';
    const ratio = count / maxCount;
    if (ratio < 0.25) return 'bg-accent-primary/20';
    if (ratio < 0.5) return 'bg-accent-primary/40';
    if (ratio < 0.75) return 'bg-accent-primary/65';
    return 'bg-accent-primary';
  };

  const [tooltip, setTooltip] = React.useState(null);

  // Split into columns of 7 (weeks)
  const weeks = React.useMemo(() => {
    const cols = [];
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7));
    }
    return cols;
  }, [cells]);

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="relative">
      <div className="flex gap-0.5">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="h-3 w-3 flex items-center justify-center text-[8px] text-text-tertiary">
              {i % 2 === 1 ? l : ''}
            </div>
          ))}
        </div>

        {/* Cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {/* pad missing days at start of first column */}
            {wi === 0 && week.length < 7 &&
              Array.from({ length: 7 - week.length }).map((_, pi) => (
                <div key={`pad-${pi}`} className="w-3 h-3" />
              ))
            }
            {week.map((cell) => (
              <div
                key={cell.date}
                className={`w-3 h-3 rounded-[2px] cursor-default transition-opacity duration-150 hover:opacity-80 ${getColor(cell.count)}`}
                onMouseEnter={(e) => setTooltip({ cell, rect: e.target.getBoundingClientRect() })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-bg-sidebar border border-border-focused rounded-lg px-3 py-1.5 text-xs shadow-xl pointer-events-none"
          style={{ top: tooltip.rect.top - 36, left: tooltip.rect.left + 8 }}
        >
          <span className="text-text-primary font-medium">{tooltip.cell.count} tasks</span>
          <span className="text-text-tertiary ml-1.5">{tooltip.cell.date}</span>
        </div>
      )}

      {/* Scale legend */}
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[10px] text-text-tertiary mr-0.5">Less</span>
        {['bg-bg-hover', 'bg-accent-primary/20', 'bg-accent-primary/40', 'bg-accent-primary/65', 'bg-accent-primary'].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`} />
        ))}
        <span className="text-[10px] text-text-tertiary ml-0.5">More</span>
      </div>
    </div>
  );
}
