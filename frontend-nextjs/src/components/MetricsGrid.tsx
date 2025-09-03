import React from 'react';
import { MetricConfig } from '@/types/metrics';
import MetricCard from './MetricCard';
import CoverageHeatmap from './CoverageHeatmap';

// Registry of all available metrics
const METRICS_REGISTRY: MetricConfig[] = [
  {
    id: 'coverage-heatmap',
    title: 'Practice Coverage',
    description: 'Heatmap showing your practice distribution across pronouns and tenses',
    gridSize: 'xl',
    priority: 1,
    component: CoverageHeatmap
  }
  // Future metrics will be added here
];

interface MetricsGridProps {
  enabledMetrics?: string[]; // If provided, only show these metrics
  className?: string;
}

export default function MetricsGrid({ 
  enabledMetrics,
  className = ''
}: MetricsGridProps) {
  // Filter and sort metrics
  const activeMetrics = METRICS_REGISTRY
    .filter(metric => !enabledMetrics || enabledMetrics.includes(metric.id))
    .sort((a, b) => a.priority - b.priority);

  return (
    <div className={`
      grid grid-cols-4 gap-6 auto-rows-min
      ${className}
    `}>
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
  );
}

// Export registry for easy metric management
export { METRICS_REGISTRY };
