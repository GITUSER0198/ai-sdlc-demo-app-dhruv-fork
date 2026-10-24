# AI in SDLC assignment: approval limits by role

- Pull request: (link)
- Demo video: (link)

## Feature

Approval limits by role in the invoice approval service:

- A Manager may approve up to 50,000, a Director up to 500,000.
- Above 500,000 two different approvers are needed and the second must be a Director.
- The same user never counts as both approvers.
- A refused approval returns a reason and leaves the invoice unchanged.

## Approach

Tools: GitHub Copilot (Free) in VS Code, OpenSpec for the specification.

- Context: `AGENTS.md` extended with the approval rules, layering, test and mutation commands, and review expectations.
- Agents: `.github/agents` has `feature-lead`, which delegates to `spec-writer`, `implementer`, `test-writer` and `reviewer` as subagents.
- Skills: `.github/skills` has approval rules with required tests, mutation testing, review checklist and Playwright conventions, plus the OpenSpec skills.
- Hooks: `.github/hooks/ai-log.json` logs every prompt, tool call and reply to `records/ai-log/`, and runs `dotnet format` after C# edits.
- Spec: `openspec/changes/approval-limits-by-role/`, validated with `openspec validate --strict`.
- Commits:
  - spec: (commit)
  - single-approver limits and tests: (commit)
  - two-approver rule and tests: (commit)
  - UI message and Playwright test: (commit)

## Tests

- Unit tests: (count), covering every rule, including the same approver twice and a refused approval leaving the invoice unchanged.
- Playwright: `e2e/tests/approval-limits.spec.ts`, a Manager is refused when approving 75,000.

## Mutation scores

```
Before: 30.77%  (killed 12, survived 10, no coverage 17)
After:  (fill in)
```

Details: `records/mutation/scores.md`.

## Issues found in generated code

(fill in)

## Review

Findings and verdicts are in the PR description and `records/review/findings.md`.

## AI interaction log

`records/ai-log/ai-interactions.md`, with full transcripts in `records/ai-log/transcripts/`.

## Setup notes

- The projects target .NET 8. `backend/Directory.Build.props` allows running on a newer runtime.
- `nuget.config` restores packages from nuget.org only.
