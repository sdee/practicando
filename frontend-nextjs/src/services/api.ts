import { QuestionResponse } from '@/types/flashcard';

export async function fetchQuestions(count: number = 15): Promise<QuestionResponse> {
  const params = new URLSearchParams();
  
  // Add limit
  params.append('limit', count.toString());
  
  // Add arrays as multiple parameters with the same name (proper FastAPI array format)
  const pronouns = ['yo', 'tu', 'el', 'ella', 'usted', 'nosotros', 'vosotros', 'ellos', 'ustedes'];
  const tenses = ['present', 'imperfect', 'preterite', 'future', 'present_perfect', 'past_anterior', 'future_perfect', 'conditional_simple'];
  const moods = ['conditional', 'imperative', 'indicative', 'subjunctive'];
  
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
