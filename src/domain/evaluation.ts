import type {
  CheckResult,
  PromptRunResult,
  PromptTestCase,
  VariableDefinition,
} from '../types/promptLab';
import { findUnresolvedTokens, renderTemplate } from './template';

function checkRequiredInputs(
  testCase: PromptTestCase,
  variables: VariableDefinition[],
): CheckResult {
  const missing = variables
    .filter((item) => item.required)
    .filter((item) => {
      const value = testCase.inputs[item.name] ?? item.defaultValue;
      return !value.trim();
    })
    .map((item) => item.name);

  return {
    id: 'required-inputs',
    label: '必填变量已填写',
    passed: missing.length === 0,
    detail: missing.length > 0 ? `缺失：${missing.join('、')}` : undefined,
  };
}

function checkUnresolvedTokens(renderedPrompt: string): CheckResult {
  const unresolved = findUnresolvedTokens(renderedPrompt);
  return {
    id: 'unresolved-tokens',
    label: '不存在未替换变量',
    passed: unresolved.length === 0,
    detail: unresolved.length > 0 ? `未替换：${unresolved.join('、')}` : undefined,
  };
}

function checkLength(testCase: PromptTestCase, renderedPrompt: string): CheckResult {
  const length = renderedPrompt.length;
  if (typeof testCase.minLength !== 'number' && typeof testCase.maxLength !== 'number') {
    return {
      id: 'length',
      label: '长度检查已跳过',
      passed: true,
    };
  }

  const minLength = testCase.minLength ?? 0;
  const maxLength = testCase.maxLength ?? Number.POSITIVE_INFINITY;
  const passed = length >= minLength && length <= maxLength;

  return {
    id: 'length',
    label: '长度范围符合要求',
    passed,
    detail: passed ? undefined : `当前长度 ${length}，期望 ${minLength}-${maxLength}`,
  };
}

function checkRequiredPhrases(testCase: PromptTestCase, renderedPrompt: string): CheckResult {
  const missing = testCase.requiredPhrases
    .map((item) => item.trim())
    .filter((item) => item)
    .filter((item) => !renderedPrompt.includes(item));

  return {
    id: 'required-phrases',
    label: '必须短语已命中',
    passed: missing.length === 0,
    detail: missing.length > 0 ? `缺失：${missing.join('、')}` : undefined,
  };
}

function checkForbiddenPhrases(testCase: PromptTestCase, renderedPrompt: string): CheckResult {
  const hits = testCase.forbiddenPhrases
    .map((item) => item.trim())
    .filter((item) => item)
    .filter((item) => renderedPrompt.includes(item));

  return {
    id: 'forbidden-phrases',
    label: '禁止短语未出现',
    passed: hits.length === 0,
    detail: hits.length > 0 ? `命中：${hits.join('、')}` : undefined,
  };
}

function calculateScore(checks: CheckResult[]): number {
  if (checks.length === 0) {
    return 100;
  }
  const passed = checks.filter((item) => item.passed).length;
  return Math.round((passed / checks.length) * 100);
}

export function runPromptTestCase(
  template: string,
  variables: VariableDefinition[],
  testCase: PromptTestCase,
): PromptRunResult {
  const renderedPrompt = renderTemplate(template, testCase.inputs, variables);
  const checks = [
    checkRequiredInputs(testCase, variables),
    checkUnresolvedTokens(renderedPrompt),
    checkLength(testCase, renderedPrompt),
    checkRequiredPhrases(testCase, renderedPrompt),
    checkForbiddenPhrases(testCase, renderedPrompt),
  ];

  return {
    testCaseId: testCase.id,
    renderedPrompt,
    checks,
    score: calculateScore(checks),
  };
}

export function runAllPromptTests(
  template: string,
  variables: VariableDefinition[],
  testCases: PromptTestCase[],
): PromptRunResult[] {
  return testCases.map((testCase) => runPromptTestCase(template, variables, testCase));
}

export function averageScore(results: PromptRunResult[]): number {
  if (results.length === 0) {
    return 0;
  }
  const total = results.reduce((sum, item) => sum + item.score, 0);
  return Math.round(total / results.length);
}
