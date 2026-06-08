# SkillOps Studio

A local-first workbench for authoring, evaluating, versioning, and hardening Agent Skills before they enter real agent workflows.

SkillOps Studio started as a lightweight prompt QA tool. It is now oriented around the emerging Agent Skills pattern: a portable `SKILL.md` manifest plus instructions, scripts, references, assets, eval cases, and regression snapshots.

## Product Direction

Agent Skills are becoming a reusable capability layer for coding agents and workflow agents. They are more structured than prompts, lighter than model fine-tuning, and complementary to tools or MCP servers.

This app focuses on the practical middle layer:

- Author a standards-friendly Agent Skill draft.
- Generate a copyable `SKILL.md`.
- Track bundled scripts, references, and assets.
- Define eval cases with expected outcomes, assertions, and evidence requirements.
- Run lightweight readiness checks without calling a model API.
- Save snapshots and compare score, metadata, instruction, and resource changes.

## What It Does Today

- Skill manifest editor for `name`, `description`, `compatibility`, `allowed-tools`, and instruction body.
- Generated `SKILL.md` preview with copy-to-clipboard.
- Resource inventory for `scripts/`, `references/`, and `assets/`.
- Eval case editor for realistic user requests, expected outcomes, assertions, and required evidence.
- Deterministic readiness checks for routing clarity, workflow structure, validation language, eval quality, resource completeness, and risky-action review language.
- Version snapshots with average score and lightweight diff.
- Browser `localStorage` persistence.

## What It Does Not Do Yet

- It does not execute an agent or call a model API.
- It does not run bundled scripts.
- It does not sandbox third-party skills.
- It does not perform trace-driven automatic skill revision.
- It does not import or export full skill folders yet.

Those are intentionally left out of the current refactor because they need deeper debugging, security review, or runtime design.

## Quick Start

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

The default Vite URL is:

```text
http://localhost:5173
```

### Check and build

```bash
npm run lint
npm run build
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Mantine UI
- Tabler Icons

## Core Structure

```text
src/
  App.tsx                         Main SkillOps Studio interface
  domain/
    skillEvaluation.ts            SKILL.md generation and readiness checks
    skillVersioning.ts            Skill snapshot and diff logic
  storage/
    skillOpsStorage.ts            localStorage persistence
  types/
    skillOps.ts                   Skill, eval, result, and version types
```

The previous prompt-oriented modules were removed during the SkillOps refactor.

## Suggested Next Steps

1. Add Vitest coverage for `skillEvaluation.ts` and `skillVersioning.ts`.
2. Add JSON import/export for the full workspace state.
3. Add Agent Skills folder export: `SKILL.md`, `scripts/`, `references/`, and `assets/`.
4. Add run history and baseline comparison across eval iterations.
5. Add a stronger static security linter for risky commands, network calls, dependency installation, and credential handling.
6. Add optional trace-driven revision once real agent run logs are available.

## North Star

SkillOps Studio should become a lightweight CI surface for Agent Skills:

- Every skill is portable.
- Every workflow has eval cases.
- Every change is comparable.
- Every regression is visible before the skill is used by an agent.
