import type { PromptVersion, VariableDefinition } from '../types/promptLab';

export function createVersion(
  name: string,
  template: string,
  variables: VariableDefinition[],
): PromptVersion {
  return {
    id: `version-${Date.now()}`,
    name: name.trim() || `版本 ${new Date().toLocaleString()}`,
    template,
    variables,
    createdAt: new Date().toISOString(),
  };
}

export type VersionDiff = {
  templateChanged: boolean;
  addedVariables: string[];
  removedVariables: string[];
};

export function diffVersions(base: PromptVersion, target: PromptVersion): VersionDiff {
  const baseNames = new Set(base.variables.map((item) => item.name));
  const targetNames = new Set(target.variables.map((item) => item.name));

  const addedVariables = [...targetNames].filter((name) => !baseNames.has(name));
  const removedVariables = [...baseNames].filter((name) => !targetNames.has(name));

  return {
    templateChanged: base.template !== target.template,
    addedVariables,
    removedVariables,
  };
}
