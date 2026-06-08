import type { SkillOpsState } from '../types/skillOps';

const STORAGE_KEY = 'skillops-studio-state-v1';

export function loadSkillOpsState(defaultState: SkillOpsState): SkillOpsState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SkillOpsState>;
    if (!parsed || typeof parsed !== 'object') {
      return defaultState;
    }

    return {
      skill: parsed.skill ?? defaultState.skill,
      evalCases: parsed.evalCases ?? defaultState.evalCases,
      versions: parsed.versions ?? defaultState.versions,
    };
  } catch {
    return defaultState;
  }
}

export function saveSkillOpsState(state: SkillOpsState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
