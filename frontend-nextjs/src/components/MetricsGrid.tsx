import React from 'react';
import { MetricConfig } from '@/types/metrics';
import MetricCard from './MetricCard';
import CoverageHeatmap from './CoverageHeatmap';
import ActivityChart from './ActivityChart';

// Registry of all available metrics
const METRICS_REGISTRY: MetricConfig[] = [
  {
    id: 'coverage-heatmap',
    title: 'Practice Coverage',
    description: 'Heatmap showing your practice distribution across pronouns and tenses',
    gridSize: 'xl',
    priority: 2,
    component: CoverageHeatmap
  }
  // Future metrics will be added here when endpoints are ready
];

interface MetricsGridProps {
  enabledMetrics?: string[]; // If provided, only show these metrics
  className?: string;
}

export default function MetricsGrid({ 
  enabledMetrics,
  className = ''
}: MetricsGridProps) {
  // Filter and sort metrics (excluding hero chart)
  const activeMetrics = METRICS_REGISTRY
    .filter(metric => !enabledMetrics || enabledMetrics.includes(metric.id))
    .sort((a, b) => a.priority - b.priority);

  return (
    <div className={className}>
      {/* Hero Activity Chart - Full Width, Centered */}
      <div className="mb-12 flex justify-center">
        <div className="w-full max-w-5xl">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/90 p-8 h-[500px]">
            <ActivityChart />
          </div>
        </div>
      </div>
      
      {/* Regular Metrics Grid */}
      <div className="grid grid-cols-4 gap-6 auto-rows-min">
        {activeMetrics.map((metric) => {
          const MetricComponent = metric.component;
          
          // Special handling for components that have their own card styling
          if (metric.id === 'coverage-heatmap') {
            return (
              <div key={metric.id} className="col-span-4">
                <MetricComponent mood="indicative" />
              </div>
            );
          }
          
          return (
            <MetricCard
              key={metric.id}
              title={metric.title}
              description={metric.description}
              size={metric.gridSize}
            >
              <MetricComponent />
            </MetricCard>
          );
        })}
      </div>
    </div>
  );
}

// Export registry for easy metric management
export { METRICS_REGISTRY };
