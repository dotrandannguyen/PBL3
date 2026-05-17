/**
 * Dashboard Controller - HTTP Request Handler
 *
 * GET /dashboard/overview
 * Query params:
 *   - startDate  (required) ISO date string e.g. 2026-05-01
 *   - endDate    (required) ISO date string e.g. 2026-05-14
 *   - mode       (optional) 'week' | 'month', default 'week'
 */

import { dashboardService } from './dashboard.service.js';
import { HttpResponse } from '../../common/dtos/index.js';

export const dashboardController = {
  getOverview: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate, mode = 'week', nocache } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required query parameters.',
        });
      }

      if (!['week', 'month'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: "mode must be 'week' or 'month'.",
        });
      }

      const result = await dashboardService.getOverview(userId, {
        startDate,
        endDate,
        mode,
        nocache: nocache === 'true' || nocache === '1',
      });

      return new HttpResponse(res).success(result);
    } catch (error) {
      next(error);
    }
  },
};
