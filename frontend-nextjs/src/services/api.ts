import { QuestionResponse } from '@/types/flashcard';

export interface Filters {
  pronouns: string[];
  tenses: string[];
  moods: string[];
}

export async function fetchQuestions(count: number = 15, filters?: Filters): Promise<QuestionResponse> {
  const params = new URLSearchParams();
  
  // Add limit
  params.append('limit', count.toString());
  
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
