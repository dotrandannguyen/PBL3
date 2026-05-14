import { useState, useEffect, useCallback } from 'react';
import { getDashboardOverview } from '../api/dashboard.api';

/**
 * Hook: useDashboardOverview
 *
 * Fetches dashboard analytics data for the given date range & mode.
 * Re-fetches when params change.
 */
export function useDashboardOverview({ startDate, endDate, mode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(() => {
    if (!startDate || !endDate) return;
    let alive = true;
    setLoading(true);
    setError(null);
    getDashboardOverview({ startDate, endDate, mode })
      .then((res) => {
        if (!alive) return;
        setData(res.data?.data ?? null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load dashboard');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [startDate, endDate, mode]);

  useEffect(() => {
    const cleanup = fetch();
    return cleanup;
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
