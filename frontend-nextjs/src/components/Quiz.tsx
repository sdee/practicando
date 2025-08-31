'use client';

import { useState, useEffect, useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Question, AnswerState, FlashcardState } from '@/types/flashcard';
import { fetchQuestions, Filters } from '@/services/api';

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
}

function FilterPanel({ isOpen, onToggle, filters, onFiltersChange, onApply }: FilterPanelProps) {
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

  const panelAnimation = useSpring({
    maxHeight: isOpen ? '1000px' : '0px',
    opacity: isOpen ? 1 : 0,
    config: { tension: 300, friction: 30 }
  });

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 shadow-lg mb-6">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/50 transition-colors rounded-xl"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-slate-700">Filters</span>
          <span className="text-sm text-slate-500">
            ({filters.pronouns.length} pronouns, {filters.tenses.length} tenses, {filters.moods.length} moods)
          </span>
        </div>
        <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>
      
      <animated.div style={{ ...panelAnimation, overflow: 'hidden' }}>
        <div className="p-4 border-t border-slate-200">
          <div className="grid md:grid-cols-3 gap-6">
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
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onApply}
              disabled={filters.pronouns.length === 0 || filters.tenses.length === 0 || filters.moods.length === 0}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </animated.div>
    </div>
  );
}

interface FlashcardProps {
  question: Question;
  onAnswer: (correct: boolean, userAnswer: string) => void;
  onNext: () => void;
  state: AnswerState;
}

function Flashcard({ question, onAnswer, onNext, state }: FlashcardProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  // Animation for correct/incorrect feedback
  const bounceAnimation = useSpring({
    transform: state === 'correct' ? 'scale(1.1)' : 'scale(1)',
    config: { tension: 300, friction: 10 }
  });

  const shakeAnimation = useSpring({
    transform: state === 'incorrect' ? 'translateX(-10px)' : 'translateX(0px)',
    config: { tension: 500, friction: 10 },
    loop: state === 'incorrect' ? { reverse: true } : false,
  });

  // Reset state when question changes
  useEffect(() => {
    setUserAnswer('');
    setShowAnswer(false);
  }, [question.verb, question.pronoun, question.tense, question.mood]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    const isCorrect = userAnswer.toLowerCase().trim() === (question.answer || '').toLowerCase();
    setShowAnswer(true);
    onAnswer(isCorrect, userAnswer);
  };

  const handleNext = () => {
    setUserAnswer('');
    setShowAnswer(false);
    onNext(); // Call the parent's function to advance to next question
  };

  return (
    <animated.div 
      className={`
        w-96 h-80 mx-auto p-6 rounded-2xl shadow-lg border-2 transition-all duration-300 flex flex-col justify-between hover:shadow-xl
        ${state === 'correct' ? 'border-emerald-300 shadow-emerald-200/30' : 
          state === 'incorrect' ? 'border-rose-300 shadow-rose-200/30' : 
          'border-slate-300 shadow-slate-200/30'}
      `}
      style={{
        ...((state === 'correct' ? bounceAnimation : shakeAnimation) as any),
        background: state === 'correct' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' :
                   state === 'incorrect' ? 'linear-gradient(135deg, #fef2f2 0%, #fecdd3 100%)' :
                   'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      }}
    >
      {/* Card Header */}
      <div className="text-center">
        <div className="text-sm font-medium text-slate-500 mb-2 tracking-wide uppercase">
          Spanish Conjugation
        </div>
        <div className="text-3xl font-bold text-slate-800 mb-3">
          {question.verb}
        </div>
        <div className="flex justify-center space-x-2 text-sm">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{question.pronoun}</span>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">{question.tense}</span>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">{question.mood}</span>
        </div>
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
            <button
              type="submit"
              disabled={!userAnswer.trim()}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
            >
              Submit Answer
            </button>
          </form>
        )}

        {showAnswer && (
          <div className="text-center space-y-4">
            <div className={`text-2xl font-bold ${state === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {state === 'correct' ? 'Correct!' : 'Incorrect'}
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200">
              <div className="mb-2">
                <span className="text-slate-600 text-sm font-medium">Your answer: </span>
                <span className={`font-semibold ${state === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {userAnswer}
                </span>
              </div>
              {state === 'incorrect' && (
                <div>
                  <span className="text-slate-600 text-sm font-medium">Correct answer: </span>
                  <span className="text-emerald-600 font-semibold">
                    {question.answer || 'No answer available'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      {showAnswer && (
        <div className="pt-4">
          <button
            onClick={handleNext}
            className="w-full bg-slate-500 text-white py-3 px-4 rounded-xl hover:bg-slate-600 font-semibold text-lg transition-colors"
          >
            Next Card
          </button>
        </div>
      )}
    </animated.div>
  );
}

export default function FlashcardGame() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  
  // Default filters: yo, tu, present, indicative
  const [filters, setFilters] = useState<Filters>({
    pronouns: ['yo', 'tu'],
    tenses: ['present'],
    moods: ['indicative']
  });

  const loadQuestions = async (useFilters?: Filters) => {
    try {
      setLoading(true);
      setError(null);
      const filtersToUse = useFilters || filters;
      const response = await fetchQuestions(15, filtersToUse);
      console.log('Received questions:', response.questions); // Debug log
      setQuestions(response.questions);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleAnswer = (correct: boolean, userAnswer: string) => {
    setAnswerState(correct ? 'correct' : 'incorrect');
    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));
    // Removed auto-advance - user must click "Next Card" button
  };

  const handleNext = () => {
    setAnswerState('unanswered');
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reload questions when we run out
      loadQuestions();
    }
  };

  const handleFiltersApply = () => {
    setFilterPanelOpen(false); // Auto-collapse the panel
    loadQuestions(filters); // Load questions with new filters
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-medium text-slate-700 mb-2">
            Loading questions...
          </div>
          <div className="text-slate-500">
            Please wait
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-red-50 to-rose-50 flex items-center justify-center">
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/80 shadow-lg">
          <div className="text-xl font-bold text-slate-700 mb-4">Something went wrong</div>
          <div className="text-slate-600 mb-6">Error: {error}</div>
          <button
            onClick={() => loadQuestions()}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-medium text-slate-700">
            No questions available
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-red-50 to-rose-50 flex items-center justify-center">
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/80 shadow-lg">
          <div className="text-5xl mb-4">�</div>
          <div className="text-xl font-bold text-slate-700 mb-4">Oops! Something went wrong</div>
          <div className="text-lg text-slate-600 mb-6">Error: {error}</div>
          <button
            onClick={() => loadQuestions()}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 font-semibold transition-colors"
          >
            Try Again 🔄
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
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

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Spanish Flashcards
          </h1>
          <p className="text-lg text-slate-600 mb-6">Practice your conjugations</p>
          <div className="flex justify-center space-x-8 text-lg font-medium text-slate-700 bg-white/60 backdrop-blur-sm rounded-xl py-3 px-6 border border-white/80 shadow-sm">
            <div>
              <span>Card {currentIndex + 1} of {questions.length}</span>
            </div>
            <div>
              <span>Score: {stats.correct}/{stats.total} ({stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <FilterPanel
          isOpen={filterPanelOpen}
          onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
          filters={filters}
          onFiltersChange={setFilters}
          onApply={handleFiltersApply}
        />

        {/* Flashcard Container */}
        <div className="flex justify-center items-center" style={{ minHeight: '360px' }}>
          <Flashcard 
            key={`${currentQuestion.verb}-${currentQuestion.pronoun}-${currentIndex}`}
            question={currentQuestion} 
            onAnswer={handleAnswer}
            onNext={handleNext}
            state={answerState}
          />
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/60 rounded-full h-3 border border-slate-200 backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-slate-600 font-medium text-sm">Keep going!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
