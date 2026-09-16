// agent-loop.mjs — the coding agent's ReAct loop, talking DIRECTLY to
// Ollama (never the fold proxy). The proxy's /v1/chat/completions runs a
// grounded reading turn with no tool-calling or file-editing capability at
// all (proxy-runner.mjs has no tool machinery); a real coding agent is new
// code, built here, over this repo's actual filesystem.
//
// Protocol: see tool-parser.mjs's header for why an explicit fenced-JSON
// format is the primary (and only) mechanism, not Ollama's native `tools`
// API param.
//
// Turn cap: AGENT_MAX_TURNS bounds the loop the same way proxy-runner.mjs
// bounds its own web-gather loop (WEB_MAX_PAGES) and code-loop.js bounds
// its round count — a disclosed ceiling, never a silent/unbounded loop.

import { parseToolCall, KNOWN_TOOLS } from "./tool-parser.mjs";
import { readFile, listDir, grep, proposeWrite, commitWrite, proposeRun, commitRun } from "./tools.mjs";

export const AGENT_MAX_TURNS = 25;

const TOOL_DESCRIPTIONS = `You are a coding agent with real access to the local filesystem at the
workspace root. You solve the person's task by calling exactly ONE tool per
turn, reading the result, and continuing until you can give a final answer.

Respond with ONLY a single fenced JSON block, nothing else:

\`\`\`json
{"tool": "<name>", "args": { ... }}
\`\`\`

Available tools:
- read_file    args: {"path": "relative/or/absolute/path"} — read a real file.
- list_dir     args: {"path": "relative/or/absolute/path"} — list a real directory (path optional, defaults to the workspace root).
- grep         args: {"pattern": "regex", "path": "optional/scope"} — search real file contents.
- write_file   args: {"path": "...", "content": "..."} — propose writing a real file. The person will see a diff and approve or reject it before anything is written; you will be told the outcome.
- run_command  args: {"command": "shell command"} — propose running a real shell command. The person will see the exact command and approve or reject it before it runs; you will be told stdout/stderr/exit code.
- final_answer args: {"text": "..."} — you are done; this ends the task and is shown to the person as your answer.

Rules: exactly one tool call per response, valid JSON, no prose outside the
fenced block. If a tool result shows an error, adjust and try again rather
than repeating the same call.`;

function toolResultMessage(tool, args, result) {
  return { role: "user", content: `Tool result for ${tool}(${JSON.stringify(args)}):\n${JSON.stringify(result)}` };
}

async function callOllama({ ollamaUrl, model, messages, signal }) {
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Ollama /api/chat: ${res.status}`);
  return body?.message?.content ?? "";
}

/**
 * Runs the loop to completion (a final_answer, a turn-cap, or an abort).
 *
 * onEvent(event) fires for every visible step so a caller can render a live
 * transcript; event.type is one of:
 *   assistant-raw | parse-error | tool-call | tool-result | confirm-rejected
 *   | final | turn-cap | error
 *
 * confirm({tool, args, preview}) is awaited before write_file/run_command
 * actually execute; return true to approve, false to reject. Never called
 * for the three read-only tools.
 */
export async function runAgentTurn({ model, ollamaUrl = "http://localhost:11434", task, history = [], cwd, maxTurns = AGENT_MAX_TURNS, onEvent = () => {}, confirm, signal }) {
  const messages = [
    { role: "system", content: TOOL_DESCRIPTIONS },
    ...history,
    { role: "user", content: task },
  ];

  for (let turn = 1; turn <= maxTurns; turn++) {
    let raw;
    try {
      raw = await callOllama({ ollamaUrl, model, messages, signal });
    } catch (err) {
      onEvent({ type: "error", error: err.message });
      return { done: false, error: err.message, messages: messages.slice(1) };
    }
    onEvent({ type: "assistant-raw", text: raw, turn });
    messages.push({ role: "assistant", content: raw });

    const parsed = parseToolCall(raw);
    if (!parsed.ok) {
      onEvent({ type: "parse-error", error: parsed.error, raw, turn });
      messages.push({ role: "user", content: `Your last response could not be parsed as a tool call: ${parsed.error}. Respond with ONLY a single fenced \`\`\`json block shaped {"tool": "...", "args": {...}}, using one of: ${KNOWN_TOOLS.join(", ")}.` });
      continue;
    }

    if (parsed.tool === "final_answer") {
      const text = String(parsed.args?.text ?? "").trim() || "(no answer text given)";
      onEvent({ type: "final", text, turn });
      return { done: true, text, messages: messages.slice(1) };
    }

    onEvent({ type: "tool-call", tool: parsed.tool, args: parsed.args, turn });
    let result;
    switch (parsed.tool) {
      case "read_file":
        result = readFile(cwd, parsed.args);
        break;
      case "list_dir":
        result = listDir(cwd, parsed.args);
        break;
      case "grep":
        result = grep(cwd, parsed.args);
        break;
      case "write_file": {
        const proposal = proposeWrite(cwd, parsed.args);
        if (!proposal.ok) { result = proposal; break; }
        const approved = confirm ? await confirm({ tool: "write_file", args: parsed.args, preview: proposal }) : false;
        if (!approved) {
          onEvent({ type: "confirm-rejected", tool: "write_file", args: parsed.args, turn });
          result = { ok: false, rejected: true, error: "the person rejected this write" };
        } else {
          commitWrite(proposal.abs, proposal.content);
          result = { ok: true, path: proposal.path, isNew: proposal.isNew, bytesWritten: proposal.content.length };
        }
        break;
      }
      case "run_command": {
        const proposal = proposeRun(cwd, parsed.args);
        if (!proposal.ok) { result = proposal; break; }
        const approved = confirm ? await confirm({ tool: "run_command", args: parsed.args, preview: proposal }) : false;
        if (!approved) {
          onEvent({ type: "confirm-rejected", tool: "run_command", args: parsed.args, turn });
          result = { ok: false, rejected: true, error: "the person rejected running this command" };
        } else {
          result = await commitRun(cwd, proposal.command);
        }
        break;
      }
      default:
        result = { ok: false, error: `unhandled tool ${parsed.tool}` }; // unreachable: parseToolCall already validated against KNOWN_TOOLS
    }
    onEvent({ type: "tool-result", tool: parsed.tool, args: parsed.args, result, turn });
    messages.push(toolResultMessage(parsed.tool, parsed.args, result));
  }

  onEvent({ type: "turn-cap", maxTurns });
  return { done: false, capped: true, messages: messages.slice(1) };
}
