'use client';

import { useState, useEffect } from 'react';
import { getVerbConjugations } from '@/services/api';

interface ConjugationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verb: string;
  highlightTense?: string;
  highlightPronoun?: string;
}

const TENSE_ORDER = [
  'present',
  'imperfect', 
  'preterite',
  'future',
  'present_perfect',
  'past_anterior',
  'future_perfect',
  'conditional_simple'
];

const PRONOUN_ORDER = [
  'yo',
  'tu', 
  'el',
  'nosotros',
  'ellos'
];

const TENSE_LABELS: Record<string, string> = {
  present: 'Present',
  imperfect: 'Imperfect',
  preterite: 'Preterite', 
  future: 'Future',
  present_perfect: 'Present Perfect',
  past_anterior: 'Past Anterior',
  future_perfect: 'Future Perfect',
  conditional_simple: 'Conditional Simple'
};

const PRONOUN_LABELS: Record<string, string> = {
  yo: 'yo',
  tu: 'tú',
  el: 'él',
  nosotros: 'nosotros',
  ellos: 'ellos'
};

export function ConjugationModal({ isOpen, onClose, verb, highlightTense, highlightPronoun }: ConjugationModalProps) {
  const [conjugations, setConjugations] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && verb) {
      setLoading(true);
      setError(null);
      
      getVerbConjugations(verb)
        .then(data => {
          setConjugations(data);
        })
        .catch(err => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, verb]);

  if (!isOpen) return null;

  const isHighlighted = (tense: string, pronoun: string) => {
    return tense === highlightTense && pronoun === highlightPronoun;
  };

  const getConjugation = (tense: string, pronoun: string) => {
    if (!conjugations) return null;
    const key = `${tense}_${pronoun}`;
    return conjugations[key] || null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {verb} - All Conjugations
            </h2>
            <p className="text-slate-600">Indicative mood only</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">Error loading conjugations</div>
              <div className="text-slate-600">{error}</div>
            </div>
          )}

          {conjugations && (
            <div className="space-y-6">
              {TENSE_ORDER.map(tense => (
                <div key={tense} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-slate-800">
                      {TENSE_LABELS[tense]}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-4">
                    {PRONOUN_ORDER.map(pronoun => {
                      const conjugation = getConjugation(tense, pronoun);
                      
                      if (!conjugation) return null;

                      const shouldHighlight = isHighlighted(tense, pronoun);
                      
                      return (
                        <div
                          key={pronoun}
                          className={`p-3 rounded-lg text-center transition-colors ${
                            shouldHighlight
                              ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-800'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div className="text-sm font-medium text-slate-600 mb-1">
                            {PRONOUN_LABELS[pronoun]}
                          </div>
                          <div className={`font-semibold ${
                            shouldHighlight ? 'text-yellow-900' : 'text-slate-800'
                          }`}>
                            {conjugation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
