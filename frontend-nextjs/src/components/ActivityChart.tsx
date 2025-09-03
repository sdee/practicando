'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DEFAULT_PALETTE, CHART_STYLES } from '@/lib/chartColors';
import { useMetric } from '@/hooks/useMetrics';

interface ActivityData {
  metric: string;
  period: string;
  data: Array<{
    date: string;
    value: number;
    label: string;
  }>;
  total: number;
  average: number;
}

export default function ActivityChart() {
  const [metric, setMetric] = useState<'questions' | 'rounds'>('questions');
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const { data: activityData, loading, error } = useMetric<ActivityData>(
    `http://localhost:8000/api/metrics/activity?metric=${metric}&period=${period}`
  );

  const getTitle = () => {
    const metricLabel = metric === 'questions' ? 'Questions Answered' : 'Rounds Completed';
    const periodLabel = period === 'week' ? 'This Week' : 'This Month';
    return `${metricLabel} - ${periodLabel}`;
  };

  const getSubtitle = () => {
    if (!activityData) return '';
    const periodDesc = period === 'week' ? 'daily' : 'weekly';
    const metricName = metric === 'questions' ? 'questions' : 'rounds';
    return `${activityData.total} total ${metricName}, ${activityData.average} average ${periodDesc}`;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="text-slate-600">Loading activity data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-600">
        <div className="text-center">
          <p className="font-semibold">Error loading activity data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!activityData || activityData.data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="font-semibold">No activity data available</p>
          <p className="text-sm mt-1">Start practicing to see your progress!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with controls */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{getTitle()}</h2>
        <p className="text-slate-600 mb-4">{getSubtitle()}</p>
        
        {/* Control toggles */}
        <div className="flex justify-center space-x-8">
          {/* Metric toggle */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-blue-700">Metric:</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setMetric('questions')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  metric === 'questions'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Questions
              </button>
              <button
                onClick={() => setMetric('rounds')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  metric === 'rounds'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Rounds
              </button>
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-purple-700">Timespan:</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setPeriod('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  period === 'week'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  period === 'month'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={activityData.data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            barCategoryGap="20%"
          >
            <CartesianGrid {...CHART_STYLES.grid} />
            <XAxis 
              dataKey="label"
              tick={{ fontSize: 14, fill: '#475569' }}
              tickLine={{ stroke: '#64748B' }}
              axisLine={{ stroke: '#64748B' }}
            />
            <YAxis 
              tick={{ fontSize: 14, fill: '#475569' }}
              tickLine={{ stroke: '#64748B' }}
              axisLine={{ stroke: '#64748B' }}
              label={{ 
                value: metric === 'questions' ? 'Questions Answered' : 'Rounds Completed', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#475569', fontSize: '14px' }
              }}
            />
            <Tooltip 
              {...CHART_STYLES.tooltip}
              labelFormatter={(label) => `${period === 'week' ? 'Day' : 'Week'}: ${label}`}
              formatter={(value) => [
                `${value} ${metric === 'questions' ? 'questions' : 'rounds'}`,
                metric === 'questions' ? 'Questions Answered' : 'Rounds Completed'
              ]}
            />
            <Bar
              dataKey="value"
              fill="#8B5CF6"
              radius={[4, 4, 0, 0]}
              strokeWidth={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
