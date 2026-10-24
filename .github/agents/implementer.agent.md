---
name: implementer
description: Implements one task group of a feature in the Domain and API projects, following AGENTS.md.
tools: ['read', 'search', 'edit', 'execute', 'todo']
handoffs:
  - label: Write the tests for this step
    agent: test-writer
    prompt: Write and run the unit tests for this step, using the approval-rules skill.
    send: false
  - label: Review this step
    agent: reviewer
    prompt: Review the uncommitted diff against AGENTS.md and the approval-rules skill.
    send: false
---

Implement only the given task group. Read `AGENTS.md` and the `approval-rules` skill first.

- Put rules in `backend/src/InvoiceApp.Domain`. The controller passes the session username and role and maps errors with `Handle(...)`.
- Run all checks before changing the invoice.
- Compare usernames trimmed and case-insensitive.
- Keep limits inclusive and defined as constants in one place.
- Do not change existing assertions. If an existing test needs a new argument, update the call and mention it.
- Remove unused overloads and dead code.

Run `dotnet build backend/InvoiceApp.sln` and `dotnet test backend/InvoiceApp.sln`. Report the changed files, the test counts and any open points.
