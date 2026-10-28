#!/usr/bin/env node
// Copilot hook: appends each agent event to records/ai-log/raw-events.jsonl, copies the session
// transcript on stop, and rebuilds the structured log (ai-log.jsonl, ai-log.md) with build-ai-log.mjs.
// Usage (from .github/hooks/ai-log.json): node tools/hooks/ai-log.mjs <eventName>

import { appendFileSync, mkdirSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const hooksDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(hooksDir, '..', '..');
const logDir = join(repoRoot, 'records', 'ai-log');
const rawEventsPath = join(logDir, 'raw-events.jsonl');
const transcriptDir = join(logDir, 'transcripts');
const maxFieldLength = 1500;

const eventName = process.argv[2] || 'unknown';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parsePayload(text) {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function truncate(value) {
  if (value === undefined || value === null) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > maxFieldLength ? `${text.slice(0, maxFieldLength)}... [${text.length} chars]` : text;
}

// VS Code and the Copilot CLI name the same fields differently; read whichever is present.
function pick(payload, ...keys) {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') return payload[key];
  }
  return null;
}

function toRecord(payload) {
  return {
    timestamp: new Date().toISOString(),
    event: eventName,
    sessionId: pick(payload, 'sessionId', 'session_id'),
    agent: pick(payload, 'agentName', 'agent_name', 'agent', 'subagentName', 'subagent_type'),
    prompt: truncate(pick(payload, 'prompt', 'userPrompt', 'user_prompt')),
    tool: pick(payload, 'toolName', 'tool_name'),
    toolInput: truncate(pick(payload, 'toolArgs', 'tool_input', 'toolInput')),
    toolResult: truncate(pick(payload, 'toolResult', 'tool_response', 'toolResponse')),
    reason: truncate(pick(payload, 'reason', 'stopReason', 'stop_reason', 'error')),
    transcript: pick(payload, 'transcript_path', 'transcriptPath'),
  };
}

// The hook payload only points at the session transcript; keep a copy so replies are logged too.
function copyTranscript(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return;
  mkdirSync(transcriptDir, { recursive: true });
  copyFileSync(transcriptPath, join(transcriptDir, basename(transcriptPath)));
}

try {
  mkdirSync(logDir, { recursive: true });
  const record = toRecord(parsePayload(readStdin()));
  appendFileSync(rawEventsPath, `${JSON.stringify(record)}\n`, { encoding: 'utf8' });
  if (['agentStop', 'sessionEnd', 'subagentStop'].includes(eventName)) {
    copyTranscript(record.transcript);
    spawnSync(process.execPath, [join(hooksDir, 'build-ai-log.mjs')], { cwd: repoRoot, stdio: 'ignore', timeout: 20_000 });
  }
} catch (error) {
  // A logging failure must never block the agent.
  process.stderr.write(`ai-log hook failed: ${error.message}\n`);
}
process.exit(0);
