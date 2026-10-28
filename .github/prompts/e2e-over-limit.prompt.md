---
description: Add the Playwright test for a refused over-limit approval in the UI.
agent: test-writer
---

Add one test in `e2e/tests/approval-limits.spec.ts` with page objects in `e2e/pages/`, following the `playwright-e2e` skill.

A Manager signs in, creates and submits an invoice for 75,000, tries to approve it on the Approvals tab, sees the reason in the alert, and the invoice stays pending.

Use role-based locators only. Run `cd e2e && npm test` and report the result. If the UI does not show the reason, make the smallest change in `wwwroot/app.js` and report it.
