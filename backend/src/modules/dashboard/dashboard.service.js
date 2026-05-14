import redisClient from '../../config/redis.js';
import { dashboardRepository } from './dashboard.repository.js';

/**
 * Dashboard Service - Business Logic + Analytics Engine
 *
 * Responsibilities:
 *  1. Orchestrate parallel repository queries
 *  2. Compute derived metrics (lead time, backlog rate, productivity trend)
 *  3. Generate automatic insights (plain-language observations)
 *  4. Apply Redis caching (TTL: 5 min)
 */

const CACHE_TTL_SECONDS = 300;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Helpers ─────────────────────────────────────────────────────────────────

const toNum = (v) => Number(v) || 0;

const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 10000) / 100);

const computeDelta = (cur, prev) => {
  const c = toNum(cur);
  const p = toNum(prev);
  const delta = c - p;
  const growthPct = p === 0 ? null : Math.round((delta / p) * 10000) / 100;
  return { current: c, previous: p, delta, growthPct };
};

const computePreviousRange = (start, end) => {
  const rangeMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - rangeMs);
  return { prevStart, prevEnd };
};

const cacheKey = (userId, start, end, mode) =>
  `dashboard:v2:${userId}:${mode}:${start.toISOString()}:${end.toISOString()}`;

// ── Insights Engine ──────────────────────────────────────────────────────────

/**
 * Generate human-readable insights from computed metrics.
 * Returns an array of { type, severity, message } objects.
 *
 * @param {object} p - all computed data
 */
function generateInsights({
  summary,
  prevSummary,
  weeklyComparison,
  productivityByDow,
  completionTrend,
  overdueCount,
  backlogRate,
}) {
  const insights = [];

  // ── Backlog rate ──────────────────────────────────────────────────────────
  if (backlogRate >= 40) {
    insights.push({
      type: 'backlog',
      severity: 'warning',
      message: `Backlog rate is high at ${backlogRate}% — more than a third of tasks remain incomplete.`,
    });
  }

  // ── Backlog growth vs previous period ─────────────────────────────────────
  if (prevSummary.pendingTasks > 0) {
    const pendingGrowth = pct(
      summary.pendingTasks - prevSummary.pendingTasks,
      prevSummary.pendingTasks,
    );
    if (pendingGrowth >= 20) {
      insights.push({
        type: 'backlog_growth',
        severity: 'warning',
        message: `Backlog increased by ${pendingGrowth.toFixed(0)}% compared to the previous period.`,
      });
    } else if (pendingGrowth <= -20) {
      insights.push({
        type: 'backlog_shrink',
        severity: 'positive',
        message: `Great progress — backlog shrank by ${Math.abs(pendingGrowth).toFixed(0)}% compared to last period.`,
      });
    }
  }

  // ── Overdue tasks ─────────────────────────────────────────────────────────
  if (overdueCount > 0) {
    const overdueVsPrev = prevSummary.overdueTasks;
    if (overdueVsPrev > 0 && overdueCount > overdueVsPrev) {
      const growth = pct(overdueCount - overdueVsPrev, overdueVsPrev);
      insights.push({
        type: 'overdue_increasing',
        severity: 'critical',
        message: `Overdue tasks are increasing — up ${growth.toFixed(0)}% (${overdueCount} now vs ${overdueVsPrev} last period).`,
      });
    } else if (overdueCount > 5) {
      insights.push({
        type: 'overdue_high',
        severity: 'warning',
        message: `You have ${overdueCount} overdue tasks. Consider reviewing and rescheduling them.`,
      });
    }
  }

  // ── Completion rate trend ─────────────────────────────────────────────────
  if (completionTrend.length >= 4) {
    const half = Math.floor(completionTrend.length / 2);
    const recentAvg =
      completionTrend.slice(half).reduce((s, d) => s + toNum(d.completionRate), 0) /
      (completionTrend.length - half);
    const olderAvg =
      completionTrend.slice(0, half).reduce((s, d) => s + toNum(d.completionRate), 0) / half;
    const diff = recentAvg - olderAvg;
    if (diff >= 10) {
      insights.push({
        type: 'completion_rising',
        severity: 'positive',
        message: `Completion rate is trending up — recent days average ${recentAvg.toFixed(0)}% vs ${olderAvg.toFixed(0)}% earlier.`,
      });
    } else if (diff <= -10) {
      insights.push({
        type: 'completion_dropping',
        severity: 'warning',
        message: `Completion rate is dropping — recent days average ${recentAvg.toFixed(0)}% vs ${olderAvg.toFixed(0)}% earlier.`,
      });
    }
  }

  // ── Lowest productivity day ───────────────────────────────────────────────
  if (productivityByDow.length >= 3) {
    const sorted = [...productivityByDow].sort(
      (a, b) => toNum(a.completionRate) - toNum(b.completionRate),
    );
    const worst = sorted[0];
    const worstDay = DAY_NAMES[toNum(worst.dayOfWeek)];
    const worstRate = toNum(worst.completionRate);
    if (worstRate < 50 && toNum(worst.total) >= 2) {
      insights.push({
        type: 'low_productivity_day',
        severity: 'info',
        message: `Productivity tends to drop on ${worstDay}s — only ${worstRate.toFixed(0)}% completion rate. Consider lighter scheduling.`,
      });
    }
  }

  // ── Weekly comparison ─────────────────────────────────────────────────────
  if (weeklyComparison.length >= 2) {
    const last = weeklyComparison[weeklyComparison.length - 1];
    const prev = weeklyComparison[weeklyComparison.length - 2];
    if (toNum(prev.total) > 0) {
      const weekGrowth = pct(toNum(last.total) - toNum(prev.total), toNum(prev.total));
      if (weekGrowth >= 30) {
        insights.push({
          type: 'task_volume_spike',
          severity: 'info',
          message: `Task volume jumped ${weekGrowth.toFixed(0)}% this week vs last week.`,
        });
      }
    }
  }

  // ── Lead time ─────────────────────────────────────────────────────────────
  if (summary.avgLeadTimeHours !== null && summary.avgLeadTimeHours > 72) {
    const days = Math.round(summary.avgLeadTimeHours / 24);
    insights.push({
      type: 'long_lead_time',
      severity: 'info',
      message: `Average task lead time is ${days} days. Breaking tasks into smaller units may improve throughput.`,
    });
  }

  // ── Healthy state ─────────────────────────────────────────────────────────
  if (insights.length === 0 && summary.completionRate >= 70) {
    insights.push({
      type: 'healthy',
      severity: 'positive',
      message: `All metrics look healthy — ${summary.completionRate}% completion rate this period. Keep it up!`,
    });
  }

  return insights;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const dashboardService = {
  /**
   * Main overview handler — returns all analytics sections.
   *
   * @param {string} userId
   * @param {{ startDate, endDate, mode }} params
   */
  getOverview: async (userId, { startDate, endDate, mode }) => {
    // 1. Parse & validate
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw Object.assign(new Error('Invalid startDate or endDate'), { status: 400 });
    }
    if (start > end) {
      throw Object.assign(new Error('startDate must be before endDate'), { status: 400 });
    }

    // 2. Cache check
    const key = cacheKey(userId, start, end, mode);
    try {
      const cached = await redisClient.get(key);
      if (cached) return { ...JSON.parse(cached), cached: true };
    } catch (_) { }

    // 3. Previous range
    const { prevStart, prevEnd } = computePreviousRange(start, end);

    // 4. All queries in parallel
    const [
      rawSummary,
      rawPrevSummary,
      timeline,
      weeklyComparison,
      monthlyComparison,
      productivityByDow,
      completionTrend,
      heatmap,
      dailyCreation,
      dailyCompletion,
      overdueCount,
    ] = await Promise.all([
      dashboardRepository.getSummaryMetrics(userId, start, end),
      dashboardRepository.getSummaryForRange(userId, prevStart, prevEnd),
      dashboardRepository.getTimelineData(userId, start, end),
      dashboardRepository.getWeeklyComparison(userId, 8),
      dashboardRepository.getMonthlyComparison(userId, 6),
      dashboardRepository.getProductivityByDayOfWeek(userId, 60),
      dashboardRepository.getCompletionTrend(userId, 14),
      dashboardRepository.getHeatmapData(userId, 90),
      dashboardRepository.getDailyCreationCount(userId, start, end),
      dashboardRepository.getDailyCompletionCount(userId, start, end),
      dashboardRepository.getOverdueCount(userId),
    ]);

    // 5. Shape summary
    const summary = {
      totalTasks: toNum(rawSummary.totalTasks),
      completedTasks: toNum(rawSummary.completedTasks),
      pendingTasks: toNum(rawSummary.pendingTasks),
      overdueTasks: toNum(rawSummary.overdueTasks),
      completionRate: pct(toNum(rawSummary.completedTasks), toNum(rawSummary.totalTasks)),
      avgLeadTimeHours: rawSummary.avgLeadTimeHours !== null ? toNum(rawSummary.avgLeadTimeHours) : null,
      backlogRate: pct(toNum(rawSummary.pendingTasks), toNum(rawSummary.totalTasks)),
    };

    const prevSummary = {
      totalTasks: toNum(rawPrevSummary.totalTasks),
      completedTasks: toNum(rawPrevSummary.completedTasks),
      pendingTasks: toNum(rawPrevSummary.pendingTasks),
      overdueTasks: toNum(rawPrevSummary.overdueTasks),
      completionRate: pct(toNum(rawPrevSummary.completedTasks), toNum(rawPrevSummary.totalTasks)),
    };

    // 6. Comparison delta
    const comparison = {
      period: {
        current: { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] },
        previous: { startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] },
      },
      current: summary,
      previous: prevSummary,
      delta: {
        totalTasks: computeDelta(summary.totalTasks, prevSummary.totalTasks),
        completedTasks: computeDelta(summary.completedTasks, prevSummary.completedTasks),
        pendingTasks: computeDelta(summary.pendingTasks, prevSummary.pendingTasks),
        overdueTasks: computeDelta(summary.overdueTasks, prevSummary.overdueTasks),
        completionRate: computeDelta(summary.completionRate, prevSummary.completionRate),
      },
    };

    // 7. Generate insights
    const insights = generateInsights({
      summary,
      prevSummary,
      weeklyComparison,
      productivityByDow,
      completionTrend,
      overdueCount,
      backlogRate: summary.backlogRate,
    });

    // 8. Compose payload
    const payload = {
      cached: false,
      mode,
      range: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      summary,
      timeline,
      dailyCreation,
      dailyCompletion,
      weeklyComparison,
      monthlyComparison,
      productivityByDow: productivityByDow.map((r) => ({
        dayOfWeek: toNum(r.dayOfWeek),
        dayName: DAY_NAMES[toNum(r.dayOfWeek)],
        total: toNum(r.total),
        completed: toNum(r.completed),
        completionRate: toNum(r.completionRate),
      })),
      completionTrend,
      heatmap,
      comparison,
      overdueCount,
      insights,
    };

    // 9. Cache
    try {
      await redisClient.set(key, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS);
    } catch (_) { }

    return payload;
  },
};
