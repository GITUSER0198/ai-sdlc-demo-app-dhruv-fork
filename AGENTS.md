# Project conventions for AI agents

Invoice approval demo app: ASP.NET Core 8 Web API with a small static web UI.

## Layout

- `backend/src/InvoiceApp.Domain`: business rules, no web or storage code. `ApprovalService` owns the invoice lifecycle (Draft, PendingApproval, Approved, Rejected).
- `backend/src/InvoiceApp.Api`: controllers, sign-in (`Auth/`), in-memory repository, and the web UI under `wwwroot/`.
- `backend/tests/InvoiceApp.Tests`: xUnit tests, one test class per class under test, named `<ClassUnderTest>Tests`.
- `e2e`: Playwright end-to-end tests (`tests/`) and page objects (`pages/`).
- `docs/use-cases`: short briefs for features we may build.
- `openspec`: specs and task lists, written before the code.

## Approval limits

- A Manager may approve invoices up to 50,000. A Director may approve up to 500,000. Limits are inclusive.
- Above 500,000 an invoice needs two different approvers and the second must be a Director. It stays PendingApproval after the first approval.
- The same user never counts as both approvers. Compare usernames trimmed and case-insensitive.
- A refused approval returns a reason and changes nothing on the invoice.
- Roles without a limit (Approver, Admin) cannot approve.
- The role comes from the session, not the request. All checks go in `ApprovalService`.
- Run every check before changing the invoice. The repositories return the stored instance, so a field set before an exception stays changed.

## Conventions

- Controllers live in `Controllers/`, one per resource, route `api/[controller]`. Request bodies are `record` types declared inside the controller.
- Controllers inherit `ApiControllerBase` and use `Handle(...)` so service errors map to 404, 409 and 400.
- Every endpoint is behind sign-in. Restrict actions with `[RequireRole("...")]`: destructive actions are Admin only, approvals are Manager or Director.
- Business rules go in the Domain project, never in controllers.
- Register services in `Program.cs`. Repositories are interfaces in Domain with an in-memory implementation in Api.
- Keep approval limits as named constants in one place.
- Every new rule or endpoint needs tests. Use `FakeInvoiceRepository` in tests.
- Use clear names; no one-letter variables or `flag` parameters.
- End-to-end tests use page objects and role-based locators (`getByRole`, `getByLabel`), never CSS or XPath selectors.

## Tests for approval limits

- At least one test per rule.
- Test each limit at the boundary and one cent above.
- Test the same approver twice, including different casing and surrounding spaces.
- After a refused approval, assert that `Status`, `DecidedBy`, `DecidedAt`, `DecisionNote` and the first-approver fields are unchanged.
- One Playwright test: a Manager approving more than 50,000 sees the reason and the invoice stays pending.

## Commands

- Run the app: `dotnet run --project backend/src/InvoiceApp.Api` then open http://localhost:5000
- Run the tests: `dotnet test backend/InvoiceApp.sln`
- Run end-to-end tests: `cd e2e && npm install && npx playwright install chromium && npm test`
- Run mutation tests: `dotnet tool restore`, then `cd backend/tests/InvoiceApp.Tests && dotnet stryker --project InvoiceApp.Domain.csproj`

## Demo accounts (not real credentials)

- `demo.approver` / `ChangeMe123!` (role Approver)
- `demo.admin` / `ChangeMe123!` (role Admin)
- `demo.manager`, `demo.director`, `demo.director2` / `ChangeMe123!` (roles Manager, Director, Director), added with approval limits.

## Workflow

- Write the spec in `openspec` first.
- Build in steps, one commit each: single-approver limits, two-approver rule, UI message with the Playwright test.
- Commit messages: short subject, then a line on why.

## Reviews

- List each finding with severity (blocker, major, minor, nit), file and line, the problem and a fix.
- Check for rules in controllers or the UI, refused approvals that change the invoice, the same user approving twice, boundary handling, and tests that still pass without their rule.

## Never

- Commit real credentials, tokens or customer data.
- Add business logic to `Program.cs` or controllers.
- Weaken or delete a failing test to make a change pass.
