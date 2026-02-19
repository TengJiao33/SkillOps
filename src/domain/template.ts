import type { VariableDefinition } from '../types/promptLab';

const VARIABLE_TOKEN_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function extractVariableNames(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(VARIABLE_TOKEN_REGEX)) {
    const name = match[1].trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names];
}

export function mergeVariableDefinitions(
  extractedNames: string[],
  currentVariables: VariableDefinition[],
): VariableDefinition[] {
  const currentByName = new Map(currentVariables.map((item) => [item.name, item]));
  return extractedNames.map((name) => {
    const existing = currentByName.get(name);
    if (existing) {
      return existing;
    }
    return {
      name,
      description: '',
      required: true,
      defaultValue: '',
    };
  });
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function renderTemplate(
  template: string,
  values: Record<string, string>,
  variableDefinitions: VariableDefinition[],
): string {
  let output = template;
  for (const variable of variableDefinitions) {
    const tokenRegex = new RegExp(`\\{\\{\\s*${escapeRegExp(variable.name)}\\s*\\}\\}`, 'g');
    const value = values[variable.name] ?? variable.defaultValue;
    output = output.replace(tokenRegex, value);
  }
  return output;
}

export function findUnresolvedTokens(text: string): string[] {
  return extractVariableNames(text);
}

export function createEmptyInputs(names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, '']));
}
