import type {
  SkillCheckResult,
  SkillDraft,
  SkillEvalCase,
  SkillEvalResult,
  SkillResource,
} from '../types/skillOps';

const KEBAB_CASE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RISK_TERMS = [
  'curl ',
  'wget ',
  'Invoke-WebRequest',
  'Remove-Item -Recurse',
  'rm -rf',
  'npm install -g',
  'pip install',
  'chmod 777',
  'ssh ',
  'token',
  'secret',
  'credential',
];

const TOKEN_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'for',
  'from',
  'in',
  'into',
  'is',
  'of',
  'on',
  'or',
  'the',
  'this',
  'to',
  'use',
  'when',
  'with',
  'you',
  'your',
]);

function makeCheck(
  id: string,
  label: string,
  passed: boolean,
  detail?: string,
): SkillCheckResult {
  return { id, label, passed, detail };
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !TOKEN_STOPWORDS.has(item));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function findRiskTerms(skill: SkillDraft): string[] {
  const resourceText = skill.resources
    .map((item) => `${item.kind} ${item.path} ${item.purpose}`)
    .join('\n');
  const haystack = `${skill.description}\n${skill.allowedTools}\n${skill.body}\n${resourceText}`;

  return RISK_TERMS.filter((term) =>
    haystack.toLowerCase().includes(term.toLowerCase()),
  );
}

function hasSafetyLanguage(skill: SkillDraft): boolean {
  const text = `${skill.description}\n${skill.body}`.toLowerCase();
  return ['approval', 'trusted', 'review', 'sandbox', 'permission', 'verify'].some((term) =>
    text.includes(term),
  );
}

function hasWorkflowLanguage(skill: SkillDraft): boolean {
  const text = skill.body.toLowerCase();
  return (
    text.includes('workflow') ||
    text.includes('steps') ||
    text.includes('process') ||
    /^\s*\d+\./m.test(skill.body)
  );
}

function hasValidationLanguage(skill: SkillDraft): boolean {
  const text = skill.body.toLowerCase();
  return ['validate', 'verification', 'verify', 'evidence', 'check', 'test'].some((term) =>
    text.includes(term),
  );
}

function activationOverlap(skill: SkillDraft, evalCase: SkillEvalCase): string[] {
  const skillTokens = unique(tokenize(`${skill.name} ${skill.description} ${skill.body}`));
  const requestTokens = unique(tokenize(evalCase.userRequest));
  const skillTokenSet = new Set(skillTokens);

  return requestTokens.filter((token) => skillTokenSet.has(token));
}

function resourceCompleteness(resources: SkillResource[]): SkillCheckResult {
  const incomplete = resources.filter((resource) => {
    return !resource.path.trim() || !resource.purpose.trim();
  });

  return makeCheck(
    'resource-completeness',
    'Resources have paths and purpose notes',
    incomplete.length === 0,
    incomplete.length > 0
      ? `${incomplete.length} resource item needs a path or purpose`
      : undefined,
  );
}

export function createSkillMarkdown(skill: SkillDraft): string {
  const frontmatter = [
    '---',
    `name: ${skill.name}`,
    `description: ${skill.description}`,
    skill.compatibility.trim() ? `compatibility: ${skill.compatibility.trim()}` : '',
    skill.allowedTools.trim() ? `allowed-tools: ${skill.allowedTools.trim()}` : '',
    '---',
  ].filter(Boolean);

  const resourceLines =
    skill.resources.length > 0
      ? [
          '',
          '## Bundled resources',
          '',
          ...skill.resources.map(
            (resource) => `- ${resource.kind}: \`${resource.path}\` - ${resource.purpose}`,
          ),
        ]
      : [];

  return [...frontmatter, '', skill.body.trim(), ...resourceLines].join('\n');
}

export function createRunCard(skill: SkillDraft, evalCase: SkillEvalCase): string {
  const assertions = evalCase.assertions.length
    ? evalCase.assertions.map((item) => `- ${item}`).join('\n')
    : '- No assertions defined';
  const evidence = evalCase.requiredEvidence.length
    ? evalCase.requiredEvidence.map((item) => `- ${item}`).join('\n')
    : '- No evidence requirements defined';

  return [
    `Skill: ${skill.name}`,
    `Eval case: ${evalCase.name}`,
    '',
    'User request:',
    evalCase.userRequest,
    '',
    'Expected outcome:',
    evalCase.expectedOutcome || 'No expected outcome defined.',
    '',
    'Assertions:',
    assertions,
    '',
    'Required evidence:',
    evidence,
  ].join('\n');
}

export function runSkillEvalCase(
  skill: SkillDraft,
  evalCase: SkillEvalCase,
): SkillEvalResult {
  const overlap = activationOverlap(skill, evalCase);
  const riskTerms = findRiskTerms(skill);
  const checks: SkillCheckResult[] = [
    makeCheck(
      'skill-name',
      'Skill name is portable kebab-case',
      KEBAB_CASE_REGEX.test(skill.name),
      KEBAB_CASE_REGEX.test(skill.name) ? undefined : 'Use lowercase words separated by hyphens',
    ),
    makeCheck(
      'description',
      'Description is specific enough for routing',
      skill.description.trim().length >= 40 && skill.description.trim().length <= 260,
      'Aim for 40-260 characters that explain when the skill should activate',
    ),
    makeCheck(
      'workflow',
      'Instructions include an executable workflow',
      hasWorkflowLanguage(skill),
      hasWorkflowLanguage(skill) ? undefined : 'Add a workflow or numbered steps',
    ),
    makeCheck(
      'validation',
      'Instructions include validation or evidence rules',
      hasValidationLanguage(skill),
      hasValidationLanguage(skill) ? undefined : 'Add checks, evidence, or verification criteria',
    ),
    resourceCompleteness(skill.resources),
    makeCheck(
      'eval-request',
      'Eval case has a realistic user request',
      evalCase.userRequest.trim().length >= 20,
      'Use a request close to what a real user would ask',
    ),
    makeCheck(
      'eval-outcome',
      'Eval case states the expected outcome',
      evalCase.expectedOutcome.trim().length >= 20,
      'Describe what a good result should contain',
    ),
    makeCheck(
      'eval-assertions',
      'Eval case has measurable assertions',
      evalCase.assertions.filter(Boolean).length >= 2,
      'Add at least two assertions for grading',
    ),
    makeCheck(
      'activation-match',
      'Skill routing text matches the eval request',
      overlap.length >= 2,
      overlap.length > 0
        ? `Matched terms: ${overlap.slice(0, 6).join(', ')}`
        : 'No meaningful overlap between the description/body and request',
    ),
    makeCheck(
      'risk-language',
      'Risky actions are paired with review language',
      riskTerms.length === 0 || hasSafetyLanguage(skill),
      riskTerms.length > 0
        ? `Review required for: ${riskTerms.slice(0, 5).join(', ')}`
        : undefined,
    ),
  ];

  const passed = checks.filter((check) => check.passed).length;

  return {
    evalCaseId: evalCase.id,
    score: Math.round((passed / checks.length) * 100),
    checks,
    runCard: createRunCard(skill, evalCase),
  };
}

export function runAllSkillEvals(
  skill: SkillDraft,
  evalCases: SkillEvalCase[],
): SkillEvalResult[] {
  return evalCases.map((evalCase) => runSkillEvalCase(skill, evalCase));
}

export function averageScore(results: SkillEvalResult[]): number {
  if (results.length === 0) {
    return 0;
  }

  const total = results.reduce((sum, result) => sum + result.score, 0);
  return Math.round(total / results.length);
}
