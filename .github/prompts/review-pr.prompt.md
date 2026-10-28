---
description: Review this branch against main and list the findings.
agent: reviewer
---

Review `git diff main...HEAD` using the `pr-review` skill and `AGENTS.md`.

Focus on the same user approving twice, refused approvals that change the invoice, tests that would pass without their rule, and rule logic in controllers or the UI.

List the findings in the `pr-review` format, most severe first, then the test result. Do not edit files.
