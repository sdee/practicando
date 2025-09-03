import { QuestionResponse, Filters, Round, Guess, DEFAULT_NUM_QUESTIONS } from '@/types/flashcard';

export interface RoundResponse {
  round: Round;
  guesses: Guess[];
}

export interface TransitionResponse {
  completed_round: Round;
  new_round: Round;
  guesses: Guess[];
  transition_reason: string;
}

// Legacy function for backward compatibility
export async function fetchQuestions(count: number = 15, filters?: Filters): Promise<QuestionResponse> {
  const params = new URLSearchParams();
  
  // Add limit
  params.append('limit', count.toString());
  
  // Add verb_class parameter (minimum change for TubeLex integration)
  params.append('verb_class', 'top20');
  
  // Use provided filters or defaults
  const pronouns = filters?.pronouns || ['yo', 'tu', 'el', 'ella', 'usted', 'nosotros', 'vosotros', 'ellos', 'ustedes'];
  const tenses = filters?.tenses || ['present', 'imperfect', 'preterite', 'future', 'present_perfect', 'past_anterior', 'future_perfect', 'conditional_simple'];
  const moods = filters?.moods || ['conditional', 'imperative', 'indicative', 'subjunctive'];
  
  // Add arrays as multiple parameters with the same name (proper FastAPI array format)
  pronouns.forEach(p => params.append('pronoun', p));
  tenses.forEach(t => params.append('tense', t));
  moods.forEach(m => params.append('mood', m));

  // Use relative URL for Next.js proxy
  const response = await fetch(`/api/questions?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch questions: ${response.status}`);
  }

  return response.json();
}

// New rounds API functions
export async function createRound(filters: Filters): Promise<RoundResponse> {
  console.log('📡 createRound API called with filters:', filters);
  
  const requestBody = {
    filters: {
      pronouns: filters.pronouns,
      tenses: filters.tenses,
      moods: filters.moods,
    },
    num_questions: filters.num_questions || DEFAULT_NUM_QUESTIONS,
    verb_class: 'top20',  // Minimum change - use default verb class
  };

  console.log('📡 Request body being sent:', requestBody);

  const response = await fetch('/api/rounds', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create round: ${response.status}`);
  }

  const result = await response.json();
  console.log('📡 createRound API response:', result);
  return result;
}

export async function completeRound(roundId: number): Promise<RoundResponse> {
  const response = await fetch(`/api/rounds/${roundId}/complete`, {
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`Failed to complete round: ${response.status}`);
  }

  return response.json();
}

export async function transitionRound(currentRoundId: number, filters: Filters): Promise<TransitionResponse> {
  const response = await fetch(`/api/rounds/${currentRoundId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters: {
        pronouns: filters.pronouns,
        tenses: filters.tenses,
        moods: filters.moods,
      },
      num_questions: filters.num_questions || DEFAULT_NUM_QUESTIONS,
      verb_class: 'top20',  // Minimum change - use default verb class
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to transition round: ${response.status}`);
  }

  return response.json();
}

export async function getActiveRound(): Promise<RoundResponse> {
  const response = await fetch('/api/rounds/active');

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('No active round found');
    }
    throw new Error(`Failed to get active round: ${response.status}`);
  }

  return response.json();
}

export async function submitAnswer(roundId: number, guessId: number, answer: string): Promise<void> {
  // Evaluate correctness client-side for immediate feedback
  // Note: The frontend will handle this evaluation before calling this function
  
  // This function now just updates the backend - correctness should be determined by caller
  const response = await fetch(`/api/rounds/guesses/${guessId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      guess_id: guessId,
      user_answer: answer,
      is_correct: true, // This should be passed from the caller
    }),
  });

  if (!response.ok) {
    console.error(`Failed to submit answer: ${response.status}`);
    // Don't throw error - this is fire-and-forget for UX
  }
}

export async function submitGuess(guessId: number, userAnswer: string, isCorrect: boolean): Promise<void> {
  try {
    const response = await fetch(`/api/rounds/guesses/${guessId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guess_id: guessId,
        user_answer: userAnswer,
        is_correct: isCorrect,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to submit guess: ${response.status}`);
    }
  } catch (error) {
    console.error('Error submitting guess:', error);
    // Fail silently - don't block user experience
  }
}
