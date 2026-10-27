# AI in SDLC assignment: approval limits by role

- Pull request: https://github.com/GITUSER0198/ai-sdlc-demo-app-dhruv-fork/pull/1
- Demo video: included as an MP4 in the submitted zip folder.

## Hand-in

1. Pull request on the fork with at least three commits that each stand on their own: link above, commits listed under [Approach](#approach).
2. Updated AGENTS.md: [AGENTS.md](AGENTS.md).
3. Specification files: [openspec/changes/approval-limits-by-role/](openspec/changes/approval-limits-by-role/) ([proposal](openspec/changes/approval-limits-by-role/proposal.md), [spec](openspec/changes/approval-limits-by-role/specs/invoice-approval/spec.md), [design](openspec/changes/approval-limits-by-role/design.md), [tasks](openspec/changes/approval-limits-by-role/tasks.md)).
4. Unit tests for every approval rule, including the two negative rules: [ApprovalServiceTests.cs](backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs), see [Tests](#tests).
5. One Playwright test covering a rejected over-limit approval: [approval-limits.spec.ts](e2e/tests/approval-limits.spec.ts).
6. Mutation scores before and after: [Mutation scores](#mutation-scores), details in [scores.md](records/mutation/scores.md).
7. Review findings with a verdict each: in the PR description, see [Review](#review).
8. Log of all AI interaction: [ai-log.md](records/ai-log/ai-log.md) and [ai-log.jsonl](records/ai-log/ai-log.jsonl), see [AI interaction log](#ai-interaction-log).
9. ASSIGNMENT.md with the write-up and video link: this file.
10. Demo video: in the submitted zip folder.

## Feature

Approval limits by role in the invoice approval service:

- A Manager may approve up to 50,000, a Director up to 500,000.
- Above 500,000 two different approvers are needed and the second must be a Director.
- The same user never counts as both approvers.
- A refused approval returns a reason and leaves the invoice unchanged.

## Approach

Tools: GitHub Copilot (Free) in VS Code, OpenSpec for the specification.

- Context: `AGENTS.md` extended with the approval rules, layering, test and mutation commands, and review expectations.
- Agents: `.github/agents` has five custom agents. `spec-writer` writes the spec, `implementer` writes code and tests, `test-writer` adds tests and runs mutation testing, `reviewer` reviews read-only. `feature-lead` plans and hands each step to the others as subagents (`runSubagent`). Each agent gets only the tools it needs.
- Agent use in practice: each step was run with its own agent through a prompt file (`/step1-single-approver` and `/step2-two-approvers` with `implementer`, `/e2e-over-limit` with `test-writer`, the spec fix with `spec-writer`), so every step could be checked before the next. Delegation through `feature-lead` was tried once during setup (it called `reviewer` as a subagent); see the AI log.
- Prompt files: `.github/prompts`, one per step plus `/context-check`, `/mutation-report` and `/review-pr`.
- Skills: `.github/skills` has approval rules with required tests, mutation testing, review checklist and Playwright conventions, plus the OpenSpec skills.
- Hooks: `.github/hooks/ai-log.json` logs every prompt, tool call and reply to `records/ai-log/`, and runs `dotnet format` after C# edits.
- Spec: `openspec/changes/approval-limits-by-role/`, validated with `openspec validate --strict`.
- Commits, oldest first. Each builds and its tests pass:
  - f84cf66 package restore fix and Stryker tool
  - 4f918b2 approval limits in AGENTS.md
  - 86b593e OpenSpec setup
  - 31840d1 Copilot agents, skills, prompts and hooks
  - fb38e86 assignment write-up
  - 24256a4 spec for approval limits by role
  - 5ab53ce single-approver limits and tests (13 tests)
  - 638fe80 two-approver rule and tests (18 tests)
  - b44dfcc Playwright test for an over-limit approval
  - the last commit adds the AI log and the mutation results

## Context, and why it matters

- `AGENTS.md` now holds the approval limits, where the checks belong (`ApprovalService` in Domain, not controllers), the trap that the repository returns the stored instance (so a field set before a refusal stays changed), the test, e2e and mutation commands, the demo accounts and the review format.
- One existing line was changed: approvals were "Approver or Admin". In a trial run before that change, Copilot followed the old line and kept `[RequireRole("Approver", "Admin")]` on the Approve endpoint, which would block Managers and Directors before the limits run. After the change it used Manager and Director.
- `/context-check` asks six questions whose answers are only in `AGENTS.md`. Copilot answered them from the file, applied the two-approver rule to an 800,000 invoice, and named the source. It also shortened the Stryker path and left one answer without a source, so its answers are checked, not trusted.

## Tests

- Unit tests: 18 in [ApprovalServiceTests.cs](backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs), run with `dotnet test backend/InvoiceApp.sln`.
  - Same user never counts twice: `Approve_SameDirectorTwice_OnLargeInvoice_RefusesAndLeavesInvoiceUnchanged` and `Approve_SameDirectorSecondApproval_WithDifferentCasingAndSpaces_RefusesAndLeavesInvoiceUnchanged`.
  - A refused attempt returns a reason and changes nothing: `Approve_Manager_RefusesAmountAboveTheLimit_AndLeavesInvoiceUnchanged`, `Approve_ManagerSecond_OnLargeInvoice_RefusesAndLeavesInvoiceUnchanged` and `Approve_RejectsRolesWithoutApprovalLimits_AndLeavesInvoiceUnchanged`. Each checks the reason and that status, approver, dates, note and first-approver fields are unchanged.
  - Limits at the boundary: `Approve_Manager_ApprovesAtTheFiftyThousandBoundary`, `Approve_Director_ApprovesAtTheFiveHundredThousandBoundary`, and the refusal one cent above.
  - Two approvers above 500,000: `Approve_ManagerFirst_DirectorSecond_OnLargeInvoice_ApprovesAndRecordsBothApprovers` and the two first-approval tests that keep the invoice pending.
- Playwright: [approval-limits.spec.ts](e2e/tests/approval-limits.spec.ts) with page objects in [e2e/pages/](e2e/pages/). A Manager approves 75,000, sees "Manager approval limit is 50,000. Amount 75,000.00 exceeds the limit." and the invoice stays pending. Run with `cd e2e && npm test`.

## Mutation scores

```
Before: 30.77%  (killed 12, survived 10, no coverage 17)
After:  56.70%  (killed 55, survived 19, no coverage 23); ApprovalService.cs alone 70.5%
```

Details: [records/mutation/scores.md](records/mutation/scores.md).

## Issues found in generated code

- The first OpenSpec draft failed `openspec validate --strict` (requirements said "must" instead of MUST). The spec-writer agent fixed it.
- Step 2 left out the test for the same Director approving again with different casing and spaces, which the prompt asked for. Added on request; with case-sensitive comparison it fails, so it catches the bug.
- Mutation testing showed no test for an Approver or Admin starting an approval above 500,000, and an unreachable Director over-limit branch.
- Step 1 changed the Approve endpoint to Manager and Director but left Reject on Approver and Admin, so a Manager or Director can approve but not reject. Not changed in this PR.
- The review agent overstated its one finding (it said checks were missing that were there) and missed a second test with the same gap. Its findings were checked against the code before acting on them. A second review in the same chat did not re-read the code at all and reported a test run it never made.
- When asked to fix a spec validation error, the spec-writer agent reworded a requirement heading instead of restoring the one word that was wrong. Caught with `git diff` and not committed.

## Review

The `reviewer` agent ran `/review-pr` on `git diff main...HEAD`, then the workshop-style review prompt (findings by severity with a fix for each). Every finding and its verdict is in the PR description.

- [major] Duplicate-approver refusal tests do not check the invoice is unchanged. Fixed, in part. The claim was partly wrong: both tests already checked DecidedBy, DecidedAt and DecisionNote. FirstApprovedAt was set up and never checked in the same-Director-twice test, and also in the Manager-second test, which the review missed. Added both checks with the test-writer agent (commit 638fe80). Checked by breaking the service on purpose (overwriting FirstApprovedAt before refusing): 3 tests catch it now, only 1 did before. All 18 tests pass on the real code.
- Workshop review prompt, [medium] duplicate-approver refusal tests do not assert FirstApprovedAt and the other unchanged fields. Dismissed: already fixed, all three tests assert it. Copilot ran this in the same chat as the first review and made no tool calls, so it repeated the earlier finding and reported a test run it did not do.

## AI interaction log

- `records/ai-log/ai-log.jsonl`: one structured record per Copilot request (tool, model, agent and type, mode, prompt, prompt file, instructions, skills, subagents, MCP tools, tools and commands with results, files changed, decision, verification, outcome, commits, session and timing), plus manual steps.
- `records/ai-log/ai-log.md`: readable summary of the same records.
- `records/ai-log/human-notes.json`: decisions, verification and outcome per request, merged into the log.
- `records/ai-log/raw-events.jsonl` and `transcripts/`: raw hook events and full Copilot transcripts.

The hooks rebuild the log after every Copilot session (`tools/hooks/build-ai-log.mjs`). Requests on 24 Oct were trial runs while setting up the agents, prompts and hooks; their output was reverted and they are marked "discarded".

## Setup notes

- The projects target .NET 8. `backend/Directory.Build.props` allows running on a newer runtime.
- `nuget.config` restores packages from nuget.org only.
