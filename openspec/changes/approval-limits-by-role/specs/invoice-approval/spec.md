# Spec Delta

## Purpose

The invoice approval capability enforces the approval policy by role, keeps approval decisions safe and auditable, and prevents invalid approvals from mutating invoices.

## ADDED Requirements

### Requirement: Role-based approval limits

The approval service MUST enforce the policy for invoice amounts based on the signed-in approver role.

#### Scenario: Manager approval within the manager limit
- **WHEN** the approver role is Manager and the invoice amount is 50,000.00 or less
- **THEN** the approval succeeds and the invoice is marked Approved.

#### Scenario: Manager approval above the manager limit
- **WHEN** the approver role is Manager and the invoice amount is 50,000.01 or more
- **THEN** the approval is refused with a reason and the invoice remains in PendingApproval with its prior state unchanged.

#### Scenario: Director approval within the director limit
- **WHEN** the approver role is Director and the invoice amount is 500,000.00 or less
- **THEN** the approval succeeds and the invoice is marked Approved.

#### Scenario: Director approval above the director limit
- **WHEN** the approver role is Director and the invoice amount is 500,000.01 or more
- **THEN** the approval requires a second approver and the invoice remains PendingApproval after the first approval until a valid second Director approves it.

#### Scenario: Second approver is required above 500,000.00
- **WHEN** an invoice exceeds 500,000.00 and the first approval has been recorded
- **THEN** a second approval is required from a different approver and the second approver must have the Director role.

#### Scenario: Same approver is rejected regardless of username formatting
- **WHEN** the same approver username is supplied with different casing or surrounding spaces as another approval attempt
- **THEN** the approval is refused as a duplicate approver and the invoice remains unchanged.

#### Scenario: Role without an approval limit cannot approve
- **WHEN** the signed-in role is Approver or Admin
- **THEN** the system refuses the approval because those roles do not have an approval limit.

### Requirement: Refused approvals do not mutate invoice state

Invalid approval attempts MUST leave the invoice data intact.

#### Scenario: Payment amount at the manager boundary
- **WHEN** the invoice amount is exactly 50,000.00
- **THEN** the approval is accepted for a Manager.

#### Scenario: Payment amount just above the manager boundary
- **WHEN** the invoice amount is 50,000.01
- **THEN** the approval is refused and the invoice remains PendingApproval with the original DecidedBy, DecidedAt, DecisionNote, and first-approver values unchanged.

#### Scenario: Payment amount at the director boundary
- **WHEN** the invoice amount is exactly 500,000.00
- **THEN** a Director approval is accepted.

#### Scenario: Payment amount just above the director boundary
- **WHEN** the invoice amount is 500,000.01
- **THEN** a Director approval can only proceed with a second distinct Director approver and the invoice does not move to Approved until that second approval is valid.

#### Scenario: Same person with different capital letters is treated as the same approver
- **WHEN** a first approval is recorded by username `demo.director` and the second attempt is submitted by `DEMO.DIRECTOR`
- **THEN** the approval is refused as the same approver and the invoice remains PendingApproval with no state mutation.

### Requirement: Approval checks are role-based and session-driven

The system MUST use the signed-in session role instead of trusting the request payload for authorization.

#### Scenario: Role comes from the session
- **WHEN** the request includes a role that differs from the signed-in session user
- **THEN** the domain approval check uses the session role and does not allow an approval based on a mismatched request value.

#### Scenario: Invalid inputs produce a reason and no mutation
- **WHEN** the approval is rejected for any policy reason
- **THEN** the service returns a failure reason and the invoice remains unchanged.
