import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Container,
  Grid,
  Group,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import {
  IconClipboard,
  IconCopy,
  IconDeviceFloppy,
  IconFlask2,
  IconGitCompare,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

import {
  averageScore,
  createSkillMarkdown,
  runAllSkillEvals,
} from './domain/skillEvaluation';
import { createSkillVersion, diffSkillVersions } from './domain/skillVersioning';
import { loadSkillOpsState, saveSkillOpsState } from './storage/skillOpsStorage';
import type {
  SkillDraft,
  SkillEvalCase,
  SkillEvalResult,
  SkillOpsState,
  SkillResource,
  SkillResourceKind,
} from './types/skillOps';
import './App.css';

const DEFAULT_SKILL: SkillDraft = {
  name: 'repository-release-review',
  description:
    'Use this skill when reviewing a repository change for release readiness, PR handoff quality, and regression evidence.',
  compatibility: 'codex, claude-code, agent-skills',
  allowedTools: 'shell, apply_patch, git',
  body: `# Repository Release Review

## Workflow
1. Inspect the repository status, changed files, and recent commits.
2. Identify runtime, API, dependency, documentation, and test-surface changes.
3. Run the smallest verification stack that gives meaningful confidence.
4. Compare the result against the release checklist and note any unresolved risk.

## Validation
- Include concrete evidence from commands, files, or diffs.
- Do not mark the work ready if required checks fail.
- Call out skipped checks with a reason and residual risk.

## Output
Return a concise release-readiness summary with blockers, verification evidence, and next actions.`,
  resources: [
    {
      id: 'resource-1',
      kind: 'reference',
      path: 'references/release-checklist.md',
      purpose: 'Release criteria and handoff expectations.',
    },
    {
      id: 'resource-2',
      kind: 'script',
      path: 'scripts/collect-change-summary.ts',
      purpose: 'Optional helper for summarizing changed files and commits.',
    },
  ],
};

const DEFAULT_EVAL_CASES: SkillEvalCase[] = [
  {
    id: 'eval-1',
    name: 'Release candidate handoff',
    userRequest:
      'Review the current repository changes and tell me whether this release candidate is ready to ship.',
    expectedOutcome:
      'A release-readiness summary with blockers, verification evidence, skipped checks, and concrete next actions.',
    assertions: [
      'The output separates blockers from non-blocking risks.',
      'The output cites verification evidence or explains why checks were skipped.',
      'The output does not claim release readiness when required checks fail.',
    ],
    requiredEvidence: ['git status or diff summary', 'test/build command results'],
  },
  {
    id: 'eval-2',
    name: 'PR summary preparation',
    userRequest:
      'Prepare a pull request handoff for the current branch, including what changed and how it was verified.',
    expectedOutcome:
      'A concise PR title and description with changed areas, verification, and follow-up risks.',
    assertions: [
      'The output includes a clear PR title.',
      'The output lists changed areas without inventing files.',
      'The output includes verification evidence.',
    ],
    requiredEvidence: ['changed file list', 'recent commits or diff stats'],
  },
];

function createDefaultState(): SkillOpsState {
  return {
    skill: DEFAULT_SKILL,
    evalCases: DEFAULT_EVAL_CASES,
    versions: [],
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join('\n');
}

function scoreColor(score: number): string {
  if (score >= 85) return 'dark';
  if (score >= 65) return 'yellow';
  return 'red';
}

function resourceLabel(kind: SkillResourceKind): string {
  if (kind === 'script') return 'Script';
  if (kind === 'asset') return 'Asset';
  return 'Reference';
}

function App() {
  const [skill, setSkill] = useState<SkillDraft>(DEFAULT_SKILL);
  const [evalCases, setEvalCases] = useState<SkillEvalCase[]>(DEFAULT_EVAL_CASES);
  const [versions, setVersions] = useState<SkillOpsState['versions']>([]);
  const [runResults, setRunResults] = useState<SkillEvalResult[]>([]);
  const [selectedEvalId, setSelectedEvalId] = useState(DEFAULT_EVAL_CASES[0].id);
  const [versionName, setVersionName] = useState('');
  const [baseVersionId, setBaseVersionId] = useState<string | null>(null);
  const [targetVersionId, setTargetVersionId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadSkillOpsState(createDefaultState());
    setSkill(loaded.skill);
    setEvalCases(loaded.evalCases);
    setVersions(loaded.versions);
    setSelectedEvalId(loaded.evalCases[0]?.id ?? '');
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveSkillOpsState({ skill, evalCases, versions });
  }, [isHydrated, skill, evalCases, versions]);

  useEffect(() => {
    if (versions.length === 0) {
      setBaseVersionId(null);
      setTargetVersionId(null);
      return;
    }

    if (!baseVersionId) setBaseVersionId(versions[0].id);
    if (!targetVersionId && versions.length > 1) setTargetVersionId(versions[1].id);
  }, [versions, baseVersionId, targetVersionId]);

  const skillMarkdown = useMemo(() => createSkillMarkdown(skill), [skill]);
  const overallScore = useMemo(() => averageScore(runResults), [runResults]);
  const selectedEval = useMemo(
    () => evalCases.find((item) => item.id === selectedEvalId),
    [evalCases, selectedEvalId],
  );
  const selectedResult = useMemo(
    () => runResults.find((item) => item.evalCaseId === selectedEvalId),
    [runResults, selectedEvalId],
  );
  const versionOptions = useMemo(
    () =>
      versions.map((version) => ({
        value: version.id,
        label: `${version.name} (${version.averageScore}%)`,
      })),
    [versions],
  );
  const versionDiff = useMemo(() => {
    const base = versions.find((version) => version.id === baseVersionId);
    const target = versions.find((version) => version.id === targetVersionId);

    if (!base || !target || base.id === target.id) {
      return null;
    }

    return diffSkillVersions(base, target);
  }, [baseVersionId, targetVersionId, versions]);

  const updateSkill = (patch: Partial<SkillDraft>) => {
    setSkill((current) => ({ ...current, ...patch }));
  };

  const updateResource = (resourceId: string, patch: Partial<SkillResource>) => {
    setSkill((current) => ({
      ...current,
      resources: current.resources.map((resource) =>
        resource.id === resourceId ? { ...resource, ...patch } : resource,
      ),
    }));
  };

  const addResource = () => {
    setSkill((current) => ({
      ...current,
      resources: [
        ...current.resources,
        {
          id: createId('resource'),
          kind: 'reference',
          path: '',
          purpose: '',
        },
      ],
    }));
  };

  const deleteResource = (resourceId: string) => {
    setSkill((current) => ({
      ...current,
      resources: current.resources.filter((resource) => resource.id !== resourceId),
    }));
  };

  const updateEvalCase = (evalCaseId: string, patch: Partial<SkillEvalCase>) => {
    setEvalCases((current) =>
      current.map((evalCase) =>
        evalCase.id === evalCaseId ? { ...evalCase, ...patch } : evalCase,
      ),
    );
  };

  const addEvalCase = () => {
    const nextEvalCase: SkillEvalCase = {
      id: createId('eval'),
      name: `Eval case ${evalCases.length + 1}`,
      userRequest: '',
      expectedOutcome: '',
      assertions: [],
      requiredEvidence: [],
    };

    setEvalCases((current) => [...current, nextEvalCase]);
    setSelectedEvalId(nextEvalCase.id);
  };

  const deleteEvalCase = (evalCaseId: string) => {
    setEvalCases((current) => current.filter((evalCase) => evalCase.id !== evalCaseId));
    setRunResults((current) => current.filter((result) => result.evalCaseId !== evalCaseId));

    if (selectedEvalId === evalCaseId) {
      const fallback = evalCases.find((evalCase) => evalCase.id !== evalCaseId);
      setSelectedEvalId(fallback?.id ?? '');
    }
  };

  const runEvaluations = () => {
    const results = runAllSkillEvals(skill, evalCases);
    setRunResults(results);
    setSelectedEvalId(results[0]?.evalCaseId ?? '');
  };

  const saveVersion = () => {
    const snapshotResults = runResults.length > 0 ? runResults : runAllSkillEvals(skill, evalCases);
    const nextVersion = createSkillVersion(versionName, skill, snapshotResults);
    setVersions((current) => [nextVersion, ...current]);
    setVersionName('');
  };

  return (
    <AppShell header={{ height: 76 }} padding={0}>
      <AppShell.Header className="studio-header">
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%" wrap="wrap" gap="sm">
            <Group gap="sm">
              <Title order={3} className="studio-title">
                SkillOps Studio
              </Title>
              <Badge variant="light" color="gray">
                Agent Skill lifecycle
              </Badge>
              <Badge variant="light" color="orange">
                Evals {evalCases.length}
              </Badge>
              <Badge variant="filled" color={runResults.length ? scoreColor(overallScore) : 'gray'}>
                Score {runResults.length ? `${overallScore}%` : 'Not run'}
              </Badge>
            </Group>

            <Group className="toolbar">
              <Button
                variant="default"
                leftSection={<IconClipboard size={16} />}
                onClick={() => void navigator.clipboard.writeText(skillMarkdown)}
              >
                Copy SKILL.md
              </Button>
              <Button
                variant="default"
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={saveVersion}
              >
                Snapshot
              </Button>
              <Button
                color="dark"
                leftSection={<IconFlask2 size={16} />}
                onClick={runEvaluations}
              >
                Run Evals
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main className="studio-main">
        <Container size="xl" py="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 7 }}>
              <Stack gap="md">
                <section className="studio-panel">
                  <Group justify="space-between" align="flex-start" mb="sm">
                    <div>
                      <Title order={4}>Skill Manifest</Title>
                      <Text size="sm" c="dimmed">
                        Standard Agent Skill draft
                      </Text>
                    </div>
                    <Badge color="orange" variant="light">
                      {skill.resources.length} resources
                    </Badge>
                  </Group>

                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Name"
                        value={skill.name}
                        onChange={(event) => updateSkill({ name: event.currentTarget.value })}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Compatibility"
                        value={skill.compatibility}
                        onChange={(event) =>
                          updateSkill({ compatibility: event.currentTarget.value })
                        }
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <Textarea
                        label="Description"
                        value={skill.description}
                        minRows={2}
                        autosize
                        onChange={(event) =>
                          updateSkill({ description: event.currentTarget.value })
                        }
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="Allowed tools"
                        value={skill.allowedTools}
                        onChange={(event) =>
                          updateSkill({ allowedTools: event.currentTarget.value })
                        }
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <Textarea
                        label="Instructions"
                        className="skill-editor"
                        value={skill.body}
                        minRows={16}
                        autosize={false}
                        onChange={(event) => updateSkill({ body: event.currentTarget.value })}
                      />
                    </Grid.Col>
                  </Grid>
                </section>

                <section className="studio-panel">
                  <Group justify="space-between" mb="sm">
                    <Title order={4}>Generated SKILL.md</Title>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconCopy size={14} />}
                      onClick={() => void navigator.clipboard.writeText(skillMarkdown)}
                    >
                      Copy
                    </Button>
                  </Group>
                  <Textarea value={skillMarkdown} minRows={12} autosize={false} readOnly />
                </section>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 5 }}>
              <Stack gap="md">
                <section className="studio-panel">
                  <Group justify="space-between" mb="sm">
                    <Title order={4}>Eval Cases</Title>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={14} />}
                      onClick={addEvalCase}
                    >
                      Add
                    </Button>
                  </Group>

                  <div className="eval-list">
                    {evalCases.map((evalCase) => {
                      const result = runResults.find((item) => item.evalCaseId === evalCase.id);
                      const isSelected = selectedEvalId === evalCase.id;

                      return (
                        <button
                          className={`eval-item${isSelected ? ' eval-item-selected' : ''}`}
                          key={evalCase.id}
                          type="button"
                          onClick={() => setSelectedEvalId(evalCase.id)}
                        >
                          <span>{evalCase.name}</span>
                          <Badge size="sm" color={result ? scoreColor(result.score) : 'gray'}>
                            {result ? `${result.score}%` : 'Draft'}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>

                  {selectedEval ? (
                    <Stack gap="sm" mt="md">
                      <Group justify="space-between" align="flex-end">
                        <TextInput
                          label="Case name"
                          value={selectedEval.name}
                          onChange={(event) =>
                            updateEvalCase(selectedEval.id, { name: event.currentTarget.value })
                          }
                          className="grow-field"
                        />
                        <ActionIcon
                          aria-label="Delete eval case"
                          color="red"
                          variant="light"
                          onClick={() => deleteEvalCase(selectedEval.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                      <Textarea
                        label="User request"
                        value={selectedEval.userRequest}
                        minRows={3}
                        autosize
                        onChange={(event) =>
                          updateEvalCase(selectedEval.id, {
                            userRequest: event.currentTarget.value,
                          })
                        }
                      />
                      <Textarea
                        label="Expected outcome"
                        value={selectedEval.expectedOutcome}
                        minRows={2}
                        autosize
                        onChange={(event) =>
                          updateEvalCase(selectedEval.id, {
                            expectedOutcome: event.currentTarget.value,
                          })
                        }
                      />
                      <Textarea
                        label="Assertions"
                        value={joinLines(selectedEval.assertions)}
                        minRows={3}
                        autosize
                        onChange={(event) =>
                          updateEvalCase(selectedEval.id, {
                            assertions: splitLines(event.currentTarget.value),
                          })
                        }
                      />
                      <Textarea
                        label="Required evidence"
                        value={joinLines(selectedEval.requiredEvidence)}
                        minRows={2}
                        autosize
                        onChange={(event) =>
                          updateEvalCase(selectedEval.id, {
                            requiredEvidence: splitLines(event.currentTarget.value),
                          })
                        }
                      />
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed" mt="md">
                      Add an eval case to begin.
                    </Text>
                  )}
                </section>

                <section className="studio-panel">
                  <Title order={4} mb="sm">
                    Eval Results
                  </Title>
                  {selectedResult ? (
                    <Tabs defaultValue="checks" keepMounted={false}>
                      <Tabs.List>
                        <Tabs.Tab value="checks">Checks</Tabs.Tab>
                        <Tabs.Tab value="run-card">Run Card</Tabs.Tab>
                      </Tabs.List>

                      <Tabs.Panel value="checks" pt="sm">
                        <ScrollArea h={260}>
                          <Stack gap="xs">
                            {selectedResult.checks.map((check) => (
                              <div className="check-row" key={check.id}>
                                <Badge
                                  size="sm"
                                  color={check.passed ? 'dark' : 'red'}
                                  variant="light"
                                >
                                  {check.passed ? 'Pass' : 'Fix'}
                                </Badge>
                                <div>
                                  <Text size="sm" fw={600}>
                                    {check.label}
                                  </Text>
                                  {check.detail ? (
                                    <Text size="xs" c="dimmed">
                                      {check.detail}
                                    </Text>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </Stack>
                        </ScrollArea>
                      </Tabs.Panel>

                      <Tabs.Panel value="run-card" pt="sm">
                        <Textarea value={selectedResult.runCard} minRows={11} readOnly />
                      </Tabs.Panel>
                    </Tabs>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Run evals to see readiness checks.
                    </Text>
                  )}
                </section>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 7 }}>
              <section className="studio-panel">
                <Group justify="space-between" mb="sm">
                  <Title order={4}>Resources</Title>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={14} />}
                    onClick={addResource}
                  >
                    Add
                  </Button>
                </Group>

                <div className="resource-list">
                  <div className="resource-heading">
                    <Text size="xs" fw={800}>
                      Kind
                    </Text>
                    <Text size="xs" fw={800}>
                      Path
                    </Text>
                    <Text size="xs" fw={800}>
                      Purpose
                    </Text>
                    <span />
                  </div>
                  {skill.resources.map((resource) => (
                    <div className="resource-row" key={resource.id}>
                      <Select
                        className="resource-kind"
                        data={[
                          { value: 'reference', label: resourceLabel('reference') },
                          { value: 'script', label: resourceLabel('script') },
                          { value: 'asset', label: resourceLabel('asset') },
                        ]}
                        value={resource.kind}
                        onChange={(value) =>
                          updateResource(resource.id, {
                            kind: (value ?? 'reference') as SkillResourceKind,
                          })
                        }
                      />
                      <TextInput
                        className="resource-path"
                        value={resource.path}
                        onChange={(event) =>
                          updateResource(resource.id, { path: event.currentTarget.value })
                        }
                      />
                      <TextInput
                        className="resource-purpose"
                        value={resource.purpose}
                        onChange={(event) =>
                          updateResource(resource.id, { purpose: event.currentTarget.value })
                        }
                      />
                      <ActionIcon
                        className="resource-action"
                        aria-label="Delete resource"
                        color="red"
                        variant="subtle"
                        onClick={() => deleteResource(resource.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </div>
                  ))}
                </div>
              </section>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 5 }}>
              <section className="studio-panel">
                <Group justify="space-between" mb="sm">
                  <Title order={4}>Versions</Title>
                  <Badge variant="light" color="gray">
                    {versions.length} snapshots
                  </Badge>
                </Group>

                <TextInput
                  label="Snapshot name"
                  placeholder="v0.2 eval-ready release-review"
                  value={versionName}
                  onChange={(event) => setVersionName(event.currentTarget.value)}
                  mb="sm"
                />

                <Group grow align="flex-start">
                  <Select
                    label="Base"
                    data={versionOptions}
                    value={baseVersionId}
                    onChange={setBaseVersionId}
                    placeholder="Select base"
                  />
                  <Select
                    label="Target"
                    data={versionOptions}
                    value={targetVersionId}
                    onChange={setTargetVersionId}
                    placeholder="Select target"
                  />
                </Group>

                {versionDiff ? (
                  <div className="version-diff">
                    <Group gap="xs">
                      <IconGitCompare size={16} />
                      <Text size="sm" fw={700}>
                        Score delta {versionDiff.scoreDelta >= 0 ? '+' : ''}
                        {versionDiff.scoreDelta}%
                      </Text>
                    </Group>
                    <Text size="sm">Metadata changed: {versionDiff.metadataChanged ? 'Yes' : 'No'}</Text>
                    <Text size="sm">Instructions changed: {versionDiff.bodyChanged ? 'Yes' : 'No'}</Text>
                    <Text size="sm">
                      Added resources: {versionDiff.addedResources.join(', ') || 'None'}
                    </Text>
                    <Text size="sm">
                      Removed resources: {versionDiff.removedResources.join(', ') || 'None'}
                    </Text>
                  </div>
                ) : (
                  <Text size="sm" c="dimmed" mt="sm">
                    Select two different snapshots to compare.
                  </Text>
                )}
              </section>
            </Grid.Col>
          </Grid>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
