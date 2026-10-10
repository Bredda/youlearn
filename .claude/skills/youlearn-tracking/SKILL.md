---
name: youlearn-tracking
description: How the agent keeps the GitHub issues and the YouLearn Project (statuses, sub-issues, closing) consistent - the status lifecycle, the Closes/Refs rules for pull requests, when to tick a plan, when to close a plan or an epic, and the tracking.sh helper with its audit. Use when starting work on an issue, opening or merging a pull request, creating or closing an issue, or when the user says something was merged.
---

# Keeping the tracking consistent

Everything is in English. The Project is [YouLearn](https://github.com/users/Bredda/projects/8) (`Bredda/youlearn`). Use `tracking.sh` (next to this file) instead of ad hoc `gh project` calls: it needs only `gh` and gets the Project, field and option ids right.

```sh
T=.claude/skills/youlearn-tracking/tracking.sh
$T status 60 "In progress"          # Backlog | Next | In progress | In review | Done
echo "body" | $T new "Title" "idea,area/ui" Backlog [parent]   # issue + Project + status (+ sub-issue of parent)
$T sub 25 61                        # make #61 a sub-issue of #25
$T audit                            # read-only report of what is inconsistent
$T audit --fix                      # also applies the safe fixes (closed -> Done, open PR that closes it -> In review)
```

## What each status means

| Status | The issue is |
|---|---|
| Backlog | an idea or an unscoped epic: nobody picks it up without a request |
| Next | scoped and ready to start |
| In progress | being worked on now, branch or plan under way |
| In review | closed by a pull request that is open |
| Done | closed (shipped, or dropped: the close reason tells which) |

## Lifecycle (the agent does these, they are not left to chance)

1. **Start**: set the issue to *In progress* before the first commit. A `plan` stays *In progress* for all its phases. Only one plan is in progress at a time; an epic is *In progress* while any child is.
2. **Open a pull request**: set the status *after* the PR exists (a workflow of the Project reacts to the link), and the body says `Closes #N` (one per line) for each issue the PR completes, and `Refs #N` for a phase of a plan (the plan stays open) or an issue that is only touched. Keywords go in the body, never the title. Issues closed by the PR move to *In review*; `Refs` ones do not move.
3. **Merge** (the user merges; when they say so, or at the start of a session, run `audit`): `Closes` issues close by themselves; the Project then needs *Done*, which `audit --fix` sets if the Project's own workflow did not. Then, in the plan, **tick the boxes of the phase that was merged** (tick on merge, not when the PR opens: a plan describes what is on `main`) and say what was not verified.
4. **Last phase of a plan**: that PR says `Closes #<plan>`. After the merge, check the plan's epic: if all its sub-issues are done, close it with a comment and set it to *Done*.
5. **Closing without a PR** (an idea dropped, an issue made obsolete): `gh issue close <n> --reason "not planned"` (or `completed`) **with a comment** saying why and linking what replaces it, then set it to *Done*.
6. **Pausing**: when work stops without finishing (the user changes priority, a plan is abandoned), move the issue back to *Next* and say so on the issue. Never leave *In progress* on something nobody is working on.
7. **New issue**: always with `tracking.sh new` (labels, Project, status, parent). Ideas start in *Backlog* with an `area/*` label (`needs-triage` when unsure); scoped work in *Next*; a `plan` is a child of its epic.
8. **Plan edits**: change checkboxes and add what was learned; do not rewrite decisions that were confirmed. If the plan was wrong, fix the plan first and say what changed.

## The audit

Run `tracking.sh audit` at the start of a session, when the user says something was merged, and before saying a feature is done. It reports: closed but not *Done*, open but *Done*, an open PR that closes an issue that is not *In review*, *In review* with no such PR, issues missing from the Project (the vision issue, labelled `documentation`, is meant to be outside it), a plan with every box ticked, and an epic whose sub-issues are all done. Fix what is safe with `--fix`, close plans and epics yourself, and report anything left.

## Project workflows (the GitHub UI, not scriptable)

The Project's built-in workflows cannot be changed through the API, only listed (and deleted). Settings to have in *Project > Workflows*:

- **Item closed** -> Status *Done*, and **Pull request merged** -> *Done* (the human side of closing).
- **Item added to the project** -> Status *Backlog*.
- **Pull request linked to issue**: it must set *In review*, or be off. It was found setting *Done* the moment a PR with `Closes #N` was opened (the status of #76 changed one second after the PR, under the user's identity), which makes an open issue look finished. Whatever it does, the order is: open the PR first, set *In review* afterwards, and run `audit --fix`, which puts such an issue back to *In review*.

The audit is the safety net when a workflow is off or races with the script.

## Rate limit

`gh issue`, `gh pr` and `gh project` use the GraphQL API, 5000 points an hour shared by everything, and a long session can exhaust it. Prefer REST for reads (`gh api repos/Bredda/youlearn/issues/N`, `.../pulls`), do not poll CI in a loop, and do not run `audit` repeatedly (about 130 points each). When a call answers `API rate limit exceeded`, stop calling and wait for the reset time (`gh api graphql -f query='{rateLimit{remaining resetAt}}'`).
