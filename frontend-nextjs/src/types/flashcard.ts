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
