# SkillOps Studio - Engineering Handoff

## 1. Product Goal

Build a local-first workbench for Agent Skill development.

The app should help users create and harden reusable skills before those skills are installed into Codex, Claude Code, or another Agent Skills-compatible client.

The current MVP is deliberately lightweight:

- Author a standards-friendly `SKILL.md` draft.
- Track scripts, references, and assets as resource metadata.
- Define eval cases with assertions and required evidence.
- Run deterministic readiness checks.
- Save snapshots and compare versions.

## 2. Current Scope

### In scope

- Local Skill draft editing.
- Generated `SKILL.md` preview.
- Resource inventory.
- Eval case editing.
- Static readiness checks.
- Snapshot and diff.
- `localStorage` persistence.

### Out of scope for this refactor

- Model API execution.
- Real agent execution.
- Script execution.
- Skill sandboxing.
- Trace-conditioned automatic skill repair.
- Full folder import/export.

## 3. Active Modules

- `src/App.tsx`: main UI and interaction orchestration.
- `src/types/skillOps.ts`: domain types for skills, evals, results, and versions.
- `src/domain/skillEvaluation.ts`: `SKILL.md` generation, eval run-card generation, and readiness checks.
- `src/domain/skillVersioning.ts`: snapshot creation and version diff.
- `src/storage/skillOpsStorage.ts`: `localStorage` read/write.

The previous prompt-lab modules were removed during the SkillOps refactor.

## 4. Readiness Checks

Current eval scoring is deterministic. It checks:

- Portable kebab-case skill name.
- Specific routing description.
- Workflow language in instructions.
- Validation or evidence language in instructions.
- Complete resource metadata.
- Realistic eval request.
- Expected outcome.
- At least two measurable assertions.
- Keyword overlap between routing text and eval request.
- Review language when risky terms appear.

This is not a replacement for real agent evals. It is a fast authoring guardrail.

## 5. Architecture Direction

The next clean split should be:

1. `ui/`: presentational components.
2. `application/`: state transitions, import/export, run orchestration.
3. `domain/`: pure skill/eval/version logic.
4. `infrastructure/`: storage, filesystem export, future API adapters.

Current `App.tsx` is still the composition point and contains state updates. That is acceptable for this lightweight refactor, but it should be decomposed before adding heavier workflows.

## 6. Suggested Backlog

1. `test-001`: Add Vitest and unit tests for `skillEvaluation.ts`.
2. `test-002`: Add unit tests for `skillVersioning.ts`.
3. `export-001`: Export current state as JSON.
4. `export-002`: Export Agent Skill folder structure.
5. `ux-001`: Add failed-check filter.
6. `version-001`: Add baseline run history and per-eval score deltas.
7. `security-001`: Add stronger static linter for risky commands, network egress, dependency installation, and credentials.
8. `import-001`: Import existing `SKILL.md` folders.
9. `trace-001`: Accept agent run logs and suggest skill revisions.

## 7. Quality Gates

- `npm run lint` passes.
- `npm run build` passes.
- README stays English.
- No runtime feature should execute untrusted scripts without a security design.
- Any future schema change should include a migration path for `localStorage`.

## 8. Manual Smoke Flow

1. Edit the skill name and description.
2. Edit the instruction body.
3. Add or update a resource.
4. Add an eval case.
5. Run evals.
6. Inspect check results and run card.
7. Save a snapshot.
8. Change the skill and save another snapshot.
9. Compare the two versions.
