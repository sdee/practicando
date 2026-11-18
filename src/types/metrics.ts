export interface MetricConfig {
  id: string;
  title: string;
  description?: string;
  gridSize: 'sm' | 'md' | 'lg' | 'xl';
  priority: number; // Lower numbers appear first
  component: React.ComponentType<any>;
}

export interface MetricCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  size: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  error?: string;
}

// Metric data types for Recharts components
export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface CategoryData {
  category: string;
  value: number;
  percentage?: number;
}

export interface DistributionData {
  bin: string;
  count: number;
  range?: [number, number];
}
