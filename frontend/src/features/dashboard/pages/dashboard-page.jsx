import React from 'react';
import {
  LayoutDashboard,
  CheckCircle2,
  Circle,
  Flame,
  ListTodo,
  Clock,
  Layers,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { useDashboardOverview } from '../hooks/useDashboardOverview';
import { MetricCard } from '../components/MetricCard';
import { BarChart } from '../components/BarChart';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { SparkLine, ProductivityChart } from '../components/AnalyticsCharts';
import { InsightPanel } from '../components/InsightPanel';
import ProgressRing from '../components/ProgressRing';

// ── Date helpers ─────────────────────────────────────────────────────────────

const toISO = (d) => d.toISOString().split('T')[0];

const startOfWeek = (ref = new Date()) => {
  const d = new Date(ref);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (ref = new Date()) => {
  const d = new Date(ref.getFullYear(), ref.getMonth(), 1);
  return d;
};

const endOfMonth = (ref = new Date()) =>
  new Date(ref.getFullYear(), ref.getMonth() + 1, 0);

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const addMonths = (d, n) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, subtitle, icon: Icon, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon size={14} className="text-accent-primary" />}
            <h2 className="text-sm font-semibold text-text-secondary">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse-dot">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
      <Skeleton className="h-44" />
    </div>
  );
}

// ── Mode Toggle ───────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center p-0.5 rounded-lg bg-bg-hover ring-1 ring-border-subtle">
      {['week', 'month'].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 text-xs rounded-md font-medium transition-all duration-150 capitalize
            ${mode === m
              ? 'bg-bg-sidebar text-text-primary shadow-sm ring-1 ring-border-subtle'
              : 'text-text-tertiary hover:text-text-secondary'
            }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [mode, setMode] = React.useState('week');
  const [offset, setOffset] = React.useState(0); // 0 = current period

  // Compute date range from mode + offset
  const { startDate, endDate } = React.useMemo(() => {
    if (mode === 'week') {
      const base = startOfWeek(addDays(new Date(), offset * 7));
      return { startDate: toISO(base), endDate: toISO(addDays(base, 6)) };
    } else {
      const base = startOfMonth(addMonths(new Date(), offset));
      return { startDate: toISO(base), endDate: toISO(endOfMonth(base)) };
    }
  }, [mode, offset]);

  const { data, loading, error, refetch } = useDashboardOverview({ startDate, endDate, mode });

  // Reset offset when mode changes
  const handleModeChange = (m) => { setMode(m); setOffset(0); };

  const summary = data?.summary ?? {};
  const comparison = data?.comparison ?? {};
  const delta = comparison.delta ?? {};

  const completionTrendValues = (data?.completionTrend ?? []).map((d) => Number(d.completionRate) || 0);
  const isCurrentPeriod = offset === 0;
  const periodLabel =
    offset === 0
      ? 'Current period'
      : offset === -1
      ? 'Last period'
      : `${Math.abs(offset)} periods ago`;

  return (
    <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto w-full animate-route-fade-in">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider text-text-tertiary">
            <LayoutDashboard size={11} className="text-accent-primary" />
            <span>Analytics</span>
            {data?.cached && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-bg-hover text-text-tertiary">cached</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Overview</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            {fmtDate(startDate)} – {fmtDate(endDate)} · {periodLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Period navigator */}
          <button
            onClick={() => setOffset((p) => p - 1)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
            title="Previous period"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setOffset(0)}
            disabled={isCurrentPeriod}
            className="px-2.5 py-1 rounded-lg text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setOffset((p) => p + 1)}
            disabled={isCurrentPeriod}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next period"
          >
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-5 bg-border-subtle mx-1" />

          <ModeToggle mode={mode} onChange={handleModeChange} />

          <button
            onClick={refetch}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/25 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && !data && <DashboardSkeleton />}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      {data && (
        <div className="flex flex-col gap-5">

          {/* ── Section 1: Summary Cards ───────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<CheckCircle2 size={16} />}
              label="Completed"
              value={summary.completedTasks ?? 0}
              delta={delta.completedTasks}
              accentClass="ring-emerald-500/25 text-emerald-400"
              glowClass="bg-gradient-to-br from-emerald-500/20 to-transparent"
            />
            <MetricCard
              icon={<Circle size={16} />}
              label="Pending"
              value={summary.pendingTasks ?? 0}
              delta={delta.pendingTasks}
              accentClass="ring-blue-500/25 text-blue-400"
              glowClass="bg-gradient-to-br from-blue-500/20 to-transparent"
            />
            <MetricCard
              icon={<Flame size={16} />}
              label="Overdue"
              value={data.overdueCount ?? summary.overdueTasks ?? 0}
              delta={delta.overdueTasks}
              accentClass="ring-red-500/25 text-red-400"
              glowClass="bg-gradient-to-br from-red-500/20 to-transparent"
            />
            <MetricCard
              icon={<ListTodo size={16} />}
              label="Total Tasks"
              value={summary.totalTasks ?? 0}
              delta={delta.totalTasks}
              accentClass="ring-purple-500/25 text-purple-400"
              glowClass="bg-gradient-to-br from-purple-500/20 to-transparent"
            />
          </div>

          {/* ── Row: Progress ring + extra KPIs + Insights ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Progress ring */}
            <div className="rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-6 flex flex-col items-center justify-center">
              <h2 className="text-sm font-semibold text-text-secondary self-start mb-4">
                Completion Rate
              </h2>
              <ProgressRing
                value={summary.completedTasks ?? 0}
                total={summary.totalTasks ?? 0}
                label="done"
              />
              <div className="mt-4 w-full grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-text-primary">
                    {summary.avgLeadTimeHours !== null && summary.avgLeadTimeHours !== undefined
                      ? `${Math.round((summary.avgLeadTimeHours ?? 0) / 24)}d`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">Avg Lead Time</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-text-primary">
                    {summary.backlogRate ?? 0}%
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">Backlog Rate</div>
                </div>
              </div>
            </div>

            {/* Completion trend sparkline */}
            <div className="rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} className="text-accent-primary" />
                <h2 className="text-sm font-semibold text-text-secondary">Completion Trend</h2>
              </div>
              <p className="text-xs text-text-tertiary mb-4">14-day rolling completion %</p>
              {completionTrendValues.length >= 2 ? (
                <>
                  <SparkLine data={completionTrendValues} width={240} height={56} />
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-[10px] text-text-tertiary">
                      {(data.completionTrend ?? [])[0]?.date}
                    </span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-text-primary">
                        {completionTrendValues[completionTrendValues.length - 1].toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-text-tertiary">today</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-sm text-text-tertiary">
                  Not enough data yet
                </div>
              )}
            </div>

            {/* Auto Insights */}
            <div className="rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-6 overflow-y-auto max-h-64">
              <InsightPanel insights={data.insights ?? []} />
            </div>
          </div>

          {/* ── Section 2: Weekly Bar Chart ────────────────────────────── */}
          <Section
            title="Weekly Distribution"
            subtitle={`Tasks per week — last 8 weeks`}
            icon={BarChart2}
          >
            <BarChart
              data={data.weeklyComparison ?? []}
              labelKey="weekStart"
              height={220}
            />
          </Section>

          {/* ── Row: Monthly + Daily creation/completion ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Section title="Monthly Overview" subtitle="Last 6 months" icon={Calendar}>
              <BarChart
                data={data.monthlyComparison ?? []}
                labelKey="month"
                height={180}
              />
            </Section>

            <Section
              title="Daily Activity"
              subtitle={`${mode === 'week' ? 'This week' : 'This month'}: created vs completed`}
              icon={Layers}
            >
              {/* Dual micro-bar: creation vs completion per day */}
              {(() => {
                const creationMap = {};
                (data.dailyCreation ?? []).forEach((d) => { creationMap[d.date] = Number(d.createdCount) || 0; });
                const completionMap = {};
                (data.dailyCompletion ?? []).forEach((d) => { completionMap[d.date] = Number(d.completedCount) || 0; });

                // Build unified date list
                const allDates = Array.from(new Set([
                  ...(data.dailyCreation ?? []).map((d) => d.date),
                  ...(data.dailyCompletion ?? []).map((d) => d.date),
                ])).sort();

                if (!allDates.length) {
                  return (
                    <div className="h-44 flex items-center justify-center text-sm text-text-tertiary">
                      No data for this period
                    </div>
                  );
                }

                const unified = allDates.map((date) => ({
                  date,
                  total: creationMap[date] ?? 0,
                  completed: completionMap[date] ?? 0,
                  pending: 0,
                }));

                return <BarChart data={unified} labelKey="date" height={180} />;
              })()}
            </Section>
          </div>

          {/* ── Section 3: Monthly Heatmap ─────────────────────────────── */}
          <Section
            title="Activity Heatmap"
            subtitle="Daily task creation over the last 12 weeks"
            icon={Calendar}
          >
            <div className="overflow-x-auto pb-1">
              <ActivityHeatmap data={data.heatmap ?? []} days={84} />
            </div>
          </Section>

          {/* ── Section 4: Performance Analytics ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Productivity by weekday */}
            <Section
              title="Productivity by Day"
              subtitle="Completion rate per weekday (last 60 days)"
              icon={TrendingUp}
            >
              {(data.productivityByDow ?? []).length ? (
                <ProductivityChart data={data.productivityByDow} />
              ) : (
                <div className="h-28 flex items-center justify-center text-sm text-text-tertiary">
                  Not enough data yet
                </div>
              )}
            </Section>

            {/* Comparison table */}
            <Section
              title="Period Comparison"
              subtitle={`${fmtDate(comparison?.period?.current?.startDate)} vs ${fmtDate(comparison?.period?.previous?.startDate)}`}
              icon={BarChart2}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-subtle">
                    <th className="text-left pb-2 font-medium">Metric</th>
                    <th className="text-right pb-2 font-medium">Current</th>
                    <th className="text-right pb-2 font-medium">Previous</th>
                    <th className="text-right pb-2 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {[
                    { label: 'Total', key: 'totalTasks' },
                    { label: 'Completed', key: 'completedTasks' },
                    { label: 'Pending', key: 'pendingTasks' },
                    { label: 'Overdue', key: 'overdueTasks' },
                    { label: 'Rate', key: 'completionRate', suffix: '%' },
                  ].map(({ label, key, suffix = '' }) => {
                    const d = delta[key];
                    if (!d) return null;
                    const positive = d.delta <= 0 || key === 'completedTasks' || key === 'completionRate' ? d.delta >= 0 : false;
                    const isGoodUp = key === 'completedTasks' || key === 'completionRate';
                    const deltaColor =
                      d.delta === 0 ? 'text-text-tertiary'
                        : (isGoodUp ? d.delta > 0 : d.delta < 0) ? 'text-emerald-400' : 'text-red-400';
                    return (
                      <tr key={key}>
                        <td className="py-2 text-text-secondary">{label}</td>
                        <td className="py-2 text-right text-text-primary font-medium tabular-nums">
                          {d.current}{suffix}
                        </td>
                        <td className="py-2 text-right text-text-tertiary tabular-nums">
                          {d.previous}{suffix}
                        </td>
                        <td className={`py-2 text-right font-medium tabular-nums ${deltaColor}`}>
                          {d.delta > 0 ? '+' : ''}{d.delta}{suffix}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          </div>

        </div>
      )}
    </div>
  );
}
