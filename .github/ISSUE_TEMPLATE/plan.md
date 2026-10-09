---
name: Plan
about: Executable plan of a feature (one at a time is "In progress")
title: "Plan: "
labels: plan
---

## Goal

<!-- What this feature delivers, and the epic (parent issue) it belongs to. -->

## Where we are

<!-- Current state of the code and what is already in place. -->

## Decisions

<!-- Each decision carries a recommendation. Confirm it with the maintainer before the tasks that depend on it; with no answer, apply the recommendation and say so. -->

- [ ] **D1 - <question>**: recommendation: <...>

## Phases

<!-- One commit per phase. Each task lists the files touched and a Verify line; a task is done only when its Verify line passes. Tasks that depend on a decision are marked "(decision to take)". -->

### Phase 1 - <name>

- [ ] <task> (`path/to/file.ts`)
  - **Verify:** <how to check it, e.g. `curl` with a session cookie, a page, a unit test>

## Done when

<!-- Observable outcome. Always finish with `pnpm lint:ci`, `pnpm check-types` and `pnpm test`. -->
