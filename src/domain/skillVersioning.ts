import type { SkillDraft, SkillEvalResult, SkillVersion } from '../types/skillOps';
import { averageScore } from './skillEvaluation';

function cloneSkill(skill: SkillDraft): SkillDraft {
  return {
    ...skill,
    resources: skill.resources.map((resource) => ({ ...resource })),
  };
}

export function createSkillVersion(
  name: string,
  skill: SkillDraft,
  results: SkillEvalResult[],
): SkillVersion {
  return {
    id: `skill-version-${Date.now()}`,
    name: name.trim() || `Snapshot ${new Date().toLocaleString()}`,
    skill: cloneSkill(skill),
    createdAt: new Date().toISOString(),
    averageScore: averageScore(results),
    resultSummary: results.map((result) => ({
      evalCaseId: result.evalCaseId,
      score: result.score,
    })),
  };
}

export type SkillVersionDiff = {
  metadataChanged: boolean;
  bodyChanged: boolean;
  addedResources: string[];
  removedResources: string[];
  scoreDelta: number;
};

export function diffSkillVersions(
  base: SkillVersion,
  target: SkillVersion,
): SkillVersionDiff {
  const baseResourcePaths = new Set(base.skill.resources.map((resource) => resource.path));
  const targetResourcePaths = new Set(target.skill.resources.map((resource) => resource.path));

  return {
    metadataChanged:
      base.skill.name !== target.skill.name ||
      base.skill.description !== target.skill.description ||
      base.skill.compatibility !== target.skill.compatibility ||
      base.skill.allowedTools !== target.skill.allowedTools,
    bodyChanged: base.skill.body !== target.skill.body,
    addedResources: [...targetResourcePaths].filter((path) => !baseResourcePaths.has(path)),
    removedResources: [...baseResourcePaths].filter((path) => !targetResourcePaths.has(path)),
    scoreDelta: target.averageScore - base.averageScore,
  };
}
