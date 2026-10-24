---
name: approval-rules
description: Role-based invoice approval limits (Manager 50,000, Director 500,000, two different approvers above 500,000 with a Director second) and the tests that cover them. Use when changing, testing or reviewing ApprovalService or the approve endpoint.
---

# Approval limits

Rules are in `AGENTS.md` under "Approval limits".

## Outcomes

- Up to 50,000, Manager or Director: approved.
- 50,000.01 to 500,000, Manager: refused, over the Manager limit.
- 50,000.01 to 500,000, Director: approved.
- Above 500,000, first approval by a Manager or Director: pending, first approver recorded.
- Above 500,000, second approval by a different Director: approved.
- Above 500,000, second approval by a Manager: refused, second approver must be a Director.
- Above 500,000, second approval by the same user (any casing or spacing): refused.
- Approver or Admin role: refused, no limit for the role.

## Common mistakes

- Setting `Status` or `DecidedBy` before a check that throws.
- Comparing usernames with `==` instead of `string.Equals(a.Trim(), b.Trim(), StringComparison.OrdinalIgnoreCase)`.
- `<` instead of `<=` at a limit.
- Checking the second approver against an amount limit instead of the Director role.
- Reading the role from the request body.
- Treating a role without a limit as unlimited.

## Required tests

- Manager approves 50,000.00: approved.
- Manager approves 50,000.01: refused, invoice unchanged.
- Director approves 500,000.00: approved.
- Director approves 500,000.01 alone: pending, first approver recorded.
- Manager first, Director second on 800,000: approved, both recorded.
- Director first, Manager second on 800,000: refused, invoice unchanged.
- Same Director twice on 800,000: refused, invoice unchanged.
- Same Director with different casing or spaces: refused.
- Approver or Admin approves: refused.
- Refusal message names the role, limit or amount.

"Invoice unchanged" means `Status`, `DecidedBy`, `DecidedAt`, `DecisionNote` and the first-approver fields equal their values before the call.
