export type SkillResourceKind = 'script' | 'reference' | 'asset';

export type SkillResource = {
  id: string;
  kind: SkillResourceKind;
  path: string;
  purpose: string;
};

export type SkillDraft = {
  name: string;
  description: string;
  compatibility: string;
  allowedTools: string;
  body: string;
  resources: SkillResource[];
};

export type SkillEvalCase = {
  id: string;
  name: string;
  userRequest: string;
  expectedOutcome: string;
  assertions: string[];
  requiredEvidence: string[];
};

export type SkillCheckResult = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type SkillEvalResult = {
  evalCaseId: string;
  score: number;
  checks: SkillCheckResult[];
  runCard: string;
};

export type SkillVersion = {
  id: string;
  name: string;
  skill: SkillDraft;
  createdAt: string;
  averageScore: number;
  resultSummary: Array<{
    evalCaseId: string;
    score: number;
  }>;
};

export type SkillOpsState = {
  skill: SkillDraft;
  evalCases: SkillEvalCase[];
  versions: SkillVersion[];
};
