#!/usr/bin/env node
// Prints the mutation score and per-file mutant counts from the newest Stryker report.
// Usage: node .github/skills/mutation-testing/summarize.mjs [path/to/StrykerOutput]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const outputRoot = process.argv[2] || join(repoRoot, 'backend', 'tests', 'InvoiceApp.Tests', 'StrykerOutput');

if (!existsSync(outputRoot)) {
  console.error(`No Stryker output at ${outputRoot}. Run dotnet stryker first.`);
  process.exit(1);
}

const latestRun = readdirSync(outputRoot).sort().at(-1);
const reportsDir = join(outputRoot, latestRun, 'reports');
const jsonPath = join(reportsDir, 'mutation-report.json');
const htmlPath = join(reportsDir, 'mutation-report.html');

let report;
if (existsSync(jsonPath)) {
  report = JSON.parse(readFileSync(jsonPath, 'utf8'));
} else {
  const html = readFileSync(htmlPath, 'utf8');
  const match = html.match(/app\.report = (\{[\s\S]*?\});?\s*<\/script>/) || html.match(/report = (\{[\s\S]*?\})\s*;?\s*\n/);
  if (!match) {
    console.error(`Could not read the report in ${htmlPath}. Re-run Stryker with --reporter json.`);
    process.exit(1);
  }
  report = JSON.parse(match[1]);
}

const totals = { Killed: 0, Survived: 0, NoCoverage: 0, Timeout: 0 };
console.log(`Run: ${latestRun}`);
for (const [file, entry] of Object.entries(report.files)) {
  const counts = {};
  for (const mutant of entry.mutants) counts[mutant.status] = (counts[mutant.status] || 0) + 1;
  for (const key of Object.keys(totals)) totals[key] += counts[key] || 0;
  if (entry.mutants.length) console.log(`  ${basename(file).padEnd(24)} ${JSON.stringify(counts)}`);
}

const detected = totals.Killed + totals.Timeout;
const valid = detected + totals.Survived + totals.NoCoverage;
const score = valid ? ((detected / valid) * 100).toFixed(2) : 'n/a';
console.log(`Score: ${score}%  (killed ${totals.Killed}, timeout ${totals.Timeout}, survived ${totals.Survived}, no coverage ${totals.NoCoverage})`);
