'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

interface HistoryRound {
  id: number;
  started_at: string;
  ended_at: string | null;
  num_questions: number;
  num_correct_answers: number;
  pronouns: string[];
  tenses: string[];
  moods: string[];
  questions?: HistoryQuestion[];
}

interface HistoryQuestion {
  id: number;
  verb: string;
  pronoun: string;
  tense: string;
  mood: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  created_at: string;
}

interface HistoryResponse {
  rounds: HistoryRound[];
}

interface HistoryProps {
  onBack?: () => void;
}

export default function History({ onBack }: HistoryProps) {
  const [rounds, setRounds] = useState<HistoryRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const ROUNDS_PER_PAGE = 10;

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const fetchHistory = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/rounds/history?limit=${ROUNDS_PER_PAGE}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data: HistoryResponse = await response.json();
      
      if (page === 1) {
        setRounds(data.rounds);
      } else {
        setRounds(prev => [...prev, ...data.rounds]);
      }
      
      setHasMore(data.rounds.length === ROUNDS_PER_PAGE);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchHistory(currentPage + 1);
    }
  };

  const toggleExpanded = async (roundId: number) => {
    const newExpanded = new Set(expandedRounds);
    
    if (expandedRounds.has(roundId)) {
      // Collapse
      newExpanded.delete(roundId);
      setExpandedRounds(newExpanded);
    } else {
      // Expand - fetch questions if not already loaded
      const round = rounds.find(r => r.id === roundId);
      if (round && !round.questions) {
        try {
          const response = await fetch(
            `http://localhost:8000/api/rounds/history?include_questions=true&limit=50`
          );
          
          if (response.ok) {
            const data: HistoryResponse = await response.json();
            const roundWithQuestions = data.rounds.find(r => r.id === roundId);
            
            if (roundWithQuestions) {
              setRounds(prev => prev.map(r => 
                r.id === roundId ? { ...r, questions: roundWithQuestions.questions } : r
              ));
            }
          }
        } catch (error) {
          console.error('Failed to fetch questions:', error);
        }
      }
      
      newExpanded.add(roundId);
      setExpandedRounds(newExpanded);
    }
  };

  const formatFilters = (round: HistoryRound) => {
    const parts = [];
    if (round.pronouns.length > 0) parts.push(round.pronouns.join(', '));
    if (round.tenses.length > 0) parts.push(round.tenses.join(', '));
    if (round.moods.length > 0) parts.push(round.moods.join(', '));
    return parts.join(' • ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const formatDayHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    } else {
      return format(date, 'EEEE, MMMM d, yyyy');
    }
  };

  const groupRoundsByDay = (rounds: HistoryRound[]) => {
    const groups: { [key: string]: HistoryRound[] } = {};
    
    rounds.forEach(round => {
      const dayKey = format(new Date(round.started_at), 'yyyy-MM-dd');
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(round);
    });
    
    return groups;
  };

  const getScorePercentage = (round: HistoryRound) => {
    if (round.num_questions === 0) return 0;
    return Math.round((round.num_correct_answers / round.num_questions) * 100);
  };

  if (loading && rounds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-slate-600">Loading history...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-200 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 px-4 py-2 bg-white/70 rounded-lg hover:bg-white/80 transition-colors"
            >
              ← Back to Practice
            </button>
          )}
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-700 font-semibold">Error loading history</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-200 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white/70 rounded-lg hover:bg-white/80 transition-colors"
            >
              ← Back to Practice
            </button>
          )}
          
          <h1 className="text-3xl font-bold text-slate-800">Practice History</h1>
          
          <div className="text-slate-600">
            {rounds.length} round{rounds.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Rounds List */}
        {rounds.length === 0 ? (
          <div className="bg-white/70 rounded-xl p-8 text-center">
            <div className="text-slate-600">No practice history yet.</div>
            <div className="text-slate-500 text-sm mt-2">Complete some rounds to see them here!</div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupRoundsByDay(rounds)).map(([dayKey, dayRounds]) => (
              <div key={dayKey} className="space-y-4">
                {/* Day Header */}
                <div className="text-center">
                  <div className="inline-block px-4 py-2 bg-white/50 rounded-full text-slate-600 text-sm font-medium">
                    {formatDayHeader(dayRounds[0].started_at)}
                    <span className="text-slate-400 ml-2">({dayRounds.length})</span>
                  </div>
                </div>
                
                {/* Rounds for this day */}
                <div className="space-y-4">
                  {dayRounds.map((round) => (
                    <div key={round.id} className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 shadow-lg overflow-hidden">
                      {/* Round Header */}
                      <button
                        onClick={() => toggleExpanded(round.id)}
                        className="w-full p-4 text-left hover:bg-white/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {/* Time */}
                            <div className="text-base font-semibold text-slate-800 mb-1">
                              {formatDate(round.started_at)}
                            </div>
                            
                            {/* Filters */}
                            <div className="text-slate-600 text-sm mb-1">
                              {formatFilters(round)}
                            </div>
                            
                            {/* Score */}
                            <div className="flex items-center gap-3">
                              <div className={`text-base font-bold ${
                                getScorePercentage(round) >= 80 ? 'text-green-600' :
                                getScorePercentage(round) >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {getScorePercentage(round)}%
                              </div>
                              <div className="text-slate-600 text-sm">
                                {round.num_correct_answers} of {round.num_questions} correct
                              </div>
                              {!round.ended_at && (
                                <div className="text-orange-600 text-sm font-medium">
                                  Incomplete
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Expand Icon */}
                          <div className={`text-slate-400 transition-transform ${
                            expandedRounds.has(round.id) ? 'rotate-180' : ''
                          }`}>
                            ▼
                          </div>
                        </div>
                      </button>

                      {/* Expanded Questions */}
                      {expandedRounds.has(round.id) && (
                        <div className="border-t border-white/50 bg-white/30 p-6">
                          {round.questions ? (
                            <div className="space-y-3">
                              <div className="text-slate-700 font-medium mb-4">Questions:</div>
                              {round.questions.map((question, index) => (
                                <div key={question.id} className="flex items-center justify-between py-2 px-4 bg-white/50 rounded-lg">
                                  <div className="flex items-center gap-4">
                                    <div className="text-slate-500 text-sm w-6">
                                      {index + 1}.
                                    </div>
                                    <div className="font-medium">
                                      {question.verb} ({question.pronoun})
                                    </div>
                                    <div className="text-slate-600 text-sm">
                                      {question.tense} • {question.mood}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="text-sm">
                                      {question.skipped ? (
                                        <span className="text-slate-500 italic">Skipped</span>
                                      ) : (
                                        <>
                                          <span className="text-slate-600">Your answer: </span>
                                          <span className={`font-medium ${
                                            question.is_correct ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {question.user_answer || '(no answer)'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    
                                    {!question.skipped && !question.is_correct && (
                                      <div className="text-sm">
                                        <span className="text-slate-600">Correct: </span>
                                        <span className="font-medium text-green-600">
                                          {question.correct_answer}
                                        </span>
                                      </div>
                                    )}
                                    
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                                      question.skipped ? 'bg-amber-500' : (question.is_correct ? 'bg-green-500' : 'bg-red-500')
                                    }`} title={question.skipped ? 'Skipped' : (question.is_correct ? 'Correct' : 'Incorrect')}>
                                      {question.skipped ? '−' : (question.is_correct ? '✓' : '✗')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-slate-600 text-center py-4">
                              Loading questions...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-6">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}

            {!hasMore && rounds.length > 0 && (
              <div className="text-center text-slate-500 text-sm py-6">
                No more rounds to show
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
