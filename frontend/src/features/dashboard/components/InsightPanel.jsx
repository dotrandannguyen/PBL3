import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Info, CheckCircle, Zap } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-red-500/8 border-red-500/25',
    icon_class: 'text-red-400',
    dot: 'bg-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/8 border-amber-500/25',
    icon_class: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  positive: {
    icon: TrendingUp,
    bg: 'bg-emerald-500/8 border-emerald-500/25',
    icon_class: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  info: {
    icon: Info,
    bg: 'bg-accent-primary/8 border-accent-primary/25',
    icon_class: 'text-accent-primary',
    dot: 'bg-accent-primary',
  },
};

/**
 * InsightCard — a single auto-generated insight.
 */
function InsightCard({ insight }) {
  const cfg = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} transition-all duration-200`}>
      <div className={`mt-0.5 shrink-0 ${cfg.icon_class}`}>
        <Icon size={14} />
      </div>
      <p className="text-sm text-text-secondary leading-snug">{insight.message}</p>
    </div>
  );
}

/**
 * InsightPanel — renders the full insights list.
 *
 * Props:
 *   insights - array of { type, severity, message }
 */
export function InsightPanel({ insights = [] }) {
  if (!insights.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={13} className="text-accent-primary" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Auto Insights
        </span>
        <span className="ml-auto text-[10px] text-text-tertiary px-2 py-0.5 rounded-full bg-bg-hover">
          {insights.length} finding{insights.length !== 1 ? 's' : ''}
        </span>
      </div>
      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}
    </div>
  );
}
