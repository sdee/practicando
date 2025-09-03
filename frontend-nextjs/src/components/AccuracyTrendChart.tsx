import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DEFAULT_PALETTE, CHART_STYLES } from '@/lib/chartColors';
import { useMetric } from '@/hooks/useMetrics';
import { TimeSeriesData } from '@/types/metrics';

// Example data structure - replace with real API call
const sampleData: TimeSeriesData[] = [
  { date: '2024-01-01', value: 65, label: 'Jan 1' },
  { date: '2024-01-02', value: 72, label: 'Jan 2' },
  { date: '2024-01-03', value: 68, label: 'Jan 3' },
  { date: '2024-01-04', value: 81, label: 'Jan 4' },
  { date: '2024-01-05', value: 79, label: 'Jan 5' },
  { date: '2024-01-06', value: 87, label: 'Jan 6' },
  { date: '2024-01-07', value: 84, label: 'Jan 7' },
];

export default function AccuracyTrendChart() {
  // TODO: Replace with real API hook when endpoint exists
  // const { data, loading, error } = useMetric<TimeSeriesData[]>('/api/metrics/accuracy-trend');
  
  const data = sampleData;
  const loading = false;
  const error = null;

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-600">
        <p>Error loading accuracy data</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid {...CHART_STYLES.grid} />
          <XAxis 
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={{ stroke: '#6B7280' }}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={{ stroke: '#6B7280' }}
            label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            {...CHART_STYLES.tooltip}
            labelFormatter={(label) => `Date: ${label}`}
            formatter={(value) => [`${value}%`, 'Accuracy']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={DEFAULT_PALETTE.primary}
            strokeWidth={3}
            dot={{ fill: DEFAULT_PALETTE.primary, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: DEFAULT_PALETTE.secondary }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
