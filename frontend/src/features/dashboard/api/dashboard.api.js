import apiClient from '../../../shared/api/apiClient';

/**
 * Dashboard API — GET /v1/api/dashboard/overview
 *
 * @param {{ startDate: string, endDate: string, mode: 'week'|'month' }} params
 */
export const getDashboardOverview = ({ startDate, endDate, mode = 'week' }) =>
  apiClient.get('/v1/api/dashboard/overview', {
    params: { startDate, endDate, mode },
  });
