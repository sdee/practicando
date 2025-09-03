'use client';

import React, { Fragment } from 'react';
import { useState, useEffect } from 'react';

interface CoverageBin {
  pronoun: string;
  tense: string;
  mood: string;
  question_count: number;
}

interface CoverageData {
  metadata: {
    total_questions: number;
    unique_bins: number;
    mood_filter?: string[];
  };
  bins: CoverageBin[];
}

interface CoverageHeatmapProps {
  mood?: string;
}

export default function CoverageHeatmap({ mood = 'indicative' }: CoverageHeatmapProps) {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define the order for pronouns and tenses for consistent layout
  const pronounOrder = ['yo', 'tu', 'el', 'ella', 'usted', 'nosotros', 'vosotros', 'ellos', 'ustedes'];
  const tenseOrder = ['present', 'imperfect', 'preterite', 'future', 'present_perfect', 'past_anterior', 'future_perfect', 'conditional_simple'];

  useEffect(() => {
    fetchCoverageData();
  }, [mood]);

  const fetchCoverageData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8000/api/metrics/coverage?mood=${mood}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch coverage data');
      }

      const coverageData: CoverageData = await response.json();
      setData(coverageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coverage data');
    } finally {
      setLoading(false);
    }
  };

  const getCellData = (pronoun: string, tense: string) => {
    if (!data) return null;
    return data.bins.find(bin => bin.pronoun === pronoun && bin.tense === tense);
  };

  const getMaxQuestions = () => {
    if (!data) return 0;
    return Math.max(...data.bins.map(bin => bin.question_count));
  };

  const getIntensityClass = (questionCount: number) => {
    if (questionCount === 0) return 'bg-slate-100 border-slate-200';
    
    const maxQuestions = getMaxQuestions();
    const intensity = questionCount / maxQuestions;
    
    if (intensity >= 0.8) return 'bg-green-600 border-green-700';
    if (intensity >= 0.6) return 'bg-green-500 border-green-600';
    if (intensity >= 0.4) return 'bg-green-400 border-green-500';
    if (intensity >= 0.2) return 'bg-green-300 border-green-400';
    return 'bg-green-200 border-green-300';
  };

  const formatTenseLabel = (tense: string) => {
    return tense.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPronounLabel = (pronoun: string) => {
    const labels: { [key: string]: string } = {
      'yo': 'yo',
      'tu': 'tú',
      'el': 'él',
      'ella': 'ella',
      'usted': 'usted',
      'nosotros': 'nosotros',
      'vosotros': 'vosotros',
      'ellos': 'ellos',
      'ustedes': 'ustedes'
    };
    return labels[pronoun] || pronoun;
  };

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-4"></div>
          <div className="text-slate-600">Loading coverage data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 shadow-lg p-6">
        <div className="text-center py-8">
          <div className="text-red-600 font-semibold mb-2">Error loading coverage data</div>
          <div className="text-red-500 text-sm">{error}</div>
          <button
            onClick={fetchCoverageData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 shadow-lg p-6">
      <style jsx>{`
        .writing-mode-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      `}</style>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Practice Coverage - {mood.charAt(0).toUpperCase() + mood.slice(1)} Mood
        </h2>
        <p className="text-slate-600 text-sm">
          {data.metadata.total_questions} total questions across {data.metadata.unique_bins} pronoun/tense combinations
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse border-spacing-0">
          <thead>
            <tr>
              <th className="w-18"></th> {/* Empty header for pronoun column */}
              {tenseOrder.map(tense => (
                <th key={tense} className="w-9 h-20 p-0 text-center">
                  <div className="text-xs text-slate-600 font-medium writing-mode-vertical text-orientation-mixed">
                    {formatTenseLabel(tense)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pronounOrder.map(pronoun => (
              <tr key={pronoun}>
                {/* Pronoun label */}
                <td className="w-18 text-right pr-2 py-0">
                  <span className="text-sm font-medium text-slate-700">
                    {formatPronounLabel(pronoun)}
                  </span>
                </td>
                
                {/* Cells for each tense */}
                {tenseOrder.map((tense, tenseIndex) => {
                  const cellData = getCellData(pronoun, tense);
                  const questionCount = cellData?.question_count || 0;
                  
                  return (
                    <td key={`${pronoun}-${tense}`} className="w-9 p-0 text-center relative group">
                      <div
                        className={`w-8 h-8 border border-slate-300 rounded-sm cursor-pointer transition-all hover:scale-110 hover:border-slate-400 flex items-center justify-center mx-auto ${
                          getIntensityClass(questionCount)
                        }`}
                      >
                        {/* Optional: show count in cell for high values */}
                        {questionCount > 50 && (
                          <span className="text-xs font-bold text-white">
                            {questionCount > 99 ? '99+' : questionCount}
                          </span>
                        )}
                      </div>
                      
                      {/* Tooltip - positioned above and centered */}
                      <div className="absolute invisible group-hover:visible bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 -top-10 left-1/2 transform -translate-x-1/2">
                        {formatPronounLabel(pronoun)} + {formatTenseLabel(tense)}: {questionCount} questions
                        <div className="absolute w-2 h-2 bg-slate-800 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2"></div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <span>Less</span>
          <div className="flex space-x-1">
            {[0, 0.2, 0.4, 0.6, 0.8].map((intensity, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-sm border ${
                  intensity === 0 ? 'bg-slate-100 border-slate-200' :
                  intensity >= 0.8 ? 'bg-green-600 border-green-700' :
                  intensity >= 0.6 ? 'bg-green-500 border-green-600' :
                  intensity >= 0.4 ? 'bg-green-400 border-green-500' :
                  'bg-green-300 border-green-400'
                }`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
