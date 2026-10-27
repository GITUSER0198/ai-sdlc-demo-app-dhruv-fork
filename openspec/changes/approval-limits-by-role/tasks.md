# Tasks

## 1. Single-approver limits

- [x] 1.1 Add the Manager and Director inclusive approval limits and centralize role validation in `ApprovalService`; verify by running `dotnet test backend/InvoiceApp.sln --filter "ApprovalServiceTests"`.
- [x] 1.2 Add approval-limit boundary tests for 50,000.00, 50,000.01, 500,000.00, and 500,000.01; verify the same test suite passes.
- [x] 1.3 Add refusal and unchanged-state assertions for invalid approvals; verify the tests confirm `Status`, `DecidedBy`, `DecidedAt`, `DecisionNote`, and first-approver fields remain unchanged.

## 2. Two-approver rule

- [ ] 2.1 Enforce the two-approver requirement above 500,000.00 and require a second approver to be a Director; verify with dedicated xUnit tests for the duplicate and role mismatch cases.
- [ ] 2.2 Normalize approver usernames using trimmed, case-insensitive comparison to prevent the same user from counting twice; verify with tests covering the same username in different casing and with whitespace.
- [ ] 2.3 Keep the invoice in `PendingApproval` after the first approval when the second approver requirement is unmet; verify by asserting the invoice status and fields remain pending and unchanged.

## 3. UI and end-to-end verification

- [ ] 3.1 Update the invoice approval UI and API message flow so a Manager attempting more than 50,000.00 sees a clear refusal reason without changing invoice state; verify by running the relevant API or UI tests.
- [ ] 3.2 Add a Playwright scenario that asserts a Manager approval above 50,000.00 shows the reason and leaves the invoice pending; verify with `cd e2e && npm test`.
