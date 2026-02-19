export type VariableDefinition = {
  name: string;
  description: string;
  required: boolean;
  defaultValue: string;
};

export type PromptTestCase = {
  id: string;
  name: string;
  inputs: Record<string, string>;
  requiredPhrases: string[];
  forbiddenPhrases: string[];
  minLength?: number;
  maxLength?: number;
};

export type CheckResult = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type PromptRunResult = {
  testCaseId: string;
  renderedPrompt: string;
  score: number;
  checks: CheckResult[];
};

export type PromptVersion = {
  id: string;
  name: string;
  template: string;
  variables: VariableDefinition[];
  createdAt: string;
};

export type PromptLabState = {
  template: string;
  variables: VariableDefinition[];
  testCases: PromptTestCase[];
  versions: PromptVersion[];
};
