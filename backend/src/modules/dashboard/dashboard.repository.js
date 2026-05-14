import prisma from '../../config/database.js';

/**
 * Dashboard Repository - Aggregated Data Access Layer
 *
 * All queries use raw SQL aggregations (GROUP BY, DATE(), COUNT FILTER).
 * No raw task rows are ever returned — only computed metrics.
 * All queries are scoped to userId for security.
 */
export const dashboardRepository = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. SUMMARY METRICS (total, completed, pending, overdue) for a date range
  // ──────────────────────────────────────────────────────────────────────────
  getSummaryMetrics: async (userId, startDate, endDate) => {
    const now = new Date();
    const result = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int                                                              AS "totalTasks",
        COUNT(*) FILTER (WHERE status = 'DONE')::int                              AS "completedTasks",
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS'))::int         AS "pendingTasks",
        COUNT(*) FILTER (
          WHERE status IN ('PENDING', 'IN_PROGRESS')
            AND due_date IS NOT NULL
            AND due_date < ${now}
        )::int                                                                     AS "overdueTasks",
        -- Lead Time: avg hours from created_at to completed_at (DONE tasks only)
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600.0
          ) FILTER (WHERE status = 'DONE' AND completed_at IS NOT NULL)
        )::int                                                                     AS "avgLeadTimeHours"
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND (
          created_at  BETWEEN ${startDate} AND ${endDate}
          OR due_date BETWEEN ${startDate} AND ${endDate}
          OR "scheduledAt" BETWEEN ${startDate} AND ${endDate}
        )
    `;
    return result[0];
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DAILY TASK CREATION COUNT — tasks created per day
  // ──────────────────────────────────────────────────────────────────────────
  getDailyCreationCount: async (userId, startDate, endDate) => {
    const rows = await prisma.$queryRaw`
      SELECT
        DATE(created_at)::text   AS date,
        COUNT(*)::int            AS "createdCount"
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DAILY COMPLETED TASK COUNT — tasks completed per day
  // ──────────────────────────────────────────────────────────────────────────
  getDailyCompletionCount: async (userId, startDate, endDate) => {
    const rows = await prisma.$queryRaw`
      SELECT
        DATE(completed_at)::text   AS date,
        COUNT(*)::int              AS "completedCount"
      FROM tasks
      WHERE
        user_id      = ${userId}
        AND deleted_at IS NULL
        AND status   = 'DONE'
        AND completed_at IS NOT NULL
        AND completed_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(completed_at)
      ORDER BY DATE(completed_at) ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DAILY TIMELINE (created + completed + overdue per day) - merged view
  // ──────────────────────────────────────────────────────────────────────────
  getTimelineData: async (userId, startDate, endDate) => {
    const now = new Date();
    const rows = await prisma.$queryRaw`
      SELECT
        DATE(COALESCE(due_date, "scheduledAt", created_at))::text  AS date,
        COUNT(*)::int                                              AS total,
        COUNT(*) FILTER (WHERE status = 'DONE')::int              AS completed,
        COUNT(*) FILTER (WHERE status IN ('PENDING','IN_PROGRESS'))::int AS pending,
        COUNT(*) FILTER (
          WHERE status IN ('PENDING','IN_PROGRESS')
            AND due_date IS NOT NULL
            AND due_date < ${now}
        )::int                                                     AS overdue
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND (
          created_at  BETWEEN ${startDate} AND ${endDate}
          OR due_date BETWEEN ${startDate} AND ${endDate}
          OR "scheduledAt" BETWEEN ${startDate} AND ${endDate}
        )
      GROUP BY DATE(COALESCE(due_date, "scheduledAt", created_at))
      ORDER BY 1 ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. OVERDUE TASK COUNT (standalone, fast query)
  // ──────────────────────────────────────────────────────────────────────────
  getOverdueCount: async (userId) => {
    const now = new Date();
    const result = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "overdueCount"
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status IN ('PENDING', 'IN_PROGRESS')
        AND due_date IS NOT NULL
        AND due_date < ${now}
    `;
    return Number(result[0]?.overdueCount ?? 0);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. WEEKLY COMPARISON — last N weeks, one row per week
  // ──────────────────────────────────────────────────────────────────────────
  getWeeklyComparison: async (userId, weeksBack = 8) => {
    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('week', COALESCE(due_date, "scheduledAt", created_at))::text  AS "weekStart",
        COUNT(*)::int                                                              AS total,
        COUNT(*) FILTER (WHERE status = 'DONE')::int                              AS completed,
        COUNT(*) FILTER (WHERE status IN ('PENDING','IN_PROGRESS'))::int          AS pending
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND COALESCE(due_date, "scheduledAt", created_at)
              >= NOW() - (${weeksBack} || ' weeks')::interval
      GROUP BY DATE_TRUNC('week', COALESCE(due_date, "scheduledAt", created_at))
      ORDER BY 1 ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. MONTHLY COMPARISON — last N months, one row per month
  // ──────────────────────────────────────────────────────────────────────────
  getMonthlyComparison: async (userId, monthsBack = 6) => {
    const rows = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(due_date, "scheduledAt", created_at)), 'YYYY-MM')  AS month,
        COUNT(*)::int                                                                             AS total,
        COUNT(*) FILTER (WHERE status = 'DONE')::int                                             AS completed,
        COUNT(*) FILTER (WHERE status IN ('PENDING','IN_PROGRESS'))::int                         AS pending,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'DONE') * 100.0
          / NULLIF(COUNT(*), 0), 1
        )::float                                                                                  AS "completionRate"
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND COALESCE(due_date, "scheduledAt", created_at)
              >= NOW() - (${monthsBack} || ' months')::interval
      GROUP BY DATE_TRUNC('month', COALESCE(due_date, "scheduledAt", created_at))
      ORDER BY 1 ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. PRODUCTIVITY TREND — completion rate per day-of-week (0=Sun … 6=Sat)
  //    Used to detect which weekday has the lowest productivity.
  // ──────────────────────────────────────────────────────────────────────────
  getProductivityByDayOfWeek: async (userId, daysBack = 60) => {
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(DOW FROM COALESCE(due_date, "scheduledAt", created_at))::int   AS "dayOfWeek",
        COUNT(*)::int                                                           AS total,
        COUNT(*) FILTER (WHERE status = 'DONE')::int                           AS completed,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'DONE') * 100.0
          / NULLIF(COUNT(*), 0), 1
        )::float                                                                AS "completionRate"
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND COALESCE(due_date, "scheduledAt", created_at)
              >= NOW() - (${daysBack} || ' days')::interval
      GROUP BY EXTRACT(DOW FROM COALESCE(due_date, "scheduledAt", created_at))
      ORDER BY 1 ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. COMPLETION TREND — rolling 14-day completion rates (for sparkline)
  // ──────────────────────────────────────────────────────────────────────────
  getCompletionTrend: async (userId, daysBack = 14) => {
    const rows = await prisma.$queryRaw`
      SELECT
        DATE(COALESCE(due_date, "scheduledAt", created_at))::text   AS date,
        COUNT(*)::int                                                AS total,
        COUNT(*) FILTER (WHERE status = 'DONE')::int                AS completed,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'DONE') * 100.0
          / NULLIF(COUNT(*), 0), 1
        )::float                                                     AS "completionRate"
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND COALESCE(due_date, "scheduledAt", created_at)
              >= NOW() - (${daysBack} || ' days')::interval
      GROUP BY DATE(COALESCE(due_date, "scheduledAt", created_at))
      ORDER BY 1 ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10. HEATMAP DATA — created_count per calendar day for the last N days
  //     Used to build the GitHub-style activity heatmap.
  // ──────────────────────────────────────────────────────────────────────────
  getHeatmapData: async (userId, daysBack = 90) => {
    const rows = await prisma.$queryRaw`
      SELECT
        DATE(created_at)::text   AS date,
        COUNT(*)::int            AS count
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND created_at >= NOW() - (${daysBack} || ' days')::interval
      GROUP BY DATE(created_at)
      ORDER BY 1 ASC
    `;
    return rows;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 11. SUMMARY FOR ARBITRARY RANGE (used for comparison delta)
  // ──────────────────────────────────────────────────────────────────────────
  getSummaryForRange: async (userId, startDate, endDate) => {
    const now = new Date();
    const result = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int                                                              AS "totalTasks",
        COUNT(*) FILTER (WHERE status = 'DONE')::int                              AS "completedTasks",
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS'))::int         AS "pendingTasks",
        COUNT(*) FILTER (
          WHERE status IN ('PENDING', 'IN_PROGRESS')
            AND due_date IS NOT NULL
            AND due_date < ${now}
        )::int                                                                     AS "overdueTasks"
      FROM tasks
      WHERE
        user_id    = ${userId}
        AND deleted_at IS NULL
        AND status NOT IN ('INBOX', 'ARCHIVED')
        AND (
          created_at  BETWEEN ${startDate} AND ${endDate}
          OR due_date BETWEEN ${startDate} AND ${endDate}
          OR "scheduledAt" BETWEEN ${startDate} AND ${endDate}
        )
    `;
    return result[0];
  },
};
