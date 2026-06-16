---
name: ralph
description: >-
  Implement a single issue from issues/ using phase-appropriate workflow (infra,
  TDD features, HITL deploy, or cleanup). Use when the user invokes /ralph with
  an issue number (e.g. /ralph 001, /ralph 006) or asks Ralph to run a task.
---

# Ralph — Implement One Issue

Execute **exactly one** issue per invocation. The user provides the issue number: `/ralph 001`, `/ralph 6`, etc.

## 1. Resolve the issue

1. Normalize the number to three digits (`6` → `006`, `001` → `001`).
2. Find the file: `issues/{NNN}-*.md` (exactly one match).
3. Read the issue completely — unless already in context (see below).
4. Read PRD sections referenced by the issue — see **Jerarquía de especificaciones** in `issues/prd.md`; not the full PRD by default.
5. Read `ralph/phases.md` to determine the **phase** for this number.

If the file does not exist, stop and tell the user.

### Context reuse

Do not re-read issue, PRD sections, SAD, or phase prompts already in the chat (`@` attachments or prior read in this window). Read from disk only when context is missing or files may have changed.

## 2. Check blockers

Parse the issue's `## Blocked by` section:

- **None** or empty → proceed.
- Otherwise, each listed issue must exist as `issues/done/{same-filename}`.
- If any blocker is not in `issues/done/`, **stop** and list missing blockers. Do not implement.

## 3. Load phase instructions

| Phase | Issues | Prompt file | Testing skill |
|-------|--------|-------------|---------------|
| infra | 001–003 | [ralph/prompt-infra.md](../../ralph/prompt-infra.md) | Integration-first (no `/tdd`) |
| features | 004–014 | [ralph/prompt-features.md](../../ralph/prompt-features.md) | **Use `/tdd`** |
| hitl | 015–016 | [ralph/prompt-hitl.md](../../ralph/prompt-hitl.md) | Human validation |
| cleanup | 017 | [ralph/prompt-cleanup.md](../../ralph/prompt-cleanup.md) | Smoke + manual OK |

Read the prompt file for the phase **in full** and follow it.

## 4. Repo context

If the repo uses git: `git log -n 5 --oneline` (optional context for continuity). Skip if not a git repository.

Explore the repo only as needed for the current issue. Do not start other issues.

## 5. Execute

Follow the phase prompt. Shared rules from [ralph/prompt-base.md](../../ralph/prompt-base.md) always apply.

## 6. Close the issue

**infra / features / cleanup (when fully done):**

- All acceptance criteria checked in the issue file.
- Move `issues/{file}` → `issues/done/{file}`.

**hitl (015–016):**

- Move to `issues/done/` only after human-validated items are confirmed or explicitly deferred in an issue note.

**Partial work:**

- Do not move the file. Add `## Progress` to the issue with done / remaining / blockers.

## 7. Commit

One commit per issue when work is complete (or one WIP commit only if the user asked to pause). Message must include: key decisions, files touched, notes for next task.

## Final rules

- **ONE issue per invocation** — never pick the next task automatically.
- **Do not skip phase routing** — 001–003 never use `/tdd`; 004–014 must use `/tdd`.
- Stack: **Node.js, JavaScript, Jest, Express, PostgreSQL, Redis** — no TypeScript, no `npm run typecheck`.
- Architecture: `issues/prd.md` + `.cursor/arquitecture/SAD.md` § 3.1 (see PRD **Jerarquía de especificaciones**).
