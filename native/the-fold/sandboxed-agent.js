// sandboxed-agent.js — an open-ended coding loop, like Claude Code itself,
// over runProxyTurn (the SAME grounded/checked/admission-gated model-calling
// pipeline every other request uses — never a raw Ollama call held apart in
// a client). code-loop.js's sibling, not its replacement: code-loop.js is
// for "make this real, on-disk file pass this real test command" (bounded,
// test-gated, physics-reverted). This is for "read, write, and run things
// freely while figuring out what to build" — the shape a general coding
// assistant actually needs, with NOTHING it touches able to reach the real
// machine at all.
//
// "Operate within the browser sandbox is the idea" (user direction): the-
// fold's own browser terminal (term.js/term-js-worker.mjs) already proved
// the shape — egress severed, a Worker with no real fs/child_process/
// network. This is that same shape, rebuilt natively in Node rather than
// requiring a browser tab: an in-memory virtual filesystem (nothing here
// EVER calls node:fs) and vm.Context-isolated JS execution (no `require`,
// no `process`, no `fs`, no network global — the identical severed-globals
// discipline term-js-worker.mjs states in its own header, applied via V8
// context isolation instead of Worker-thread global deletion). Because
// nothing here can touch the real machine, there is no safety reason to
// gate a write or a run behind a person's approval the way a REAL write/run
// would need (P24's own consent posture) — every action can run
// automatically, the same reasoning term.js's own AUTO_RUN_LANGS gives the
// runtimes it has proven fully severed.
//
// Mechanical action grammar, never a JSON tool call — code-loop.js's own
// stated principle ("ask the model for exactly ONE... mechanical action")
// extended from its two actions (read/patch) to five (read/write/list/run/
// done), because an open-ended loop needs to create files and execute code,
// not only patch an existing one.

import vm from "node:vm";
import { runProxyTurn } from "../../proxy-runner.mjs";

export const AGENT_MAX_TURNS = 25;
const RUN_TIMEOUT_MS = 3000;
const MAX_OUTPUT_CHARS = 8000;

const ACTION_FORMAT = `Respond with exactly one action, in exactly one of these formats and nothing else.

To list the virtual files that exist so far:
ACTION: list

To read a virtual file's content:
ACTION: read
PATH: <virtual path>

To write (create or replace) a virtual file — this workspace is sandboxed, not the real disk:
ACTION: write
PATH: <virtual path>
<<<CONTENT>>>
<the file's full new content>
<<<END>>>

To run JavaScript in a sandbox (no filesystem, no network, no process access — console.log output is returned to you):
ACTION: run
<<<CODE>>>
<javascript to execute>
<<<END>>>

When you are done, give the final answer:
ACTION: done
<<<ANSWER>>>
<your final answer, in full>
<<<END>>>`;

const LIST_RE = /^ACTION:\s*list\s*$/im;
const READ_RE = /ACTION:\s*read\s*\nPATH:\s*(\S+)/i;
const WRITE_RE = /ACTION:\s*write\s*\nPATH:\s*(\S+)\s*\n<<<CONTENT>>>\n([\s\S]*?)\n<<<END>>>/i;
const RUN_RE = /ACTION:\s*run\s*\n<<<CODE>>>\n([\s\S]*?)\n<<<END>>>/i;
const DONE_RE = /ACTION:\s*done\s*\n<<<ANSWER>>>\n([\s\S]*?)(?:\n<<<END>>>|$)/i;

/** Mechanical extraction only — closed vocabulary, a typed gap for anything
 * else, never a guess at what was meant (matches parseProposal's own
 * discipline in code-loop.js, one door over). */
export function parseAction(text) {
  const raw = String(text ?? "");
  if (LIST_RE.test(raw)) return { ok: true, action: "list" };
  let m;
  if ((m = READ_RE.exec(raw))) return { ok: true, action: "read", path: m[1].trim() };
  if ((m = WRITE_RE.exec(raw))) return { ok: true, action: "write", path: m[1].trim(), content: m[2] };
  if ((m = RUN_RE.exec(raw))) return { ok: true, action: "run", code: m[1] };
  if ((m = DONE_RE.exec(raw))) return { ok: true, action: "done", answer: m[1].trim() };
  return { ok: false, gap: { kind: "unparsed_action", reason: "the answer did not contain a recognized ACTION: block" } };
}

/** JS in a fresh V8 context: no `require`, no `process`, no `fs`, no
 * network global — only what this function explicitly hands in. Distinct
 * from term-js-worker.mjs's approach (defineProperty-delete on an existing
 * global scope) because vm.createContext starts from nothing rather than
 * severing an already-populated one; the guarantee is the same (P14's own
 * disclosed posture: an authority wall by construction, not a hardened
 * security boundary — a synchronous infinite loop is bounded by `timeout`,
 * not interruptible mid-execution the way killing a Worker is). */
export function runSandboxedJs(code) {
  const logs = [];
  const sandbox = {
    console: {
      log: (...args) => logs.push(args.map((a) => (typeof a === "string" ? a : safeStringify(a))).join(" ")),
    },
  };
  const context = vm.createContext(sandbox);
  let result;
  try {
    result = vm.runInContext(String(code ?? ""), context, { timeout: RUN_TIMEOUT_MS });
  } catch (e) {
    return { ok: false, output: [...logs, `Error: ${e instanceof Error ? e.message : String(e)}`].join("\n").slice(0, MAX_OUTPUT_CHARS) };
  }
  const resultLine = result === undefined ? [] : [safeStringify(result)];
  return { ok: true, output: [...logs, ...resultLine].join("\n").slice(0, MAX_OUTPUT_CHARS) };
}

function safeStringify(v) {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

function renderFiles(files) {
  const names = [...files.keys()];
  if (!names.length) return "(no virtual files yet)";
  return names.join("\n");
}

/**
 * Run the loop. `files` (a Map<path, content>) is the initial virtual
 * filesystem — pass a fresh empty Map for a clean workspace, or seed it
 * with starter content. Returns { done, answer, rounds, files } — `files`
 * is the FINAL virtual filesystem state, so a caller can read back what
 * was built. Never throws for an ordinary run — only for a malformed call.
 */
export async function runOpenCodingLoop({ sessionId, userId = null, model, task, files = new Map(), maxTurns = AGENT_MAX_TURNS, caller = null, signal = null }) {
  if (!task || typeof task !== "string") throw new Error("task must be a declared string");
  const rounds = [];
  let lastNote = null;

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    const roundTask = turn === 1
      ? `${task}\n\nVirtual files so far:\n${renderFiles(files)}\n\n${ACTION_FORMAT}`
      : `${task}\n\n${lastNote}\n\n${ACTION_FORMAT}`;

    const result = await runProxyTurn({ sessionId, userId, model, task: roundTask, chatHistory: [], mode: "chat", caller, signal });
    const parsed = parseAction(result.text);

    if (!parsed.ok) {
      rounds.push({ turn, gap: parsed.gap, raw: result.text });
      lastNote = `Your last reply did not match a recognized action (${parsed.gap.reason}). Use exactly one of the formats below.`;
      continue;
    }

    if (parsed.action === "list") {
      rounds.push({ turn, action: "list", files: [...files.keys()] });
      lastNote = `Virtual files:\n${renderFiles(files)}`;
      continue;
    }

    if (parsed.action === "read") {
      const content = files.get(parsed.path);
      if (content === undefined) {
        rounds.push({ turn, action: "read", path: parsed.path, gap: { kind: "no_such_file", reason: `no virtual file named "${parsed.path}" — ACTION: list to see what exists` } });
        lastNote = `There is no virtual file named "${parsed.path}" yet. ACTION: list to see what exists, or ACTION: write to create it.`;
        continue;
      }
      rounds.push({ turn, action: "read", path: parsed.path, contentChars: content.length });
      lastNote = `Content of "${parsed.path}":\n\n${content}`;
      continue;
    }

    if (parsed.action === "write") {
      files.set(parsed.path, parsed.content);
      rounds.push({ turn, action: "write", path: parsed.path, contentChars: parsed.content.length });
      lastNote = `Wrote "${parsed.path}" (${parsed.content.length} chars) to the sandbox. This is virtual — nothing touched the real disk.`;
      continue;
    }

    if (parsed.action === "run") {
      const ran = runSandboxedJs(parsed.code);
      rounds.push({ turn, action: "run", code: parsed.code, ok: ran.ok, output: ran.output });
      lastNote = `Sandbox output:\n\n${ran.output || "(no output)"}`;
      continue;
    }

    // done
    rounds.push({ turn, action: "done", answer: parsed.answer });
    return { done: true, answer: parsed.answer, rounds, files };
  }

  return { done: false, answer: null, rounds, files };
}
