export interface Question {
  pronoun: string;
  tense: string;
  mood: string;
  verb: string;
  answer: string;
  id?: string; // Optional, we can generate client-side
}

export interface QuestionResponse {
  questions: Question[];
}

export type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export interface FlashcardState {
  currentQuestion: Question | null;
  userGuess: string;
  answerState: AnswerState;
  questions: Question[];
  currentIndex: number;
  showResult: boolean;
}

// Constants
export const DEFAULT_NUM_QUESTIONS = 10;
export const QUESTION_COUNT_OPTIONS = [5, 10, 20];

// Filters interface
export interface Filters {
  pronouns: string[];
  tenses: string[];
  moods: string[];
  num_questions?: number;
  verb_class?: string; // New: for verb set filtering (top10, top20, etc.)
  allow_retry?: boolean; // New: enable a single retry per question
}

// Round-related types
export interface Round {
  id: number;
  started_at: string;
  ended_at?: string;
  filters: {
    pronouns: string[];
    tenses: string[];
    moods: string[];
  };
  num_questions: number;
  num_correct_answers: number;
  status: 'active' | 'completed';
}

export interface Guess {
  id: number;
  verb: string;
  pronoun: string;
  tense: string;
  mood: string;
  correct_answer: string;
  user_answer?: string;
  is_correct?: boolean;
}

export interface RoundState {
  currentRound: Round | null;
  guesses: Guess[];
  currentGuessIndex: number;
  isComplete: boolean;
  score: {
    correct: number;
    total: number;
  };
}

export type GamePhase = 'loading' | 'playing' | 'round_complete' | 'filter_warning' | 'error' | 'filter_selection';
