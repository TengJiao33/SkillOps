# Prompt Lab - Engineering Handoff

## 1. Project Goal

Build a local-first Prompt engineering workbench that helps teams produce prompts that are:

- Reusable: template + variable contract
- Verifiable: test cases + automated checks
- Iterative: version snapshots + version comparison

This project is **not** a visual text-splicing toy. The core value is Prompt QA and controlled iteration.

## 2. Product Definition

### Target users

- Prompt engineers
- AI application developers
- Product owners who need stable prompt behavior

### Core user problem

Users currently cannot answer:

- Which prompt version is better?
- What changed between versions?
- Did new changes break known scenarios?

### MVP outcome

A user can create one prompt template, define variables, run multiple test cases, inspect pass/fail checks, save versions, and compare two versions.

## 3. Current State (As Implemented)

### Existing modules

- `src/App.tsx`: primary UI and orchestration
- `src/domain/template.ts`: variable extraction and template rendering
- `src/domain/evaluation.ts`: test checks and scoring
- `src/domain/versioning.ts`: version snapshot and diff
- `src/storage/promptLabStorage.ts`: localStorage read/write
- `src/types/promptLab.ts`: core domain types

### Existing features

- Template editor with `{{variable}}` placeholders
- Variable contract editor (required/default/description)
- Test case management
- Test run results with rule-based checks
- Version save and compare (template changed, variable add/remove)
- Local persistence

### Known constraints

- No backend API
- No model execution API
- Local-only persistence (browser localStorage)

## 4. Target Architecture

### Layering

1. `ui/`: presentational components only
2. `application/`: use-case orchestration and state transition
3. `domain/`: pure functions (template, checks, scoring, versioning)
4. `infrastructure/`: storage and future API adapters

### Dependency rule

- `ui` can depend on `application` and types
- `application` can depend on `domain` and `infrastructure`
- `domain` must stay pure and framework-agnostic
- `infrastructure` should not depend on `ui`

### Immediate structural refactor

- Split `src/App.tsx` into:
  - `src/ui/pages/PromptLabPage.tsx`
  - `src/ui/components/*`
  - `src/application/promptLabService.ts`
  - `src/application/promptLabStore.ts`

## 5. Engineering TODO (Execution Order)

## Phase 0 - Stability and Build Hygiene

- [ ] Install and lock dependencies
- [ ] Pass `npm run lint`
- [ ] Pass `npm run build`
- [ ] Remove unused dependencies in `package.json`
- [ ] Add `npm run test` script and baseline test runner

## Phase 1 - Domain Reliability

- [ ] Add unit tests for `extractVariableNames`
- [ ] Add unit tests for `renderTemplate` including regex-special variable names
- [ ] Add unit tests for unresolved token detection
- [ ] Add unit tests for all checks in `evaluation.ts`
- [ ] Add unit tests for scoring aggregation
- [ ] Add unit tests for version diff logic

Acceptance criteria:

- Pure domain functions have deterministic tests
- No regressions when changing templates or variable names

## Phase 2 - Application Layer Refactor

- [ ] Move state mutations out of `App.tsx`
- [ ] Introduce centralized store (Zustand or reducer-based store)
- [ ] Add typed action creators for all state changes
- [ ] Add selectors for derived state (scores, selected result, comparison)

Acceptance criteria:

- `App.tsx` becomes composition-only
- No direct business logic inside UI components

## Phase 3 - UX and Workflow Hardening

- [ ] Add run history timeline (timestamp + average score)
- [ ] Add per-check filter (show only failed)
- [ ] Add one-click duplicate test case
- [ ] Add unsaved-change indicators
- [ ] Add destructive action confirmation for delete actions

Acceptance criteria:

- User can isolate failures quickly
- User cannot accidentally lose key work

## Phase 4 - Versioning and Regression Baseline

- [ ] Introduce "baseline version"
- [ ] Compare current run against baseline run score
- [ ] Show per-case delta (`+/- score`)
- [ ] Add changelog notes for each version

Acceptance criteria:

- Teams can identify whether changes improved or degraded quality

## Phase 5 - Collaboration and Export

- [ ] Export/import project state as JSON
- [ ] Export run reports as Markdown
- [ ] Add schema version to exported data
- [ ] Build migration path for old schemas

Acceptance criteria:

- Another engineer can transfer state between machines safely

## 6. Implementation Plan (Concrete)

### Step A: Testing setup

1. Add `vitest` and `@testing-library/react`
2. Add `test` script and base config
3. Create `src/domain/*.test.ts`

### Step B: File decomposition

1. Extract result table, case editor, variable table, version panel into separate components
2. Keep each component stateless where possible
3. Keep all mutation logic in store/service

### Step C: Safety rails

1. Add guard for empty test suite before run
2. Add guard for invalid min/max length
3. Add explicit error state UI for corrupted local storage

### Step D: Regression workflow

1. Save snapshot of run results when version is created
2. Compute delta between active run and baseline snapshot
3. Visualize red/green trend

## 7. Definition of Done (DoD)

Feature is complete only when:

- Code compiles and lints
- Domain tests pass
- Manual QA checklist passes
- README and this handoff file are updated
- No hidden side effects in local storage format

## 8. Quality Gates

- Lint: zero errors
- Build: success
- Unit test coverage target for domain layer: >= 85%
- Critical flows manually verified:
  - Create template and sync variables
  - Run multiple test cases
  - Save and compare versions
  - Reload page and recover state

## 9. Risks and Mitigations

- Risk: UI and domain logic become coupled again  
  Mitigation: enforce layering and code-owner review for `src/domain/*`

- Risk: localStorage schema breaks old data  
  Mitigation: add schema version and migration function

- Risk: false confidence from weak checks  
  Mitigation: make checks configurable and add manual score field

## 10. Suggested Backlog Tickets

1. `infra-001`: Add vitest and baseline test suite
2. `domain-001`: Template render edge-case tests
3. `domain-002`: Evaluation scoring refactor and tests
4. `app-001`: Split App page into modular components
5. `app-002`: Add centralized state store
6. `ux-001`: Failed-check focused view
7. `version-001`: Baseline + delta comparison
8. `export-001`: JSON import/export with schema version

## 11. Developer Onboarding Checklist

1. Install dependencies: `npm install`
2. Run dev: `npm run dev`
3. Run lint: `npm run lint`
4. Run build: `npm run build`
5. Read:
   - `README.md`
   - `ENGINEERING_HANDOFF.md`
   - `src/types/promptLab.ts`
   - `src/domain/*`
6. Verify manual smoke flow:
   - Edit template
   - Sync variables
   - Add case
   - Run tests
   - Save version
   - Compare versions

## 12. North Star Metrics

- Template reuse rate (same template used multiple times)
- Pass rate trend across versions
- Mean time to diagnose failing case
- Number of regression failures caught before release

## 13. End-State Vision

Prompt Lab should become the "CI for prompts" in a lightweight local-first form:

- Every template is testable
- Every change is comparable
- Every regression is visible
- Any engineer can continue work without rediscovering intent
