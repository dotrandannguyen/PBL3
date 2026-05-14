/**
 * Dashboard Router
 *
 * Base path: /v1/api/dashboard
 * All routes require authentication (authGuard).
 */

import { Router } from 'express';
import { authGuard } from '../../common/middleware/index.js';
import { dashboardController } from './dashboard.controller.js';

const dashboardRouter = Router();

// Protect all dashboard routes
dashboardRouter.use(authGuard);

/**
 * GET /dashboard/overview
 *
 * Query params:
 *   - startDate  {string} required — ISO date e.g. "2026-05-01"
 *   - endDate    {string} required — ISO date e.g. "2026-05-14"
 *   - mode       {string} optional — "week" | "month" (default: "week")
 *
 * Response:
 *   {
 *     mode, range,
 *     summary: { totalTasks, completedTasks, pendingTasks, overdueTasks, completionRate },
 *     timeline: [{ date, total, completed, pending, overdue }],
 *     comparison: { period, current, previous, delta }
 *   }
 */
dashboardRouter.get('/overview', dashboardController.getOverview);

export default dashboardRouter;
