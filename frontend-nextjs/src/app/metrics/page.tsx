'use client';

import CoverageHeatmap from '@/components/CoverageHeatmap';

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 p-4">
      <div className="max-w-6xl mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">📈</div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Practice Metrics & Analytics
          </h1>
          <p className="text-slate-600">
            Insights into your Spanish conjugation practice patterns
          </p>
        </div>
        
        {/* Coverage Heatmap */}
        <div className="mb-8">
          <CoverageHeatmap mood="indicative" />
        </div>
        
        {/* Placeholder for future metrics */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/80">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-slate-800">Accuracy Trends</h3>
            <p className="text-slate-600 text-sm mt-2">Track your improvement over time</p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/80">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold text-slate-800">Weak Spots</h3>
            <p className="text-slate-600 text-sm mt-2">Focus areas for practice</p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/80">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="font-semibold text-slate-800">Achievements</h3>
            <p className="text-slate-600 text-sm mt-2">Milestones and streaks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
