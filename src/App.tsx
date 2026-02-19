import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import {
  IconCopy,
  IconDeviceFloppy,
  IconFlask2,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';

import { averageScore, runAllPromptTests } from './domain/evaluation';
import {
  createEmptyInputs,
  extractVariableNames,
  mergeVariableDefinitions,
} from './domain/template';
import { createVersion, diffVersions } from './domain/versioning';
import { loadPromptLabState, savePromptLabState } from './storage/promptLabStorage';
import type {
  PromptLabState,
  PromptRunResult,
  PromptTestCase,
  VariableDefinition,
} from './types/promptLab';
import './App.css';

const DEFAULT_TEMPLATE = `你是{{role}}。
请围绕目标「{{goal}}」输出一套可执行方案。
最终内容必须使用{{output_format}}，并包含验收标准与风险提醒。`;

function createDefaultState(): PromptLabState {
  const variableNames = extractVariableNames(DEFAULT_TEMPLATE);
  const variables = mergeVariableDefinitions(variableNames, []);
  const testCase: PromptTestCase = {
    id: 'case-1',
    name: '新用户留存方案',
    inputs: {
      ...createEmptyInputs(variableNames),
      role: '资深增长产品经理',
      goal: '提升新用户首周留存率',
      output_format: 'Markdown 列表',
    },
    requiredPhrases: ['验收标准', '风险提醒'],
    forbiddenPhrases: ['我不能', '抱歉'],
    minLength: 120,
    maxLength: 2000,
  };

  return {
    template: DEFAULT_TEMPLATE,
    variables,
    testCases: [testCase],
    versions: [],
  };
}

function splitLines(input: string): string[] {
  return input
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function joinLines(lines: string[]): string {
  return lines.join('\n');
}

function syncCaseInputs(testCase: PromptTestCase, variableNames: string[]): PromptTestCase {
  const nextInputs = createEmptyInputs(variableNames);
  for (const name of variableNames) {
    nextInputs[name] = testCase.inputs[name] ?? '';
  }
  return { ...testCase, inputs: nextInputs };
}

function createTestCase(variableNames: string[], index: number): PromptTestCase {
  return {
    id: `case-${Date.now()}-${index}`,
    name: `测试用例 ${index + 1}`,
    inputs: createEmptyInputs(variableNames),
    requiredPhrases: [],
    forbiddenPhrases: [],
    minLength: undefined,
    maxLength: undefined,
  };
}

function toOptionalNumber(value: string | number): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'teal';
  if (score >= 60) return 'orange';
  return 'red';
}

function App() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [variables, setVariables] = useState<VariableDefinition[]>([]);
  const [testCases, setTestCases] = useState<PromptTestCase[]>([]);
  const [versions, setVersions] = useState<PromptLabState['versions']>([]);
  const [runResults, setRunResults] = useState<PromptRunResult[]>([]);
  const [selectedResultCaseId, setSelectedResultCaseId] = useState('');
  const [versionName, setVersionName] = useState('');
  const [baseVersionId, setBaseVersionId] = useState<string | null>(null);
  const [targetVersionId, setTargetVersionId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadPromptLabState(createDefaultState());
    setTemplate(loaded.template);
    setVariables(loaded.variables);
    setTestCases(loaded.testCases);
    setVersions(loaded.versions);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    savePromptLabState({ template, variables, testCases, versions });
  }, [isHydrated, template, variables, testCases, versions]);

  useEffect(() => {
    if (versions.length === 0) {
      setBaseVersionId(null);
      setTargetVersionId(null);
      return;
    }
    if (!baseVersionId) setBaseVersionId(versions[0].id);
    if (!targetVersionId && versions.length > 1) setTargetVersionId(versions[1].id);
  }, [versions, baseVersionId, targetVersionId]);

  const variableNames = useMemo(() => variables.map((item) => item.name), [variables]);

  const templateStats = useMemo(() => {
    const trimmed = template.trim();
    return {
      charCount: trimmed.length,
      lineCount: trimmed ? trimmed.split('\n').length : 0,
    };
  }, [template]);

  const selectedResult = useMemo(
    () => runResults.find((item) => item.testCaseId === selectedResultCaseId),
    [runResults, selectedResultCaseId],
  );

  const overallScore = useMemo(() => averageScore(runResults), [runResults]);

  const versionOptions = useMemo(
    () =>
      versions.map((item) => ({
        value: item.id,
        label: `${item.name} (${new Date(item.createdAt).toLocaleString()})`,
      })),
    [versions],
  );

  const baseVersion = useMemo(
    () => versions.find((item) => item.id === baseVersionId),
    [versions, baseVersionId],
  );
  const targetVersion = useMemo(
    () => versions.find((item) => item.id === targetVersionId),
    [versions, targetVersionId],
  );
  const comparison = useMemo(() => {
    if (!baseVersion || !targetVersion || baseVersion.id === targetVersion.id) return null;
    return diffVersions(baseVersion, targetVersion);
  }, [baseVersion, targetVersion]);

  const handleSyncVariables = () => {
    const extractedNames = extractVariableNames(template);
    const nextVariables = mergeVariableDefinitions(extractedNames, variables);
    setVariables(nextVariables);
    setTestCases((current) => current.map((item) => syncCaseInputs(item, extractedNames)));
  };

  const handleVariableChange = (
    name: string,
    updater: (current: VariableDefinition) => VariableDefinition,
  ) => {
    setVariables((current) => current.map((item) => (item.name === name ? updater(item) : item)));
  };

  const handleTestCaseChange = (
    testCaseId: string,
    updater: (current: PromptTestCase) => PromptTestCase,
  ) => {
    setTestCases((current) => current.map((item) => (item.id === testCaseId ? updater(item) : item)));
  };

  const handleAddTestCase = () => {
    setTestCases((current) => [...current, createTestCase(variableNames, current.length)]);
  };

  const handleDeleteTestCase = (testCaseId: string) => {
    setTestCases((current) => current.filter((item) => item.id !== testCaseId));
    setRunResults((current) => current.filter((item) => item.testCaseId !== testCaseId));
    if (selectedResultCaseId === testCaseId) setSelectedResultCaseId('');
  };

  const handleRunTests = () => {
    const results = runAllPromptTests(template, variables, testCases);
    setRunResults(results);
    setSelectedResultCaseId(results[0]?.testCaseId ?? '');
  };

  const handleSaveVersion = () => {
    const nextVersion = createVersion(versionName, template, variables);
    setVersions((current) => [nextVersion, ...current]);
    setVersionName('');
  };

  return (
    <AppShell header={{ height: 88 }} padding={0}>
      <AppShell.Header className="lab-header">
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%" wrap="wrap" gap="sm">
            <Group gap="sm">
              <div>
                <Title order={3} className="lab-title">
                  提示词工程台
                </Title>
                <Text size="sm" c="dimmed">
                  模板可复用，用例可验证，版本可对比
                </Text>
              </div>
              <Badge variant="light" color="teal">
                变量 {variables.length}
              </Badge>
              <Badge variant="light" color="orange">
                用例 {testCases.length}
              </Badge>
              <Badge variant="filled" color={runResults.length > 0 ? scoreColor(overallScore) : 'gray'}>
                平均得分 {runResults.length > 0 ? `${overallScore}%` : '未运行'}
              </Badge>
            </Group>
            <Group className="action-group">
              <Button
                variant="default"
                className="action-btn"
                leftSection={<IconRefresh size={16} />}
                onClick={handleSyncVariables}
              >
                同步变量
              </Button>
              <Button
                variant="default"
                className="action-btn"
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={handleSaveVersion}
              >
                保存版本
              </Button>
              <Button
                color="teal"
                className="action-btn run-btn"
                leftSection={<IconFlask2 size={16} />}
                onClick={handleRunTests}
              >
                运行验证
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main className="lab-main">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <Container size="xl" py="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Stack gap="md">
                <Card className="lab-card reveal reveal-1" withBorder radius="lg" p="lg">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Title order={4}>模板编辑区</Title>
                      <Text size="sm" c="dimmed">
                        使用 {`{{变量名}}`} 占位符
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Badge variant="light" color="cyan">
                        字符 {templateStats.charCount}
                      </Badge>
                      <Badge variant="light" color="blue">
                        行数 {templateStats.lineCount}
                      </Badge>
                    </Group>
                    <Textarea
                      className="template-editor"
                      value={template}
                      onChange={(event) => setTemplate(event.currentTarget.value)}
                      minRows={16}
                      autosize={false}
                    />
                  </Stack>
                </Card>

                <Card className="lab-card reveal reveal-2" withBorder radius="lg" p="lg">
                  <Stack gap="sm">
                    <Title order={4}>变量契约</Title>
                    <Table withTableBorder striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>变量名</Table.Th>
                          <Table.Th>必填</Table.Th>
                          <Table.Th>默认值</Table.Th>
                          <Table.Th>说明</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {variables.map((variable) => (
                          <Table.Tr key={variable.name}>
                            <Table.Td>
                              <Text fw={600}>{variable.name}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Switch
                                checked={variable.required}
                                onChange={(event) =>
                                  handleVariableChange(variable.name, (current) => ({
                                    ...current,
                                    required: event.currentTarget.checked,
                                  }))
                                }
                              />
                            </Table.Td>
                            <Table.Td>
                              <TextInput
                                value={variable.defaultValue}
                                onChange={(event) =>
                                  handleVariableChange(variable.name, (current) => ({
                                    ...current,
                                    defaultValue: event.currentTarget.value,
                                  }))
                                }
                              />
                            </Table.Td>
                            <Table.Td>
                              <TextInput
                                value={variable.description}
                                onChange={(event) =>
                                  handleVariableChange(variable.name, (current) => ({
                                    ...current,
                                    description: event.currentTarget.value,
                                  }))
                                }
                              />
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Stack gap="md">
                <Card className="lab-card reveal reveal-2" withBorder radius="lg" p="lg">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Title order={4}>测试用例</Title>
                      <Button
                        size="xs"
                        leftSection={<IconPlus size={14} />}
                        variant="light"
                        onClick={handleAddTestCase}
                      >
                        新增用例
                      </Button>
                    </Group>
                    <ScrollArea h={440}>
                      <Stack gap="sm">
                        {testCases.map((testCase) => (
                          <Card withBorder radius="md" key={testCase.id} className="case-card">
                            <Stack gap="sm">
                              <Group justify="space-between" align="flex-start">
                                <TextInput
                                  label="用例名称"
                                  value={testCase.name}
                                  onChange={(event) =>
                                    handleTestCaseChange(testCase.id, (current) => ({
                                      ...current,
                                      name: event.currentTarget.value,
                                    }))
                                  }
                                  style={{ flex: 1 }}
                                />
                                <ActionIcon
                                  mt={24}
                                  color="red"
                                  variant="light"
                                  onClick={() => handleDeleteTestCase(testCase.id)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Group>

                              <Divider label="输入参数" />
                              <Grid gutter="xs">
                                {variables.map((variable) => (
                                  <Grid.Col span={12} key={`${testCase.id}-${variable.name}`}>
                                    <TextInput
                                      label={variable.name}
                                      value={testCase.inputs[variable.name] ?? ''}
                                      onChange={(event) =>
                                        handleTestCaseChange(testCase.id, (current) => ({
                                          ...current,
                                          inputs: {
                                            ...current.inputs,
                                            [variable.name]: event.currentTarget.value,
                                          },
                                        }))
                                      }
                                    />
                                  </Grid.Col>
                                ))}
                              </Grid>

                              <Textarea
                                label="必须包含短语（每行一个）"
                                value={joinLines(testCase.requiredPhrases)}
                                onChange={(event) =>
                                  handleTestCaseChange(testCase.id, (current) => ({
                                    ...current,
                                    requiredPhrases: splitLines(event.currentTarget.value),
                                  }))
                                }
                                minRows={2}
                              />
                              <Textarea
                                label="禁止包含短语（每行一个）"
                                value={joinLines(testCase.forbiddenPhrases)}
                                onChange={(event) =>
                                  handleTestCaseChange(testCase.id, (current) => ({
                                    ...current,
                                    forbiddenPhrases: splitLines(event.currentTarget.value),
                                  }))
                                }
                                minRows={2}
                              />
                              <Group grow>
                                <NumberInput
                                  label="最小长度"
                                  min={0}
                                  value={testCase.minLength}
                                  onChange={(value) =>
                                    handleTestCaseChange(testCase.id, (current) => ({
                                      ...current,
                                      minLength: toOptionalNumber(value),
                                    }))
                                  }
                                />
                                <NumberInput
                                  label="最大长度"
                                  min={0}
                                  value={testCase.maxLength}
                                  onChange={(value) =>
                                    handleTestCaseChange(testCase.id, (current) => ({
                                      ...current,
                                      maxLength: toOptionalNumber(value),
                                    }))
                                  }
                                />
                              </Group>
                              {typeof testCase.minLength === 'number' &&
                                typeof testCase.maxLength === 'number' &&
                                testCase.maxLength < testCase.minLength && (
                                  <Text size="xs" c="red">
                                    长度规则异常：最大长度小于最小长度
                                  </Text>
                                )}
                            </Stack>
                          </Card>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Card>

                <Card className="lab-card reveal reveal-3" withBorder radius="lg" p="lg">
                  <Stack gap="sm">
                    <Title order={4}>运行结果</Title>
                    {runResults.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        暂无运行结果，点击右上角“运行验证”开始评估。
                      </Text>
                    ) : (
                      <>
                        <Table withTableBorder striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>用例</Table.Th>
                              <Table.Th>得分</Table.Th>
                              <Table.Th>通过项</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {runResults.map((result) => {
                              const testCase = testCases.find((item) => item.id === result.testCaseId);
                              const passedCount = result.checks.filter((item) => item.passed).length;
                              return (
                                <Table.Tr
                                  key={result.testCaseId}
                                  onClick={() => setSelectedResultCaseId(result.testCaseId)}
                                  className={
                                    selectedResultCaseId === result.testCaseId
                                      ? 'selected-result-row'
                                      : undefined
                                  }
                                >
                                  <Table.Td>{testCase?.name ?? result.testCaseId}</Table.Td>
                                  <Table.Td>{result.score}%</Table.Td>
                                  <Table.Td>{`${passedCount}/${result.checks.length}`}</Table.Td>
                                </Table.Tr>
                              );
                            })}
                          </Table.Tbody>
                        </Table>

                        {selectedResult && (
                          <Card withBorder radius="md" className="preview-card">
                            <Stack gap="sm">
                              <Group justify="space-between">
                                <Text fw={600}>选中结果预览</Text>
                                <Button
                                  size="xs"
                                  variant="light"
                                  leftSection={<IconCopy size={14} />}
                                  onClick={() => navigator.clipboard.writeText(selectedResult.renderedPrompt)}
                                >
                                  复制结果
                                </Button>
                              </Group>
                              <Textarea value={selectedResult.renderedPrompt} minRows={6} readOnly />
                              <Stack gap={4}>
                                {selectedResult.checks.map((check) => (
                                  <Text size="sm" key={`${selectedResult.testCaseId}-${check.id}`}>
                                    {check.passed ? '通过' : '失败'} | {check.label}
                                    {check.detail ? ` | ${check.detail}` : ''}
                                  </Text>
                                ))}
                              </Stack>
                            </Stack>
                          </Card>
                        )}
                      </>
                    )}
                  </Stack>
                </Card>

                <Card className="lab-card reveal reveal-3" withBorder radius="lg" p="lg">
                  <Stack gap="sm">
                    <Title order={4}>版本管理</Title>
                    <TextInput
                      label="新版本名称"
                      placeholder="例如：v1.2 加强输出约束"
                      value={versionName}
                      onChange={(event) => setVersionName(event.currentTarget.value)}
                    />
                    <Text size="sm" c="dimmed">
                      已保存版本：{versions.length}
                    </Text>
                    <Group grow>
                      <Select
                        label="基准版本"
                        data={versionOptions}
                        value={baseVersionId}
                        onChange={setBaseVersionId}
                        placeholder="选择基准"
                      />
                      <Select
                        label="对比版本"
                        data={versionOptions}
                        value={targetVersionId}
                        onChange={setTargetVersionId}
                        placeholder="选择对比"
                      />
                    </Group>
                    {comparison ? (
                      <Stack gap={4}>
                        <Text size="sm">模板变化：{comparison.templateChanged ? '有' : '无'}</Text>
                        <Text size="sm">新增变量：{comparison.addedVariables.join('、') || '无'}</Text>
                        <Text size="sm">删除变量：{comparison.removedVariables.join('、') || '无'}</Text>
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        请选择两个不同版本以查看差异。
                      </Text>
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
