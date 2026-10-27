# Mutation scores

Stryker.NET 4.13.0 on `InvoiceApp.Domain`, run from `backend/tests/InvoiceApp.Tests` with `dotnet stryker --project InvoiceApp.Domain.csproj`.

## Before

- 2026-10-24, upstream main (66cb3f9), 7 tests: 30.77% (killed 12, survived 10, no coverage 17).
  - ApprovalService.cs: 12 killed, 8 survived.
  - DiscountCalculator.cs: 17 not covered (no tests).
  - Invoice.cs: 2 survived.

## After

- 2026-10-27, after the e2e commit (b44dfcc), 18 tests: 56.70% (killed 55, survived 19, no coverage 23).
  - ApprovalService.cs: 55 killed, 17 survived, 6 not covered (70.5% for this file).
  - DiscountCalculator.cs: 17 not covered (no tests, not part of this change).
  - Invoice.cs: 2 survived.

Surviving or uncovered in ApprovalService.cs:

- Removing the role check on the first approval above 500,000 survives. No test covers an Approver or Admin starting a large approval.
- The Director over-limit branch in the single-approver check is unreachable now that amounts above 500,000 take the two-approver path, so its mutants are not covered.
- Removing `_repository.Update(...)` survives because `FakeInvoiceRepository.Update` does nothing.
- Message text changes survive because the tests check only part of each message.
