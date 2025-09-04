import React, { useEffect, useState } from 'react';
import { getVerbSet, VerbSet } from '../services/api';

interface VerbSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  verbClass: string;
}

export const VerbSetModal: React.FC<VerbSetModalProps> = ({ 
  isOpen, 
  onClose, 
  verbClass 
}) => {
  const [verbSet, setVerbSet] = useState<VerbSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && verbClass) {
      fetchVerbSet();
    }
  }, [isOpen, verbClass]);

  const fetchVerbSet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getVerbSet(verbClass);
      setVerbSet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verbs');
    } finally {
      setLoading(false);
    }
  };

  const formatTitle = (verbClass: string): string => {
    const match = verbClass.match(/^top(\d+)$/);
    if (match) {
      return `Top ${match[1]} Verbs`;
    }
    // Fallback for any non-standard format
    return verbClass.charAt(0).toUpperCase() + verbClass.slice(1) + ' Verbs';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-700">
              {verbSet ? formatTitle(verbSet.verb_class) : 'Loading...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading verbs...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">⚠️ Error loading verbs</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchVerbSet}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}

          {verbSet && !loading && !error && (
            <div className="flex flex-wrap gap-2 justify-center">
              {verbSet.verbs.map((verb, index) => {
                // Create variety in colors by cycling through different gradients - 10% more subtle
                const colorVariants = [
                  'bg-gradient-to-br from-slate-50 to-blue-50 hover:from-blue-50 hover:to-blue-100 border-slate-200 text-blue-600',
                  'bg-gradient-to-br from-slate-50 to-purple-50 hover:from-purple-50 hover:to-purple-100 border-slate-200 text-purple-600',
                  'bg-gradient-to-br from-slate-50 to-emerald-50 hover:from-emerald-50 hover:to-emerald-100 border-slate-200 text-emerald-600',
                  'bg-gradient-to-br from-slate-50 to-rose-50 hover:from-rose-50 hover:to-rose-100 border-slate-200 text-rose-600',
                  'bg-gradient-to-br from-slate-50 to-indigo-50 hover:from-indigo-50 hover:to-indigo-100 border-slate-200 text-indigo-600',
                  'bg-gradient-to-br from-slate-50 to-teal-50 hover:from-teal-50 hover:to-teal-100 border-slate-200 text-teal-600'
                ];
                const colorClass = colorVariants[index % colorVariants.length];
                
                return (
                  <div
                    key={verb}
                    className={`${colorClass} border px-3 py-2 rounded-full text-center transition-colors inline-block whitespace-nowrap`}
                  >
                    <span className="font-medium text-sm">{verb}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-blue-200 flex-shrink-0">
        </div>
      </div>
    </div>
  );
};
