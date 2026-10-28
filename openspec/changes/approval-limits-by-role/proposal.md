# Proposal

## Why

The invoice approval flow currently has no role-aware limits or guardrails, so managers and directors can approve amounts outside the intended policy. The current business rules need a single source of truth in the domain layer so approvals stay consistent across API and UI paths.

## What Changes

- Add a centralized role-based approval policy in the invoice domain layer.
- Enforce inclusive approval limits by role: Manager up to 50,000.00 and Director up to 500,000.00.
- Require two different approvers for amounts above 500,000.00, with the second approver required to be a Director and the invoice kept pending after the first approval.
- Reject duplicate approvers regardless of casing and surrounding whitespace.
- Refuse invalid approvals without mutating the invoice state or the original approval fields.
- Surface a clear refusal reason in the UI and API flow when a manager exceeds the approved amount.

## Capabilities

### New Capabilities
- `invoice-approval`: Domain-level invoice approval behavior, including role-based limits, duplicate-approver checks, and refusal safety rules.

### Modified Capabilities
- None.

## Impact

- Domain logic in `backend/src/InvoiceApp.Domain/ApprovalService.cs`
- API flow and login/session role handling in `backend/src/InvoiceApp.Api`
- Invoice approval tests in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs`
- UI message and browser validation in the invoice web client under `backend/src/InvoiceApp.Api/wwwroot/`
- Playwright end-to-end coverage in `e2e/`

## Open questions

- None at the planning stage. The rules in AGENTS.md are treated as the source of truth for the approval policy.
- Out of scope: bulk approval, partial approval, and notifications.
