#!/usr/bin/env node
// cli/claude-code-ledger.mjs — EVERYTHING CLAUDE CODE DOES, ON EOREADER7'S RECORD
// (2026-09-22). The user: "make sure it's all wired so the holograph has access
// to anything Claude Code does."
//
// A Claude Code hook (UserPromptSubmit, PostToolUse, Stop) pipes its event JSON
// here. Each event becomes one EOTObservation@1 line — the same line schema the
// generation pipeline writes (native/the-fold/document-ledger.js) — appended to
// documents/claude-code-<session>:1.jsonl, where the engine reads its ledgers.
//
//   HOLONS   title = /<session>/t<turn>/<tool>: a session holds turns, a turn
//            holds its tool calls. The ledger respects the same nesting the
//            reasoning core does.
//   ADDRESS  every line keeps a lossless pointer to the full event in Claude
//            Code's own transcript (transcript_path + tool_use_id); the line
//            itself carries a bounded excerpt. One address, the whole.
//   IDS      content-derived (sha1 of session · event · tool_use_id · time):
//            hooks run as separate, possibly parallel, processes, so a running
//            counter would collide.
//   SECRETS  scrubbed before anything is written, by a DECLARED table of
//            secret shapes (below) — a table, disclosed, not a detector.
//
// It also keeps per-session turn state for the reasoning gate
// (cli/claude-code-reason-gate.mjs): a turn is "reasoned" once cli/reason.mjs
// has run in it. It never fails the hook: any error exits 0 silently.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

// EO_LEDGER_DIR moves the ledger out of the repo: the Claude Code plugin
// (claude-code/) sets it to its persistent data dir, because a plugin's own
// install folder is replaced on every update.
const DOCS = process.env.EO_LEDGER_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "documents");
const STATE_DIR = path.join(os.homedir(), ".claude", "eo-reason", "sessions");
const EXCERPT = 4000;

// The declared table of secret shapes. Anything matching is replaced before it
// reaches disk. Extend the table; never bypass it.
const SECRET_SHAPES = [
  [/sk-ant-[A-Za-z0-9_-]{16,}/g, "[redacted]"],                       // Anthropic keys
  [/\bsk-[A-Za-z0-9_-]{20,}/g, "[redacted]"],                          // OpenAI-style keys
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, "[redacted]"],                     // GitHub tokens
  [/\bAKIA[0-9A-Z]{16}\b/g, "[redacted]"],                             // AWS access key ids
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/g, "[redacted]"],                  // Slack tokens
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted private key]"],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/g, "Bearer [redacted]"],
  [/\b((?:api|secret|access|auth)[_-]?(?:key|token)|password|passwd)(\s*[:=]\s*)["']?[^\s"',;}]{6,}/gi, "$1$2[redacted]"],
];
const scrub = (s) => { let t = String(s ?? ""); for (const [re, rep] of SECRET_SHAPES) t = t.replace(re, rep); return t; };
const excerpt = (v) => { const t = typeof v === "string" ? v : JSON.stringify(v); return t && t.length > EXCERPT ? `${t.slice(0, EXCERPT)}… [${t.length - EXCERPT} more chars at the transcript address]` : (t ?? ""); };

function main() {
  let ev;
  try { ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { return; }
  const sid = String(ev.session_id ?? "unknown").replace(/[^A-Za-z0-9_-]/g, "");
  const event = ev.hook_event_name ?? "unknown";
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const stateFile = path.join(STATE_DIR, `${sid}.json`);
  let st = { turn: 0, turnStart: null, reasoned: false, lastReason: null };
  try { st = { ...st, ...JSON.parse(fs.readFileSync(stateFile, "utf8")) }; } catch {}

  let role, title, text, basis;
  if (event === "UserPromptSubmit") {
    st.turn += 1; st.turnStart = new Date().toISOString(); st.reasoned = false; st.lastReason = null;
    role = "prompt"; title = `/${sid}/t${st.turn}`; text = ev.prompt ?? ""; basis = "the operator's words, unedited";
  } else if (event === "PostToolUse") {
    const tool = ev.tool_name ?? "tool";
    role = "tool"; title = `/${sid}/t${st.turn}/${tool}`;
    text = `input: ${excerpt(ev.tool_input)}\nresult: ${excerpt(ev.tool_response)}`;
    basis = `transcript:${ev.transcript_path ?? "?"}#${ev.tool_use_id ?? "?"}`;
    const cmd = String(ev.tool_input?.command ?? "");
    // Reasoned only on EVIDENCE the engine ran: its own output in the result,
    // not a command that merely mentions the file (`cat cli/reason.mjs`).
    const out = JSON.stringify(ev.tool_response ?? "");
    if (tool === "Bash" && /cli\/reason\.mjs/.test(cmd) && (/eoreader7 reason ·/.test(out) || /\\"gfp\\":/.test(out) || /"gfp":/.test(out))) {
      st.reasoned = true;
      st.lastReason = { at: new Date().toISOString(), result: excerpt(ev.tool_response).slice(0, 600) };
    }
  } else if (event === "Stop") {
    role = "stop"; title = `/${sid}/t${st.turn}`;
    text = ev.last_assistant_message ? excerpt(ev.last_assistant_message) : "(turn ended)";
    basis = `transcript:${ev.transcript_path ?? "?"}; reasoned through eoreader7 this turn: ${st.reasoned}`;
  } else {
    role = "event"; title = `/${sid}/t${st.turn}/${event}`; text = excerpt(ev); basis = `transcript:${ev.transcript_path ?? "?"}`;
  }
  fs.writeFileSync(stateFile, JSON.stringify(st));

  fs.mkdirSync(DOCS, { recursive: true });
  const docId = `claude-code-${sid}:1`;
  const file = path.join(DOCS, `${docId}.jsonl`);
  const clean = scrub(text);
  let start = 0; try { start = fs.statSync(file).size; } catch {}
  const id = `${docId}:obs:${crypto.createHash("sha1").update(`${sid}\n${event}\n${ev.tool_use_id ?? ""}\n${Date.now()}\n${process.pid}`).digest("hex").slice(0, 16)}`;
  const line = { schema: "EOTObservation@1", id, at: [start, start + clean.length], role, kind: event, title, text: clean, supersedes: null, giver: "claude-code", basis: scrub(basis), appendedAt: new Date().toISOString() };
  fs.appendFileSync(file, JSON.stringify(line) + "\n");
}
// A hook must never break Claude Code, but a failure must not be silent
// either: an event the record missed is logged where it can be found.
try { main(); } catch (e) {
  try { fs.appendFileSync(path.join(os.homedir(), ".claude", "eo-reason", "errors.log"), `${new Date().toISOString()} claude-code-ledger: ${e?.stack ?? e}\n`); } catch {}
}
process.exit(0);
