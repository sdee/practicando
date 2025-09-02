// Global state for round persistence across navigation
export interface AppState {
  currentRoundId: number | null;
  currentQuestionIndex: number;
  hasActiveRound: boolean;
}

let globalAppState: AppState = {
  currentRoundId: null,
  currentQuestionIndex: 0,
  hasActiveRound: false
};

export const getAppState = () => globalAppState;
export const setAppState = (newState: Partial<AppState>) => {
  globalAppState = { ...globalAppState, ...newState };
};
