import type { PromptLabState } from '../types/promptLab';

const STORAGE_KEY = 'prompt-lab-state-v1';

export function loadPromptLabState(defaultState: PromptLabState): PromptLabState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as PromptLabState;
    if (!parsed || typeof parsed !== 'object') {
      return defaultState;
    }

    return {
      template: parsed.template ?? defaultState.template,
      variables: parsed.variables ?? defaultState.variables,
      testCases: parsed.testCases ?? defaultState.testCases,
      versions: parsed.versions ?? defaultState.versions,
    };
  } catch {
    return defaultState;
  }
}

export function savePromptLabState(state: PromptLabState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
