import React from 'react';
import { MetricCardProps } from '@/types/metrics';

export default function MetricCard({ 
  title, 
  description, 
  children, 
  size,
  loading = false,
  error 
}: MetricCardProps) {
  // Grid sizing classes
  const sizeClasses = {
    sm: 'col-span-1 row-span-1',
    md: 'col-span-2 row-span-1', 
    lg: 'col-span-2 row-span-2',
    xl: 'col-span-4 row-span-2'
  };

  const heightClasses = {
    sm: 'h-48',
    md: 'h-48',
    lg: 'h-96', 
    xl: 'h-96'
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} ${heightClasses[size]} bg-white/70 backdrop-blur-sm rounded-lg shadow-lg p-6`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${sizeClasses[size]} ${heightClasses[size]} bg-red-50/70 backdrop-blur-sm rounded-lg shadow-lg p-6 border-2 border-red-200`}>
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-bold text-red-800">{title}</h3>
        </div>
        <div className="text-red-600">
          <p className="font-medium">Error loading metric</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${heightClasses[size]} bg-white/70 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 p-6`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
