---
name: mutation-testing
description: Run Stryker.NET on the Domain project, summarise killed and surviving mutants, and record the score. Use for mutation scores or to check test quality.
---

# Mutation testing

Stryker 4.13.0 is pinned in `dotnet-tools.json`. Newer versions need a newer runtime than .NET 8.

Run:

```
dotnet tool restore
cd backend/tests/InvoiceApp.Tests
dotnet stryker --project InvoiceApp.Domain.csproj --reporter cleartext --reporter html --reporter json
```

A run takes about a minute. Reports go to `backend/tests/InvoiceApp.Tests/StrykerOutput/<timestamp>/reports/`.

Summarise the newest report, from the repo root:

```
node .github/skills/mutation-testing/summarize.mjs
```

Add a line to `records/mutation/scores.md`:

```
- 2026-10-24, after step 2 (abc1234): 78.5% (killed 62, survived 9, no coverage 8). Survivors are message text changes.
```

For each surviving mutant in `ApprovalService.cs`, add a test that kills it or note why it cannot change behaviour. A surviving `<=` to `<` mutant means a boundary test is missing.
