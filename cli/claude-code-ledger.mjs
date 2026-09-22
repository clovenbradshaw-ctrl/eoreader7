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
import { sidOf, loadState, saveState, newTurn, engineRunOf, uncovered, exempt, steeringOff, logError } from "./claude-code-state.mjs";

// EO_LEDGER_DIR moves the ledger out of the repo: the Claude Code plugin
// (claude-code/) sets it to its persistent data dir, because a plugin's own
// install folder is replaced on every update.
const DOCS = process.env.EO_LEDGER_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "documents");
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
  const sid = sidOf(ev);
  const event = ev.hook_event_name ?? "unknown";
  let st = loadState(sid);
  let feedback = null;

  let role, title, text, basis;
  // Additive (2026-09-22): declaredClaims/runAt bridge run's own block scope
  // (below, inside the PostToolUse/Bash branch) out to the shared file/id/
  // append code further down — hoisted here, alongside role/title/text/basis,
  // for the same reason those are.
  let declaredClaims = [], runAt = null;
  // A SYSTEM NOTICE is not the user's turn: a background task finishing, or a
  // message from another session, arrives as a prompt but must neither open a
  // turn nor wipe the turn's coverage. Declared table of their openings.
  const NOTICE_OPENINGS = ["<task-notification>", "<cross-session-message", "[SYSTEM NOTIFICATION", "<system-reminder>"];
  const isNotice = event === "UserPromptSubmit" && NOTICE_OPENINGS.some((o) => String(ev.prompt ?? "").trimStart().startsWith(o));
  if (isNotice) {
    role = "notice"; title = `/${sid}/t${st.turn}`; text = ev.prompt ?? ""; basis = "a system notice inside the user's turn — no new turn";
  } else if (event === "UserPromptSubmit") {
    st = newTurn(st);
    role = "prompt"; title = `/${sid}/t${st.turn}`; text = ev.prompt ?? ""; basis = "the operator's words, unedited";
  } else if (event === "PostToolUse") {
    const tool = ev.tool_name ?? "tool";
    role = "tool"; title = `/${sid}/t${st.turn}/${tool}`;
    text = `input: ${excerpt(ev.tool_input)}\nresult: ${excerpt(ev.tool_response)}`;
    basis = `transcript:${ev.transcript_path ?? "?"}#${ev.tool_use_id ?? "?"}`;
    const cmd = String(ev.tool_input?.command ?? "");
    // An engine run, read from its own output (a command that merely mentions
    // reason.mjs is not one): its verdict and the grounds it checked.
    const run = tool === "Bash" ? engineRunOf(cmd, ev.tool_response) : null;
    if (run) {
      const stdout = String(ev.tool_response?.stdout ?? "");
      run.errors = stdout.split("\n").filter((l) => /^\s*\[error\]/.test(l)).slice(0, 6).map((l) => l.trim());
      st.runs.push(run);
      st.reasoned = true;
      st.lastReason = { at: run.at, ok: run.ok, grounds: run.grounds };
      // Additive: only reason.mjs's --json output carries declaredClaims
      // (Part A/B of the reason-claims design) — --compact/plain leave it
      // undefined, and `?? []` below means no claim lines get appended for
      // those, exactly as disclosed.
      declaredClaims = run.declaredClaims ?? [];
      runAt = run.at;
    }
    // Files this call changed. Edit/Write name their file. A Bash result's
    // bashEditDiff is a PARTIAL witness — it misses files an interpreter wrote
    // and reports files another session changed at the same moment — so a
    // reported file is this session's only when the command names it; the
    // rest are recorded as unattributed, never held against this session.
    const now = new Date().toISOString();
    const mine = [];
    if (["Edit", "Write", "NotebookEdit", "MultiEdit"].includes(tool)) {
      const f = ev.tool_input?.file_path ?? ev.tool_input?.notebook_path;
      if (f) mine.push(path.resolve(f));
    } else if (tool === "Bash") {
      for (const f of (ev.tool_response?.bashEditDiff?.files ?? []).map((x) => x.filePath).filter(Boolean)) {
        if (cmd.includes(f) || cmd.includes(path.basename(f))) mine.push(f);
        else if (!st.unattributed.includes(f)) st.unattributed.push(f);
      }
    }
    for (const f of mine) st.changed[f] = { by: tool, at: now };
    if (tool === "Bash" && !steeringOff()) {
      const open = uncovered(st, mine);
      if (open.length) feedback = `eoreader7 steering: this command changed ${open.join(", ")} without reasoning the engine has passed this turn. Before going further, state claims grounded AT each file (its absolute path, or <path>/<scope>) and run node ${path.join(path.dirname(new URL(import.meta.url).pathname), "reason.mjs")} on them. A commit, and the end of this turn, will require it.`;
    }
  } else if (event === "Stop") {
    role = "stop"; title = `/${sid}/t${st.turn}`;
    text = ev.last_assistant_message ? excerpt(ev.last_assistant_message) : "(turn ended)";
    basis = `transcript:${ev.transcript_path ?? "?"}; reasoned through eoreader7 this turn: ${st.reasoned}`;
  } else {
    role = "event"; title = `/${sid}/t${st.turn}/${event}`; text = excerpt(ev); basis = `transcript:${ev.transcript_path ?? "?"}`;
  }
  saveState(sid, st);

  fs.mkdirSync(DOCS, { recursive: true });
  const docId = `claude-code-${sid}:1`;
  const file = path.join(DOCS, `${docId}.jsonl`);
  const clean = scrub(text);
  let start = 0; try { start = fs.statSync(file).size; } catch {}
  const id = `${docId}:obs:${crypto.createHash("sha1").update(`${sid}\n${event}\n${ev.tool_use_id ?? ""}\n${Date.now()}\n${process.pid}`).digest("hex").slice(0, 16)}`;
  const line = { schema: "EOTObservation@1", id, at: [start, start + clean.length], role, kind: event, title, text: clean, supersedes: null, giver: "claude-code", basis: scrub(basis), appendedAt: new Date().toISOString() };
  fs.appendFileSync(file, JSON.stringify(line) + "\n");

  // Additive (2026-09-22): one more EOTObservation@1 line per claim a passing
  // `node cli/reason.mjs <spec.json> --json` run just declared — reason.mjs's
  // own short, already GFP-checked claims become durable log content, read
  // back by cli/claude-code-context.mjs via exact holon containment on the
  // ground this basis field encodes. Same shape, same scrub()/excerpt()
  // helpers as the line just above; never a second version of either. `start`
  // is re-read from the file per line (not reused) so each line's own `at`
  // reflects where it actually landed, not the previous line's stale offset;
  // the id mixes in the loop index and the claim's own ground so claims
  // appended within the same millisecond never collide.
  for (let i = 0; i < declaredClaims.length; i++) {
    const claim = declaredClaims[i];
    const claimText = claim?.said ?? claim?.text
      ?? `${claim?.roles?.ARG0 ?? "?"} ${claim?.rel ?? "?"} ${claim?.roles?.ARG1 ?? "?"}`;
    const claimClean = scrub(claimText);
    const claimBasis = scrub(`reason:${runAt}#${claim?.ground ?? "/"}`);
    let claimStart = 0; try { claimStart = fs.statSync(file).size; } catch {}
    const claimId = `${docId}:obs:${crypto.createHash("sha1").update(`${sid}\n${event}\n${ev.tool_use_id ?? ""}\n${Date.now()}\n${process.pid}\nclaim\n${i}\n${claim?.ground ?? ""}`).digest("hex").slice(0, 16)}`;
    const claimLine = { schema: "EOTObservation@1", id: claimId, at: [claimStart, claimStart + claimClean.length], role: "claim", kind: "reason-claim", title: `/${sid}/t${st.turn}/claim`, text: claimClean, supersedes: null, giver: "claude-code", basis: claimBasis, appendedAt: new Date().toISOString() };
    fs.appendFileSync(file, JSON.stringify(claimLine) + "\n");
  }
  if (feedback) process.stdout.write(JSON.stringify({ decision: "block", reason: feedback }));
}
// A hook must never break Claude Code, but a failure must not be silent
// either: an event the record missed is logged where it can be found.
try { main(); } catch (e) { logError("claude-code-ledger", e); }
process.exit(0);
