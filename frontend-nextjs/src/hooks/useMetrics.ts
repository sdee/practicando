import { useState, useEffect } from 'react';

interface UseMetricOptions {
  refreshInterval?: number; // Auto-refresh interval in ms
  enabled?: boolean; // Whether to fetch data
}

export function useMetric<T>(
  endpoint: string,
  options: UseMetricOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { refreshInterval, enabled = true } = options;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    fetchData();

    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [endpoint, refreshInterval, enabled]);

  const refetch = () => {
    if (enabled) {
      fetchData();
    }
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}

// Specific hooks for common metrics
export function useCoverageData() {
  return useMetric<any[]>('/api/metrics/coverage');
}

// Future metric hooks will be added here
// export function useProgressData() {
//   return useMetric<TimeSeriesData[]>('/api/metrics/progress');
// }

// export function usePerformanceData() {
//   return useMetric<CategoryData[]>('/api/metrics/performance');
// }
