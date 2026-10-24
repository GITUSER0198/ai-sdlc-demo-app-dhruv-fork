#!/usr/bin/env node
// Copilot postToolUse hook: runs `dotnet format whitespace` on the C# files an agent just edited.
// Usage (from .github/hooks/ai-log.json): node tools/hooks/format-csharp.mjs

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// Tool inputs differ per tool (filePath, path, files[]...), so collect every string that names a .cs file.
function findCSharpPaths(value, found = new Set()) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return findCSharpPaths(JSON.parse(trimmed), found); } catch { /* not JSON */ }
    }
    for (const match of trimmed.matchAll(/[^\s"'*?<>|]+\.cs\b/g)) found.add(match[0]);
  } else if (Array.isArray(value)) {
    value.forEach((item) => findCSharpPaths(item, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => findCSharpPaths(item, found));
  }
  return found;
}

try {
  const payload = JSON.parse(readStdin() || '{}');
  const toolInput = payload.toolArgs ?? payload.tool_input ?? payload.toolInput ?? {};
  const files = [...findCSharpPaths(toolInput)]
    .map((path) => (isAbsolute(path) ? path : join(repoRoot, path)))
    .filter((path) => existsSync(path))
    .map((path) => relative(repoRoot, path));

  if (files.length > 0) {
    spawnSync('dotnet', ['format', 'whitespace', '--folder', '--include', ...files], {
      cwd: repoRoot,
      stdio: 'ignore',
      timeout: 60_000,
      shell: process.platform === 'win32',
    });
  }
} catch (error) {
  process.stderr.write(`format hook skipped: ${error.message}\n`);
}
process.exit(0);
