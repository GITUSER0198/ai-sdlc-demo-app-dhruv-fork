---
description: Step 2 of approval limits. Two different approvers above 500,000, the second a Director, with refusal tests.
agent: implementer
---

Add the two-approver rule from `AGENTS.md`. The single-approver limits are already in place.

- Above 500,000, record the first approval (Manager or Director) and keep the invoice `PendingApproval`.
- Approve only when a different Director gives the second approval.
- Never count the same user twice. Compare usernames trimmed and case-insensitive.
- Leave every field unchanged on a refused second approval, including the first-approver fields.
- Add the demo user `demo.director2`.

Add the tests from the `approval-rules` skill for this rule: same Director twice, same Director with different casing and spaces, Manager as second approver. Assert the invoice is unchanged in every refusal test.

Run `dotnet test backend/InvoiceApp.sln`. Report the test counts and a commit message.
