#!/usr/bin/env node
// Builds the structured AI log from VS Code's Copilot chat session store.
//   records/ai-log/ai-log.jsonl  one record per Copilot request, plus manual entries
//   records/ai-log/ai-log.md     readable summary
// Human decisions, verification, outcome and commits come from records/ai-log/human-notes.json.
// Run by the agentStop hook, or by hand: node tools/hooks/build-ai-log.mjs [chatSessionsDir]

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const logDir = join(repoRoot, 'records', 'ai-log');
const rawEventsPath = join(logDir, 'raw-events.jsonl');
const notesPath = join(logDir, 'human-notes.json');
const context = 'AI in SDLC assignment: approval limits by role';

// The session store sits next to the transcripts whose paths the hooks recorded.
function findChatSessionsDir() {
  if (process.argv[2]) return process.argv[2];
  if (!existsSync(rawEventsPath)) return null;
  for (const line of readFileSync(rawEventsPath, 'utf8').split('\n').reverse()) {
    const match = line.match(/"transcript":"([^"]+)"/);
    if (!match) continue;
    const transcript = JSON.parse(`"${match[1]}"`);
    const dir = join(dirname(transcript), '..', '..', 'chatSessions');
    if (existsSync(dir)) return dir;
  }
  return null;
}

// VS Code stores each session as an initial snapshot followed by set (1), append (2) and delete (3) operations.
function loadSession(file) {
  let state = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    if (entry.kind === 0) { state = entry.v; continue; }
    let target = state;
    for (const key of entry.k.slice(0, -1)) target = target[key];
    const last = entry.k[entry.k.length - 1];
    if (entry.kind === 1) target[last] = entry.v;
    else if (entry.kind === 2) {
      const list = target[last];
      if (entry.i !== undefined) list.length = entry.i;
      list.push(...(entry.v || []));
    } else if (entry.kind === 3) delete target[last];
  }
  return state;
}

function toRepoPath(fsPath) {
  if (!fsPath) return null;
  const clean = decodeURIComponent(String(fsPath).replace(/^file:\/\/\/?/, '')).replace(/^\/([a-zA-Z]:)/, '$1');
  const rel = relative(repoRoot, clean);
  if (!rel.startsWith('..') && !/^[a-zA-Z]:/.test(rel)) return rel.split(sep).join('/');
  return clean.replace(homedir(), '~').split(sep).join('/');
}

function isIncludeOnly(repoPath) {
  const file = join(repoRoot, repoPath);
  if (!existsSync(file)) return false;
  return /^@\S+$/.test(readFileSync(file, 'utf8').trim());
}

function uriPath(uri) {
  return uri?.fsPath || uri?.path || uri?.external || null;
}

function stageFor(text, agentName) {
  if (/^\/context-check/.test(text)) return 'context';
  if (/^\/opsx-|openspec/i.test(text) || agentName === 'spec-writer') return 'specification';
  if (/^\/step[12]/.test(text) || agentName === 'implementer') return 'implementation';
  if (/^\/(e2e|mutation)/.test(text) || agentName === 'test-writer') return 'testing';
  if (/^\/review|review/i.test(text) || agentName === 'reviewer') return 'review';
  return 'question';
}

function slug(text) {
  return text.replace(/^\//, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 5).join('-') || 'request';
}

function stripCd(command) {
  return command.replace(/^cd\s+"[^"]*"\s*[;&]+\s*/i, '').trim();
}

function testSummary(text) {
  const lines = String(text).replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/);
  // Skip diff lines (+/-), which can quote these phrases from source code.
  const hits = lines.filter((l) => !/^[+-]/.test(l) && /^(Passed!|Failed!)|^\s*\d+ (passed|failed)|final mutation score|is valid|has issues/i.test(l.trim()));
  return hits.map((l) => l.trim().replace(/\s+-\s+InvoiceApp\.Tests\.dll.*$/, '')).slice(-3);
}

function buildRecord(sessionId, index, request, notes) {
  const text = (request.message?.text || '').trim();
  const mode = request.modeInfo?.kind || 'agent';
  const builtIn = request.modeInfo?.isBuiltin !== false;
  const agentFile = uriPath(request.modeInfo?.modeInstructions?.uri);
  const agentName = builtIn ? mode : String(agentFile).split(/[\\/]/).pop().replace(/\.agent\.md$/, '');
  const [modelName, credits] = String(request.result?.details || '').split(' • ');
  const timestamp = new Date(request.timestamp).toISOString().replace(/\.\d+Z$/, 'Z');
  const response = request.response || [];
  const toolCalls = response.filter((item) => item.kind === 'toolInvocationSerialized');

  const toolCounts = {};
  for (const call of toolCalls) toolCounts[call.toolId] = (toolCounts[call.toolId] || 0) + 1;

  const promptFiles = (request.variableData?.variables || []).filter((v) => v.kind === 'promptFile').map((v) => toRepoPath(uriPath(v.value)) || v.name);
  const promptFile = promptFiles.find((p) => /\.prompt\.md$/.test(p)) || null;
  // Project instruction files only: skip personal files outside the repo, and files that only @-include another one.
  const instructions = [...new Set(promptFiles.filter((p) => !/\.prompt\.md$/.test(p) && !/^([a-z]:|~)\//i.test(p) && !isIncludeOnly(p)))];
  if (agentFile && !builtIn) instructions.push(toRepoPath(agentFile));

  const skills = [];
  for (const call of toolCalls) {
    const message = JSON.stringify(call.pastTenseMessage || call.invocationMessage || '');
    const match = message.match(/\.github\/skills\/([^/]+)\/SKILL\.md/);
    if (match && !skills.some((s) => s.name === match[1])) {
      skills.push({
        name: match[1],
        type: match[1].startsWith('openspec-') ? 'third-party (OpenSpec)' : 'custom',
        purpose: notes.skillPurpose?.[match[1]] || null,
        invocation: text.includes(match[1]) ? 'explicit' : 'automatic',
      });
    }
  }

  const subagents = toolCalls
    .filter((call) => call.toolSpecificData?.kind === 'subagent')
    .map((call) => ({
      name: call.toolSpecificData.agentName,
      type: 'custom',
      task: call.toolSpecificData.description,
      status: call.isComplete ? 'completed' : 'incomplete',
    }));

  const mcpTools = toolCalls
    .filter((call) => /^mcp_/.test(call.toolId))
    .map((call) => ({ server: call.toolId.split('_')[1], tool: call.toolId, purpose: null }));

  const commands = toolCalls
    .filter((call) => call.toolSpecificData?.kind === 'terminal')
    .map((call) => {
      const output = (call.resultDetails?.output || []).map((o) => o.value || '').join('\n') || call.toolSpecificData?.terminalCommandOutput?.text || '';
      return {
        command: stripCd(call.toolSpecificData.commandLine?.original || call.resultDetails?.input || ''),
        exit_code: call.toolSpecificData.terminalCommandState?.exitCode ?? null,
        result: testSummary(output),
      };
    });

  const filesChanged = [...new Set(response.filter((item) => item.kind === 'textEditGroup').map((item) => toRepoPath(uriPath(item.uri))).filter(Boolean))];
  const reply = response.filter((item) => item.kind === undefined && typeof item.value === 'string').map((item) => item.value).join('').trim();

  const note = notes.requests?.[`${sessionId}#${index}`] || notes.requests?.[sessionId] || {};
  const failed = Boolean(request.result?.errorDetails);
  return {
    id: `${timestamp.replace(/[-:]/g, '')}-${agentName}-${slug(text)}`,
    timestamp,
    stage: note.stage || stageFor(text, agentName),
    agent: 'copilot-chat',
    agent_name: agentName,
    agent_type: builtIn ? 'built-in' : 'custom',
    ai_tool: 'GitHub Copilot Chat (VS Code)',
    model: modelName || null,
    model_selection: request.modelId || null,
    mode,
    related_ids: note.related_ids || [],
    parent_task: note.parent_task || null,
    context,
    request: text,
    prompt_file: promptFile,
    custom_instructions: instructions,
    skills_used: skills,
    subagents_used: subagents,
    mcp_tools_used: mcpTools,
    tools_used: Object.keys(toolCounts),
    tool_call_counts: toolCounts,
    commands_run: commands,
    files_changed: filesChanged,
    response_summary: reply.length > 600 ? `${reply.slice(0, 600)}...` : reply,
    suggestion: note.suggestion || null,
    human_decision: note.human_decision || null,
    action_verification: note.action_verification || null,
    limitation: note.limitation || null,
    status: note.status || (failed ? 'failed' : 'completed'),
    artifacts: note.artifacts || filesChanged,
    commits: note.commits || [],
    session: { id: sessionId, request_index: index, elapsed_ms: request.elapsedMs ?? null, credits: credits || null, prompt_tokens: request.promptTokens ?? null, completion_tokens: request.completionTokens ?? null },
  };
}

function manualRecord(entry) {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    stage: entry.stage,
    // No AI involved: say so explicitly rather than leaving the fields blank.
    agent: 'manual',
    agent_name: 'developer',
    agent_type: 'manual',
    ai_tool: 'none',
    model: 'none',
    mode: 'manual',
    related_ids: entry.related_ids || [],
    parent_task: entry.parent_task || null,
    context,
    request: entry.request,
    skills_used: [],
    subagents_used: [],
    mcp_tools_used: [],
    tools_used: entry.tools_used || [],
    commands_run: entry.commands_run || [],
    files_changed: entry.files_changed || [],
    suggestion: entry.suggestion || null,
    human_decision: entry.human_decision || null,
    action_verification: entry.action_verification || null,
    limitation: entry.limitation || null,
    status: entry.status || 'completed',
    artifacts: entry.artifacts || [],
    commits: entry.commits || [],
  };
}

function line(label, value) {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || value === '') return null;
  return `- ${label}: ${Array.isArray(value) ? value.join(', ') : value}`;
}

function summary(records) {
  const copilot = records.filter((r) => r.agent === 'copilot-chat');
  const count = (key) => {
    const tally = {};
    for (const r of copilot) tally[r[key] ?? 'unknown'] = (tally[r[key] ?? 'unknown'] || 0) + 1;
    return Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ');
  };
  const out = [
    '# AI interaction log',
    '',
    'Readable view of `ai-log.jsonl`, built by `tools/hooks/build-ai-log.mjs` from the Copilot chat sessions and `human-notes.json`. Transcripts of each session are in `transcripts/`.',
    '',
    '## Overview',
    '',
    `- Copilot requests: ${copilot.length}. Manual entries: ${records.length - copilot.length}.`,
    `- Tool: GitHub Copilot Chat in VS Code (Copilot Free, model selection "Auto").`,
    `- Models picked by Auto: ${count('model')}.`,
    `- Agents: ${count('agent_name')}.`,
    `- Modes: ${count('mode')}.`,
    `- Outcomes: ${(() => { const t = {}; for (const r of records) t[r.status] = (t[r.status] || 0) + 1; return Object.entries(t).map(([k, v]) => `${k} ${v}`).join(', '); })()}.`,
    '',
    '## Entries',
  ];
  for (const r of records) {
    const who = r.agent === 'manual' ? 'manual step' : `${r.agent_name} (${r.agent_type}, ${r.mode} mode, ${r.model || 'model n/a'})`;
    out.push('', `### ${r.timestamp.replace('T', ' ').replace('Z', ' UTC')}, ${r.stage}: ${who}`, '');
    const commands = (r.commands_run || []).map((c) => `\`${c.command}\`${c.exit_code !== null && c.exit_code !== undefined ? ` (exit ${c.exit_code})` : ''}${c.result?.length ? `: ${c.result.join('; ')}` : ''}`);
    for (const item of [
      line('Request', r.request ? r.request.replace(/\s+/g, ' ').slice(0, 300) : null),
      line('Prompt file', r.prompt_file),
      line('Instructions', r.custom_instructions),
      line('Skills', (r.skills_used || []).map((s) => `${s.name} (${s.invocation})`)),
      line('Subagents', (r.subagents_used || []).map((s) => `${s.name}: ${s.task} (${s.status})`)),
      line('MCP tools', (r.mcp_tools_used || []).map((m) => m.tool)),
      line('Tools', r.tool_call_counts ? Object.entries(r.tool_call_counts).map(([k, v]) => `${k} x${v}`) : r.tools_used),
      line('Commands', commands),
      line('Files changed', r.files_changed),
      line('Suggestion', r.suggestion),
      line('Outcome', r.status),
      line('Human decision', r.human_decision),
      line('Verification', r.action_verification),
      line('Limitation', r.limitation),
      line('Commits', r.commits),
      line('Related', r.related_ids),
      r.session ? line('Session', `${r.session.id.slice(0, 8)} #${r.session.request_index}, ${Math.round((r.session.elapsed_ms || 0) / 1000)} s, ${r.session.credits || 'n/a'}, ${r.session.prompt_tokens ?? '?'} prompt / ${r.session.completion_tokens ?? '?'} completion tokens`) : null,
    ]) if (item) out.push(item);
  }
  out.push('');
  return out.join('\n');
}

const notes = existsSync(notesPath) ? JSON.parse(readFileSync(notesPath, 'utf8')) : {};
const sessionsDir = findChatSessionsDir();
const records = [];
if (sessionsDir) {
  for (const file of readdirSync(sessionsDir).filter((f) => f.endsWith('.jsonl'))) {
    const sessionId = file.replace(/\.jsonl$/, '');
    const session = loadSession(join(sessionsDir, file));
    (session?.requests || []).forEach((request, index) => {
      if (notes.exclude?.includes(`${sessionId}#${index}`)) return;
      records.push(buildRecord(sessionId, index, request, notes));
    });
  }
}
for (const entry of notes.manual || []) records.push(manualRecord(entry));
records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

writeFileSync(join(logDir, 'ai-log.jsonl'), records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
writeFileSync(join(logDir, 'ai-log.md'), summary(records), 'utf8');
console.log(`ai-log: ${records.length} records${sessionsDir ? '' : ' (chat session store not found)'}`);
