---
name: pr-review
description: Checklist and output format for reviewing a diff or pull request in this repo, and the verdict format for each finding. Use when reviewing code or writing up review results.
---

# Code review

## Checklist

1. Amount, role or approver checks in a controller, `Program.cs` or `wwwroot`. They belong in the Domain.
2. Refused approvals that change the invoice. Look for assignments before the last check.
3. The same user approving twice through casing, spaces or a role change.
4. Inclusive limits, with a test at each limit and one cent above.
5. Role taken from the session, not the request.
6. Tests that would still pass without their rule. Refusal tests must assert the fields, not only the exception.
7. Naming, one test class per class, page objects and role locators in e2e, no magic numbers.
8. Secrets, endpoints without sign-in, missing `[RequireRole]`.

## Findings format

One numbered line per finding, most severe first:

```
1. [major] backend/src/InvoiceApp.Domain/ApprovalService.cs:42 - Status is set before the limit check. Move the check above the assignment.
```

Severity: blocker, major, minor or nit. End with the test result, e.g. `dotnet test: 24 passed`.

## Verdicts

One line per finding in the PR description:

```
1. Fixed in abc1234.
2. Dismissed: the step 1 refusal above 500,000 is replaced in step 2.
3. Deferred: out of scope for this change.
```

Dismissed and deferred need a reason.
