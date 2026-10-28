---
name: playwright-e2e
description: Write and run Playwright end-to-end tests for the invoice UI with page objects and role-based locators. Use when adding or fixing anything under e2e/.
---

# Playwright tests

- `e2e/playwright.config.ts` starts the API with `dotnet run` on http://localhost:5000, or reuses a running one.
- Tests go in `e2e/tests/*.spec.ts`, page objects in `e2e/pages/*.ts`, one per screen (login, invoices, approvals).
- Use `getByRole`, `getByLabel` and `getByText` only. Existing accessible names: `Approve invoice INV-1001`, `Submit invoice INV-1005 for approval`, the `Approvals` tab, and the `decision-error` alert.
- The store is in memory and shared. Each test creates its own invoice.

Required test: sign in as `demo.manager`, create and submit an invoice for 75,000, open Approvals, click Approve, expect the reason in the alert and the invoice still pending.

Run:

```
cd e2e
npm install
npx playwright install chromium
npm test
```

`npm run test:headed` shows the browser.
