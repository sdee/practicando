'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Question, AnswerState, Round, Guess, GamePhase, RoundState, Filters, DEFAULT_NUM_QUESTIONS, QUESTION_COUNT_OPTIONS } from '@/types/flashcard';
import { createRound, transitionRound, completeRound, getActiveRound, submitGuess, submitSkip } from '@/services/api';
import { setAppState } from '@/lib/appState';
import { VerbSetModal } from './VerbSetModal';

interface PronounOption {
  value: string;
  label: string;
  includes: string[]; // For combined options like él/ella
}

interface FilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onApply: () => void;
  hasActiveRound: boolean;
}

interface FilterWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function FilterWarningModal({ isOpen, onConfirm, onCancel }: FilterWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md mx-auto shadow-xl border">
        <div className="text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Start New Round?</h3>
          <p className="text-slate-600 mb-6">
            Changing filters will complete your current round and start a new one. 
            Your progress will be saved.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-200 text-slate-700 py-3 px-4 rounded-lg hover:bg-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-orange-400 text-white py-3 px-4 rounded-lg hover:bg-orange-500 font-medium transition-colors"
            >
              Start New Round
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ isOpen, onToggle, filters, onFiltersChange, onApply, hasActiveRound }: FilterPanelProps) {
  const pronounOptions: PronounOption[] = [
    { value: 'yo', label: 'yo', includes: ['yo'] },
    { value: 'tu', label: 'tú', includes: ['tu'] },
    { value: 'el_ella', label: 'él/ella', includes: ['el', 'ella'] },
    { value: 'usted', label: 'usted', includes: ['usted'] },
    { value: 'nosotros', label: 'nosotros', includes: ['nosotros'] },
    { value: 'vosotros', label: 'vosotros', includes: ['vosotros'] },
    { value: 'ellos_ellas', label: 'ellos/ellas', includes: ['ellos', 'ustedes'] },
  ];

  const tenseOptions = [
    { value: 'present', label: 'Present' },
    { value: 'imperfect', label: 'Imperfect' },
    { value: 'preterite', label: 'Preterite' },
    { value: 'future', label: 'Future' },
    { value: 'present_perfect', label: 'Present Perfect' },
    { value: 'past_anterior', label: 'Past Anterior' },
    { value: 'future_perfect', label: 'Future Perfect' },
    { value: 'conditional_simple', label: 'Conditional Simple' },
  ];

  const moodOptions = [
    { value: 'conditional', label: 'Conditional' },
    { value: 'imperative', label: 'Imperative' },
    { value: 'indicative', label: 'Indicative' },
    { value: 'subjunctive', label: 'Subjunctive' },
  ];

  const verbSetOptions = [
    { value: 'top10', label: 'Top 10 verbs' },
    { value: 'top20', label: 'Top 20 verbs' },
    { value: 'top50', label: 'Top 50 verbs' },
    { value: 'top100', label: 'Top 100 verbs' },
    { value: 'top200', label: 'Top 200 verbs' },
    { value: 'top500', label: 'Top 500 verbs' },
  ];

  // Helper function to format verb class for display
  const formatVerbClass = (verbClass: string): string => {
    const match = verbClass.match(/^top(\d+)$/);
    if (match) {
      return `top ${match[1]}`;
    }
    return verbClass;
  };

  // Modal state
  const [verbModalOpen, setVerbModalOpen] = useState(false);
  const [selectedVerbClass, setSelectedVerbClass] = useState<string>('');

  // Verb previews (8 random representative verbs for each set)
  const verbSetPreviews: Record<string, string[]> = {
    top10: ['ser', 'tener', 'hacer', 'estar', 'decir', 'ir', 'ver', 'dar'],
    top20: ['poder', 'pasar', 'llegar', 'poner', 'venir', 'salir', 'saber', 'quedar'],
    top50: ['encontrar', 'seguir', 'creer', 'llevar', 'tratar', 'vivir', 'conocer', 'sentir'],
    top100: ['contar', 'esperar', 'buscar', 'existir', 'entrar', 'trabajar', 'escribir', 'perder'],
    top200: ['producir', 'callar', 'explicar', 'tocar', 'reconocer', 'estudiar', 'alcanzar', 'nacer'],
    top500: ['merecer', 'acompañar', 'aceptar', 'recordar', 'resultar', 'bajar', 'mudar', 'prestar'],
  };

  const openVerbModal = (verbClass: string) => {
    setSelectedVerbClass(verbClass);
    setVerbModalOpen(true);
  };

  // Convert current filters to checkbox states
  const isPronounChecked = (option: PronounOption) => {
    return option.includes.every(pronoun => filters.pronouns.includes(pronoun));
  };

  const handlePronounChange = (option: PronounOption, checked: boolean) => {
    let newPronouns = [...filters.pronouns];
    
    if (checked) {
      // Add all pronouns from this option
      option.includes.forEach(pronoun => {
        if (!newPronouns.includes(pronoun)) {
          newPronouns.push(pronoun);
        }
      });
    } else {
      // Remove all pronouns from this option
      newPronouns = newPronouns.filter(pronoun => !option.includes.includes(pronoun));
    }
    
    onFiltersChange({ ...filters, pronouns: newPronouns });
  };

  const handleTenseChange = (tense: string, checked: boolean) => {
    const newTenses = checked 
      ? [...filters.tenses, tense]
      : filters.tenses.filter(t => t !== tense);
    
    onFiltersChange({ ...filters, tenses: newTenses });
  };

  const handleMoodChange = (mood: string, checked: boolean) => {
    const newMoods = checked 
      ? [...filters.moods, mood]
      : filters.moods.filter(m => m !== mood);
    
    onFiltersChange({ ...filters, moods: newMoods });
  };

  const handleVerbSetChange = (verbSet: string) => {
    onFiltersChange({ ...filters, verb_class: verbSet });
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 shadow-lg mb-4">
      <button
        onClick={onToggle}
        className="w-full py-2 px-4 text-left flex items-center justify-between hover:bg-white/50 transition-colors rounded-xl"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-slate-700">Filters</span>
          <span className="text-sm text-slate-500">
            ({filters.pronouns.length} pronouns, {filters.tenses.length} tenses, {filters.moods.length} moods, {formatVerbClass(filters.verb_class || 'top20')})
          </span>
        </div>
        <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>
      
      <div style={{ maxHeight: isOpen ? '1000px' : '0px', opacity: isOpen ? 1 : 0, overflow: isOpen ? 'visible' : 'hidden' }}>
        <div className="py-3 px-4 border-t border-slate-200">
          {hasActiveRound && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ You have an active round. Changing filters will start a new round.
              </p>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pronouns */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Pronouns</h3>
              <div className="space-y-2">
                {pronounOptions.map(option => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPronounChecked(option)}
                      onChange={(e) => handlePronounChange(option, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tenses */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Tenses</h3>
              <div className="space-y-2">
                {tenseOptions.map(option => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.tenses.includes(option.value)}
                      onChange={(e) => handleTenseChange(option.value, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Moods */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Moods</h3>
              <div className="space-y-2">
                {moodOptions.map(option => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.moods.includes(option.value)}
                      onChange={(e) => handleMoodChange(option.value, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Verb Sets */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-1">Verb Sets</h3>
              <p className="text-xs text-slate-500 mb-3 italic">Click book to see verbs</p>
              <div className="space-y-2">
                {verbSetOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="verbSet"
                      value={option.value}
                      checked={(filters.verb_class || 'top20') === option.value}
                      onChange={() => handleVerbSetChange(option.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />

                    {/* Book icon with hover tooltip for preview */}
                    <div className="group relative flex items-center">
                      <button
                        onClick={() => openVerbModal(option.value)}
                        className="w-5 h-5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded p-0.5 transition-all duration-200 cursor-pointer"
                        title="Click to view all verbs in this set"
                      >
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          className="w-full h-full"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </button>
                      <div className="absolute left-0 bottom-full mb-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="whitespace-nowrap">
                          {verbSetPreviews[option.value].join(', ')}{option.value !== 'top10' && '...'}
                        </div>
                        <div className="text-center text-gray-300 text-xs mt-1 italic">
                          Click for more details
                        </div>
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-3 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>

                    <label htmlFor={`verbset-${option.value}`} className="text-sm text-slate-600 cursor-pointer">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Number of Questions */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Number of Questions</h4>
            <div className="grid grid-cols-3 gap-3">
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    console.log('🔢 Question count button clicked:', count);
                    console.log('Current filters before change:', filters);
                    const newFilters = { ...filters, num_questions: count };
                    console.log('New filters after change:', newFilters);
                    onFiltersChange(newFilters);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (filters.num_questions || DEFAULT_NUM_QUESTIONS) === count
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Allow Retry */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Answer Behavior</h4>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filters.allow_retry}
                onChange={(e) => onFiltersChange({ ...filters, allow_retry: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">Allow one retry on incorrect answer</span>
            </label>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onApply}
              disabled={filters.pronouns.length === 0 || filters.tenses.length === 0 || filters.moods.length === 0}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {hasActiveRound ? 'Start New Round' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Verb Set Modal */}
      <VerbSetModal
        isOpen={verbModalOpen}
        onClose={() => setVerbModalOpen(false)}
        verbClass={selectedVerbClass}
      />
    </div>
  );
}

interface FlashcardProps {
  guess: Guess;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (correct: boolean, userAnswer: string) => void;
  onNext: () => void;
  state: AnswerState;
  allowRetry: boolean;
  onSkip: () => void;
}

function Flashcard({ guess, questionNumber, totalQuestions, onAnswer, onNext, state, allowRetry, onSkip }: FlashcardProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [hasRetried, setHasRetried] = useState(false);
  const [previousGuess, setPreviousGuess] = useState<string | null>(null);

  // Reset state when question changes
  useEffect(() => {
    setUserAnswer(guess.user_answer || '');
    setShowAnswer(guess.user_answer !== undefined && guess.user_answer !== null);
    setAnimationClass(''); // Clear any animation when question changes
    setHasRetried(false);
    setPreviousGuess(null);
  }, [guess.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    const isCorrect = userAnswer.toLowerCase().trim() === guess.correct_answer.toLowerCase();
    
    // If incorrect and retry is allowed and not yet used, allow one retry without revealing
    if (!isCorrect && allowRetry && !hasRetried) {
      setPreviousGuess(userAnswer);
      setUserAnswer('');
      setHasRetried(true);
      setAnimationClass('animate-enhanced-shake');
      setTimeout(() => setAnimationClass(''), 1200);
      return; // Do not reveal or submit yet
    }

    // Finalize (either correct, or incorrect with no retry left)
    setShowAnswer(true);
    if (isCorrect) {
      setAnimationClass('animate-triple-bounce');
    } else {
      setAnimationClass('animate-enhanced-shake');
    }
    setTimeout(() => setAnimationClass(''), 1200);

    onAnswer(isCorrect, userAnswer);
  };

  const handleNext = useCallback(() => {
    // Add a subtle cross-fade effect before moving to next question
    setAnimationClass('animate-fade-out-dissolve');
    
    setTimeout(() => {
      onNext();
    }, 300); // Quicker timing for fade-out animation
  }, [onNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      // Skip with Escape (avoids conflicts with OS/browser shortcuts)
      if (!showAnswer) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onSkip();
          return;
        }
        // Do not consume other keys before answer is shown
        return;
      }
      // Navigation after showing answer
      switch (e.key.toLowerCase()) {
        case 'n':
        case 'arrowright':
          e.preventDefault();
          handleNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAnswer, handleNext]);

  return (
    <div 
      className={`
        w-[572px] h-[458px] mx-auto p-6 pb-8 rounded-2xl shadow-lg border-2 transition-all duration-300 flex flex-col justify-between hover:shadow-xl
        ${state === 'correct' ? 'border-emerald-300 shadow-emerald-200/30' : 
          state === 'incorrect' ? 'border-rose-300 shadow-rose-200/30' : 
          'border-slate-300 shadow-slate-200/30'}
        ${animationClass}
      `}
      style={{
        background: state === 'correct' ? 'linear-gradient(135deg, #f9e2e2 0%, #f7c6c6 100%)' :
                   state === 'incorrect' ? 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' :
                   'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      }}
    >
      {/* Card Header */}
      <div className="text-center">
        <div className="text-sm font-medium text-slate-500 mb-2 tracking-wide uppercase">
          Question {questionNumber} of {totalQuestions}
        </div>
        <div className="text-3xl font-bold text-slate-800 mb-4">
          {guess.verb}
        </div>
        <div className="flex justify-center space-x-3 mb-3">
          <span className="px-4 py-1.5 bg-pink-500 text-white rounded-full font-medium text-sm">{guess.pronoun}</span>
          <span className="px-4 py-1.5 bg-yellow-500 text-white rounded-full font-medium text-sm">{guess.tense}</span>
        </div>
        <div className="flex justify-center mb-4">
          <span className="px-4 py-1.5 bg-indigo-900 text-white rounded-full font-medium text-sm">{guess.mood}</span>
        </div> 
        {allowRetry && previousGuess && !showAnswer && hasRetried && (
          <div className="mt-2 text-sm">
            <span className="text-slate-600">Previous guess: </span>
            <span className="font-semibold text-slate-800">{previousGuess}</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col justify-center">
        {!showAnswer && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter conjugation..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-lg text-center font-medium bg-white"
                autoFocus
              />
            </div>
            {/* Previous guess moved to header under chips */}
            <button
              type="submit"
              disabled={!userAnswer.trim()}
              className="w-full bg-orange-400 text-white py-3 px-4 rounded-xl hover:bg-orange-500 disabled:bg-orange-200 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
            >
              {hasRetried ? 'Submit Final Answer' : 'Submit Answer'}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="w-full bg-slate-300 text-slate-800 py-4 px-4 rounded-xl hover:bg-slate-400 font-medium text-base transition-colors"
              aria-keyshortcuts="Esc"
            >
              Skip (Esc)
            </button>
            <div className="h-4"></div> {/* Spacer div for bottom padding */}
            {allowRetry && (
              <div className="text-center text-xs mt-1">
                {hasRetried ? (
                  <span className="text-rose-600 font-medium">Incorrect. You have 1 retry left.</span>
                ) : (
                  <span className="text-slate-500">One retry allowed on incorrect answer</span>
                )}
              </div>
            )}
          </form>
        )}

        {showAnswer && (
          <div className="text-center space-y-3">
            <div className={`text-xl font-bold ${state === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {state === 'correct' ? 'Correct!' : 'Incorrect'}
            </div>
            
            <div className="space-y-2">
              <div className="w-full px-4 py-3 border-2 border-transparent rounded-xl text-center font-medium bg-white text-lg">
                <span className="text-slate-600 text-base">Your answer: </span>
                <span className={`font-semibold ${state === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {userAnswer}
                </span>
              </div>
              {state === 'incorrect' && (
                <div className="w-full px-4 py-3 border-2 border-transparent rounded-xl text-center font-medium bg-white text-lg">
                  <span className="text-slate-600 text-base">Correct answer: </span>
                  <span className="text-emerald-600 font-semibold">
                    {guess.correct_answer}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      {showAnswer && (
        <div className="pt-2">
          <button
            onClick={handleNext}
            className="w-full bg-slate-500 text-white py-3 px-4 rounded-xl hover:bg-slate-600 font-semibold text-lg transition-colors mb-2"
          >
            {questionNumber < totalQuestions ? 'Next Card' : 'Finish Round'}
          </button>
          <div className="text-center text-xs text-slate-400">
            Press 'n' or → to continue
          </div>
        </div>
      )}
    </div>
  );
}

interface RoundCompleteProps {
  round: Round;
  score: { correct: number; total: number };
  onStartNewRound: (filters?: Filters) => void;
  onChangeSettings: () => void;
}

function RoundComplete({ round, score, onStartNewRound, onChangeSettings }: RoundCompleteProps) {
  const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  
  // Get performance emoji and message
  const getPerformanceEmoji = (percentage: number) => {
    if (percentage >= 90) return "🏆";
    if (percentage >= 80) return "🎉";
    if (percentage >= 70) return "👍";
    if (percentage >= 60) return "😊";
    return "💪";
  };
  
  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return "Outstanding!";
    if (percentage >= 80) return "Great job!";
    if (percentage >= 70) return "Well done!";
    if (percentage >= 60) return "Good effort!";
    return "Keep practicing!";
  };

  // Get last used filters for quick restart option
  const getLastUsedFilters = (): Filters => {
    const filters: Filters = {
      pronouns: round.filters?.pronouns || ['yo', 'tu'],
      tenses: round.filters?.tenses || ['present'],
      moods: round.filters?.moods || ['indicative'],
      num_questions: round.num_questions || DEFAULT_NUM_QUESTIONS
    };
    return filters;
  };

  const formatFilters = (filters: Filters) => {
    const pronounStr = filters.pronouns.join(', ');
    const tenseStr = filters.tenses.join(', ');
    const moodStr = filters.moods.join(', ');
    const questionCount = filters.num_questions || DEFAULT_NUM_QUESTIONS;
    return `${pronounStr} • ${tenseStr} • ${moodStr} • ${questionCount} questions`;
  };

  // Keyboard shortcuts for round complete screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ': // Spacebar - start new round with same settings
          e.preventDefault();
          onStartNewRound(getLastUsedFilters());
          break;
        case 'c': // C - change settings
          e.preventDefault();
          onChangeSettings();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onStartNewRound, onChangeSettings, getLastUsedFilters]);

  return (
    <div className="w-[500px] bg-gradient-to-br from-white/30 via-purple-50/40 to-pink-50/30 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 overflow-hidden transition-all duration-500 ease-out transform hover:scale-[1.02]">
      {/* Header with emoji and title */}
      <div className="text-center pt-8 pb-4 px-8">
        <div className="text-5xl mb-4 animate-emoji-bounce">
          {getPerformanceEmoji(percentage)}
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">
          Round Complete!
        </h2>
        <div className="text-lg text-slate-700">
          {getPerformanceMessage(percentage)}
        </div>
      </div>

      {/* Score display - main focus */}
      <div className="text-center px-8 pb-6">
        <div className="text-6xl font-bold text-slate-800 mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {percentage}%
        </div>
        <div className="text-xl text-slate-700 mb-6">
          {score.correct} out of {score.total} correct
        </div>
      </div>

      {/* Settings used section - improved layout */}
      <div className="px-8 pb-6">
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center">
          <div className="text-sm font-bold text-slate-700 mb-2">Settings:</div>
          <div className="text-base text-slate-800">
            {formatFilters(getLastUsedFilters())}
          </div>
        </div>
      </div>

      {/* Action buttons - better spacing and styling */}
      <div className="px-8 pb-8 space-y-3">
        {/* Quick restart with same settings */}
        <button
          onClick={() => onStartNewRound(getLastUsedFilters())}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
        >
          <div className="text-lg">Play again</div>
          <div className="text-sm text-purple-200 mt-1">Same settings • Press Space</div>
        </button>

        {/* Change settings */}
        <button
          onClick={onChangeSettings}
          className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
        >
          <div className="text-lg">Change it up</div>
          <div className="text-sm text-gray-200 mt-1">Tweak filters • Press 'c'</div>
        </button>
      </div>
    </div>
  );
}

export default function FlashcardGame() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('loading');
  const [roundState, setRoundState] = useState<RoundState>({
    currentRound: null,
    guesses: [],
    currentGuessIndex: 0,
    isComplete: false,
    score: { correct: 0, total: 0 }
  });
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [showFilterWarning, setShowFilterWarning] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Filters | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Default filters: yo, tu, present, indicative with default question count
  const [filters, setFilters] = useState<Filters>({
    pronouns: ['yo', 'tu'],
    tenses: ['present'],
    moods: ['indicative'],
    num_questions: DEFAULT_NUM_QUESTIONS,
    allow_retry: false
  });

  // Initialize app - check for active round or create new one
  useEffect(() => {
    initializeApp();
  }, []);

  // Update app state when round state changes for navigation persistence
  useEffect(() => {
    setAppState({
      currentRoundId: roundState.currentRound?.id || null,
      currentQuestionIndex: roundState.currentGuessIndex,
      hasActiveRound: !!(roundState.currentRound && !roundState.isComplete)
    });
  }, [roundState]);

  const initializeApp = async () => {
    try {
      setGamePhase('loading');
      setError(null);

      // Try to get existing active round first
      try {
        const activeRoundData = await getActiveRound();
        setRoundState({
          currentRound: activeRoundData.round,
          guesses: activeRoundData.guesses,
          currentGuessIndex: findCurrentQuestionIndex(activeRoundData.guesses),
          isComplete: false,
          score: calculateScore(activeRoundData.guesses)
        });
        setGamePhase('playing');
        return;
      } catch (err) {
        // No active round found, create new one
      }

      // Validate filters before creating round
      const defaultFilters: Filters = {
        pronouns: ['yo', 'tu'],
        tenses: ['present'],
        moods: ['indicative'],
        num_questions: DEFAULT_NUM_QUESTIONS
      };

      if (!filters.pronouns?.length || !filters.tenses?.length || !filters.moods?.length) {
        console.warn('Invalid filters detected, using defaults:', filters);
        setFilters(defaultFilters);
      }

      // Create new round with validated filters
      const filtersToUse = (filters.pronouns?.length && filters.tenses?.length && filters.moods?.length) 
        ? { ...filters, num_questions: filters.num_questions || DEFAULT_NUM_QUESTIONS }
        : defaultFilters;

      const roundData = await createRound(filtersToUse);
      setRoundState({
        currentRound: roundData.round,
        guesses: roundData.guesses,
        currentGuessIndex: 0,
        isComplete: false,
        score: { correct: 0, total: 0 }
      });
      setGamePhase('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize app');
      setGamePhase('error');
    }
  };

  const findCurrentQuestionIndex = (guesses: Guess[]): number => {
    const firstUnanswered = guesses.findIndex(g => g.user_answer === null || g.user_answer === undefined);
    return firstUnanswered === -1 ? guesses.length - 1 : firstUnanswered;
  };

  const calculateScore = (guesses: Guess[]): { correct: number; total: number } => {
    const answered = guesses.filter(g => g.user_answer !== null && g.user_answer !== undefined);
    const correct = answered.filter(g => g.is_correct === true).length;
    return { correct, total: answered.length };
  };

  const handleAnswer = (correct: boolean, userAnswer: string) => {
    setAnswerState(correct ? 'correct' : 'incorrect');
    
    // Update the current guess with the answer
    setRoundState(prev => {
      const updatedGuesses = [...prev.guesses];
      const currentGuess = updatedGuesses[prev.currentGuessIndex];
      
      updatedGuesses[prev.currentGuessIndex] = {
        ...currentGuess,
        user_answer: userAnswer,
        is_correct: correct
      };
      
      // Submit guess to backend asynchronously (fire-and-forget)
      if (currentGuess.id) {
        submitGuess(currentGuess.id, userAnswer, correct).catch(error => {
          console.error('Failed to submit guess to backend:', error);
          // Don't show error to user - this is background sync
        });
      }
      
      return {
        ...prev,
        guesses: updatedGuesses,
        score: calculateScore(updatedGuesses)
      };
    });
  };

  const handleNext = async () => {
    setAnswerState('unanswered');
    
    setRoundState(prev => {
      const nextIndex = prev.currentGuessIndex + 1;
      
      if (nextIndex >= prev.guesses.length) {
        // Round is complete - add smooth transition delay
        setTimeout(() => {
          setGamePhase('round_complete');
        }, 300);
        
        // Complete the round on the backend
        if (prev.currentRound) {
          completeRound(prev.currentRound.id).catch(console.error);
        }
        
        return {
          ...prev,
          currentGuessIndex: prev.guesses.length - 1,
          isComplete: true
        };
      }
      
      return {
        ...prev,
        currentGuessIndex: nextIndex
      };
    });
  };

  const handleFiltersApply = async () => {
    console.log('🔧 handleFiltersApply called');
    console.log('Current filters state:', filters);
    console.log('Round state:', { isComplete: roundState.isComplete, hasCurrentRound: !!roundState.currentRound });
    
    if (roundState.currentRound && !roundState.isComplete) {
      // Show warning for active round
      console.log('Active round detected, showing warning');
      setPendingFilters(filters);
      setShowFilterWarning(true);
      return;
    }
    
    // No active round or round is complete, just create new round
    console.log('No active round, starting new round with filters:', filters);
    await startNewRound(filters);
  };

  const handleFilterWarningConfirm = async () => {
    setShowFilterWarning(false);
    if (pendingFilters && roundState.currentRound) {
      try {
        const transitionData = await transitionRound(roundState.currentRound.id, pendingFilters);
        
        // Brief moment to show completed round score (optional)
        setRoundState({
          currentRound: transitionData.new_round,
          guesses: transitionData.guesses,
          currentGuessIndex: 0,
          isComplete: false,
          score: { correct: 0, total: 0 }
        });
        setGamePhase('playing');
        setFilterPanelOpen(false);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to transition round');
        setGamePhase('error');
      }
    }
    setPendingFilters(null);
  };

  const handleFilterWarningCancel = () => {
    setShowFilterWarning(false);
    setPendingFilters(null);
  };

  const startNewRound = async (filtersToUse: Filters = filters) => {
    try {
      console.log('🚀 startNewRound called with filters:', filtersToUse);
      
      // Validate filters before proceeding
      if (!filtersToUse.pronouns?.length || !filtersToUse.tenses?.length || !filtersToUse.moods?.length) {
        console.error('Invalid filters provided to startNewRound:', filtersToUse);
        setError('Invalid filters selected. Please check your selection.');
        setGamePhase('error');
        return;
      }

      // Ensure num_questions is set
      const completeFilters = {
        ...filtersToUse,
        num_questions: filtersToUse.num_questions || DEFAULT_NUM_QUESTIONS
      };

      console.log('💫 Complete filters being sent to createRound:', completeFilters);

      setGamePhase('loading');
      setError(null);
      
      const roundData = await createRound(completeFilters);
      
      setRoundState({
        currentRound: roundData.round,
        guesses: roundData.guesses,
        currentGuessIndex: 0,
        isComplete: false,
        score: { correct: 0, total: 0 }
      });
      setGamePhase('playing');
      setFilterPanelOpen(false);
      
    } catch (err) {
      console.error('Error starting new round:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start new round';
      setError(errorMessage);
      setGamePhase('error');
    }
  };

  const handleStartNewRound = async (providedFilters?: Filters) => {
    if (providedFilters) {
      // Direct start with provided filters
      setGamePhase('loading');
      await startNewRound(providedFilters);
    } else {
      // Open filter panel for user selection
      handleChangeSettings();
    }
    // Reset answer state
    setAnswerState('unanswered');
  };

  const handleChangeSettings = () => {
    setGamePhase('filter_selection');
    setFilterPanelOpen(true);
  };

  if (gamePhase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-medium text-slate-700 mb-2">
            {roundState.currentRound ? 'Loading round...' : 'Starting new round...'}
          </div>
          <div className="text-slate-500">
            Please wait
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-red-50 to-rose-50 flex items-center justify-center">
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/80 shadow-lg">
          <div className="text-5xl mb-4">⚠️</div>
          <div className="text-xl font-bold text-slate-700 mb-4">Something went wrong</div>
          <div className="text-slate-600 mb-6">Error: {error}</div>
          <button
            onClick={initializeApp}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (gamePhase === 'filter_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Choose Your Practice Settings
          </h2>
          <p className="text-slate-600 mb-6">
            Select the verb forms you want to practice
          </p>
          
          {filterPanelOpen && (
            <FilterPanel
              isOpen={true}
              filters={filters}
              onFiltersChange={setFilters}
              onApply={handleFiltersApply}
              onToggle={() => setFilterPanelOpen(false)}
              hasActiveRound={false}
            />
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === 'round_complete' && roundState.currentRound) {
    return (
      <div className="h-screen bg-gradient-to-br from-pink-300 via-orange-300 to-indigo-400 overflow-hidden flex items-center justify-center transition-all duration-700 ease-in-out">
        <div className="animate-fade-in-up">
          <RoundComplete
            round={roundState.currentRound}
            score={roundState.score}
            onStartNewRound={handleStartNewRound}
            onChangeSettings={handleChangeSettings}
          />
        </div>
      </div>
    );
  }

  if (!roundState.currentRound || roundState.guesses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤔</div>
          <div className="text-2xl font-bold text-slate-700">
            No questions available
          </div>
        </div>
      </div>
    );
  }

  const currentGuess = roundState.guesses[roundState.currentGuessIndex];

  return (
    <div className="h-full bg-gradient-to-br from-pink-300 via-orange-300 to-indigo-400 overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10 h-full flex flex-col py-6 px-4">
        {/* Header */}
        <div className="text-center mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">
            Spanish Conjugations in a Flash!
          </h1>
          <p className="text-base text-indigo-700">Practico. Practicas. Practicamos</p>
        </div>

        {/* Filter Panel and Question/Score grouped together */}
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Filter Panel */}
          <div className="flex-shrink-0">
            <FilterPanel
              isOpen={filterPanelOpen}
              onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
              filters={filters}
              onFiltersChange={setFilters}
              onApply={handleFiltersApply}
              hasActiveRound={!roundState.isComplete}
            />
          </div>

          {/* Question Number and Score */}
          <div className="text-center flex-shrink-0">
            <div className="inline-flex space-x-6 text-lg font-medium text-yellow-700 bg-white/60 backdrop-blur-sm rounded-xl py-2 px-4 border border-white/80 shadow-sm">
              <div>
                <span>Question {roundState.currentGuessIndex + 1} of {roundState.guesses.length}</span>
              </div>
              <div>
                <span>Score: {roundState.score.correct}/{roundState.score.total} ({roundState.score.total > 0 ? Math.round((roundState.score.correct / roundState.score.total) * 100) : 0}%)</span>
              </div>
            </div>
          </div>

          {/* Flashcard Container */}
          <div className="flex justify-center items-start pt-6">
            <Flashcard 
              key={currentGuess.id}
              guess={currentGuess}
              questionNumber={roundState.currentGuessIndex + 1}
              totalQuestions={roundState.guesses.length}
              onAnswer={handleAnswer}
              onNext={handleNext}
              state={answerState}
              allowRetry={!!filters.allow_retry}
              onSkip={() => {
                // Mark current guess as skipped without recording an answer and move on
                setAnswerState('unanswered');
                setRoundState(prev => {
                  const isLast = prev.currentGuessIndex >= prev.guesses.length - 1;
                  const current = prev.guesses[prev.currentGuessIndex];
                  if (current?.id) {
                    submitSkip(current.id).catch(() => {});
                  }
                  if (isLast) {
                    // Finish the round on skip of final question
                    setTimeout(() => {
                      setGamePhase('round_complete');
                    }, 300);
                    if (prev.currentRound) {
                      completeRound(prev.currentRound.id).catch(console.error);
                    }
                    return { ...prev, isComplete: true };
                  }
                  return { ...prev, currentGuessIndex: prev.currentGuessIndex + 1 };
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter Warning Modal */}
      <FilterWarningModal
        isOpen={showFilterWarning}
        onConfirm={handleFilterWarningConfirm}
        onCancel={handleFilterWarningCancel}
      />
    </div>
  );
}
