---
description: Step 1 of approval limits. Manager and Director single-approver limits with unit tests.
agent: implementer
---

Implement the single-approver part of the approval limits in `AGENTS.md` and the OpenSpec tasks for this change.

- Add the `Manager` and `Director` roles and the demo users `demo.manager` and `demo.director` (same password as the other demo users).
- Pass the signed-in username and role from the approve endpoint to `ApprovalService`.
- Manager limit 50,000, Director limit 500,000, both inclusive. Refuse anything else with a reason and leave the invoice unchanged.
- Allow approvals for Manager and Director only.
- Refuse amounts above 500,000 for now. The two-approver rule is the next step.
- Add the unit tests from the `approval-rules` skill for these cases.

Run `dotnet test backend/InvoiceApp.sln`. Report the test counts, the changed files and a commit message (short subject, one line on why).
