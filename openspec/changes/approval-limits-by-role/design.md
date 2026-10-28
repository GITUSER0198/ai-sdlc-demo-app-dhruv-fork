# Design

## Context

The approval rules already live in the domain layer, and the `ApprovalService` is the single place where invoice lifecycle and role-based decisions should be enforced. Session-based role data is supplied by the API layer and must not be reinterpreted by controllers or UI logic.

## Goals / Non-Goals

**Goals:**
- Centralize all invoice approval policy checks in the domain service.
- Enforce inclusive limits and second-approver requirements at the business rule level.
- Prevent invalid approvals from mutating invoice data.
- Keep the API and UI behavior aligned with the same authorization rules.

**Non-Goals:**
- Bulk approval workflows.
- Partial approvals or split decisions.
- Notifications or auditing beyond current invoice state fields.

## Decisions

- Use a single `ApprovalService` validation flow for every approval decision, so the same checks run for all callers and no controller-specific logic diverges.
- Canonicalize approver usernames with `Trim()` and a case-insensitive comparison before evaluating duplicates or the second approver requirement.
- Keep the first approval as the authoritative threshold check and then apply the second-approver rule only when the amount exceeds 500,000.00; this preserves current invoice state semantics while allowing a pending approval to complete legally.
- Refuse invalid approval attempts before any invoice state mutation, returning a reason and leaving the existing `Status`, `DecidedBy`, `DecidedAt`, `DecisionNote`, and first-approver fields unchanged.
- Treat Manager and Director limits as inclusive constants so 50,000.00 and 500,000.00 are valid boundary values, while 50,000.01 and 500,000.01 require the higher rule path.

## Risks / Trade-offs

- [Role spoofing from request objects] → Mitigation: validate against the signed-in session role only, not request-supplied values.
- [Duplicate approver detection across formatting differences] → Mitigation: normalize usernames before comparing and reject same-user approvals consistently.
- [Two-step approval above 500,000.00] → Mitigation: keep the first approval pending and require a second distinct Director before clearing the invoice to Approved.

## Migration Plan

- No data migration is needed. The rule enforcement is additive and scoped to the invoice approval lifecycle already managed by `ApprovalService`.
- Existing invoice states remain compatible with the new validation because the checks only gate transitions for pending invoices.

## Open Questions

- None at this stage. Bulk and partial approval remain explicitly out of scope for this change.
