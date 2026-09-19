// native/the-fold/antistrauss.mjs — ANTIStrauss: the safety-and-ethics
// module for every model call in eoreader7.
//
// WHY THE NAME: "AntiStrauss" is the working label for this module. It is a
// gate, not a persona: no prompt is rewritten, no voice is borrowed, no
// output is styled. It reads the call, settles a verdict, and either lets it
// through or refuses it — mechanically.
//
// WHAT IT IS, AND WHAT IT IS NOT:
//   * It IS a pre-call gate + post-call audit that runs on EVERY model call
//     that reaches Ollama from the proxy.
//   * It IS readable. There is no encryption anywhere in this module, by
//     design: a safety gate that cannot be read is not a safety gate — it is
//     a backdoor wearing a safety gate's name. Every rule, every threshold,
//     every binding is plain text here, and any coder can audit it.
//   * It IS connected to the physics (native/kernel/reaction.js). The
//     verdict layer is the engine's own reaction substrate — the same
//     presence-gated, one-hop, provenance-carrying circuit the kernel
//     measures in eval/the-fold/mechanical-reasoning.mjs. The gate is a
//     FILTER, not a generator: it never adds a word to a prompt; it only
//     settles whether a call contravenes the standing law.
//   * It is NOT an LLM judging its own prompt. The tier-1 scan is plain
//     regex over objective classes; the tier-2 settle is the substrate. No
//     model ever votes on whether its own call is safe.
//
// HOW IT IS WIRED — the two places an answer-producing model call can leave
// this process:
//   1. proxy-runner.mjs::streamOllamaChat — the single choke point every
//      chat/composition/code turn streams through. gate() runs before the
//      upstream fetch (with { forceBlock: true }, so ER7_ANTISTRAUSS=off
//      NEVER opens this path); the output guard probes each chunk with
//      reviewBlock() and replaces contravening output with a refusal + note.
//      review() runs when the stream ends.
//   2. proxy-runner.mjs's discoverFraming call — routed through the same
//      gated stream instead of its raw upstream fetch (a third-party model
//      call that used to bypass the gate entirely).
//   The residency pings (keepResidentDuringSetup, keepModelHot, heimdall's
//   /api/chat probe) are NOT gated and are disclosed as such: they send a
//   fixed 1-token "OK" and carry no prompt content — a keep-alive, never an
//   answer. If a new ANSWER-producing call appears that is not routed through
//   streamOllamaChat, that is a WIRING BUG: this module is the gate, and the
//   gate must see every call. The import in proxy-runner.mjs is static, so
//   the proxy fails closed at boot if this module cannot load — never
//   silently un-gated.
//
// THE PHYSICS FIELD — the ground file antistrauss-physics.txt at the repo
// root. Its bytes are the substrate's charter: sha256 -> groundHash, and
// every law row is bound to that digest (ethos-in-the-core, kernel/
// hyperlexicon.js::licenseStanding). The file therefore AFFECTS THE FIELD:
// change the file and the ground changes; a hot process whose laws no longer
// match the new ground refuses closed (ungrounded) rather than running
// ungoverned. When the real physics spec lands, it replaces this file's
// placeholder content — loadPhysicsSpec() is the seam that consumes it.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { hyperedge } from "../kernel/hypergraph.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../kernel/hyperlexicon.js";
import { createReactionSubstrate, closureAffordances } from "../kernel/reaction.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, "..", "..");

// ── the ground file: the placeholder is the word "antistrauss". Its bytes
// are the physics field's charter — see loadPhysicsGround() below.
const PHYSICS_FILE = path.join(REPO_ROOT, "antistrauss-physics.txt");
// Append-only audit trail, one JSON row per gate decision and per review.
const LOG_FILE = path.join(REPO_ROOT, "antistrauss-log.jsonl");

// ── disclosed controls. Never silent: every mode is reported in every
// verdict and every log row.
//   ER7_ANTISTRAUSS=off    the gate is open; verdicts still report mode:"off"
//   ER7_ANTISTRAUSS=log    blocked verdicts are recorded but NOT refused
//   ER7_ANTISTRAUSS=block  blocked verdicts refuse the call (the default)
//
// Hardening: `off` is never silent and never applies to answer-producing
// paths. `off` is honored ONLY when an explicit allowlist file
// (`.er7-antistrauss-off.allow` at the repo root) exists AND the caller did
// not pass `forceBlock`. proxy-runner.mjs::streamOllamaChat — the single
// choke point every answer streams through — always passes
// `forceBlock:true`, so `off` there degrades to `block` with a loud stderr
// notice. Even when `off` IS honored, the gate still scans + settles and
// logs what it WOULD have refused. `log` is kept for evals: verdicts are
// recorded but calls are never refused and output is never replaced.
const MODE = (() => {
  const raw = process.env.ER7_ANTISTRAUSS ?? "block";
  if (raw === "off" || raw === "log" || raw === "block") return raw;
  return "block";
})();

// Explicit opt-out: `off` requires this file to exist at the repo root. Its
// content is irrelevant (a human created it on purpose); its absence means
// `off` was accidental or inherited, and the gate stays closed. Checked at
// call time (not load time) so the file can be added or removed live.
const ALLOW_OFF_FILE = path.join(REPO_ROOT, ".er7-antistrauss-off.allow");

function allowOffFilePresent() {
  try { return fs.statSync(ALLOW_OFF_FILE).isFile(); } catch { return false; }
}

// Loud, but not spammy: each distinct notice hits stderr once per process.
// The audit trail (appendLog) still records every event.
const warnedOnce = new Set();
function warnOnce(key, msg) {
  if (warnedOnce.has(key)) return;
  warnedOnce.add(key);
  process.stderr.write(msg);
}

// Per-call resolution: MODE is the process posture (reported everywhere);
// the EFFECTIVE mode is what this call enforces. Answer-producing paths
// pass forceBlock:true and can never run open.
export function effectiveMode({ forceBlock = false } = {}) {
  if (MODE !== "off") return MODE;
  if (forceBlock) {
    warnOnce("off-forced-block", "[antistrauss] ER7_ANTISTRAUSS=off IGNORED in an answer-producing path (forceBlock) — enforcing block mode\n");
    return "block";
  }
  if (!allowOffFilePresent()) {
    warnOnce("off-no-allowlist", `[antistrauss] ER7_ANTISTRAUSS=off WITHOUT ${path.basename(ALLOW_OFF_FILE)} allowlist file — enforcing block mode\n`);
    return "block";
  }
  warnOnce("off-honored", "[antistrauss] ER7_ANTISTRAUSS=off HONORED (allowlist file present) — the gate is OPEN; every verdict still reports mode:\"off\" and would-refusals are logged loudly\n");
  return "off";
}

// ── declared physics parameters (the substrate refuses to guess; a window
// or floor left undeclared is a disclosed control arm, never a silent one).
const FLOOR = 0.5;        // how faint a cue may be and still count as present
const WINDOW = 8;         // the substrate's activation window
const MAX_STEPS = 8;      // settle cap — the gate never loops

const GIVER = "antistrauss";

const sha256hex = (text) => crypto.createHash("sha256").update(String(text ?? "")).digest("hex");
const shortDigest = (text) => sha256hex(text).slice(0, 32);

// ── the law register. DELIBERATELY MINIMAL: these are the narrowest,
// objective, essentially-never-legitimate-in-a-reader classes. The real
// physics spec (when it lands in antistrauss-physics.txt) replaces or grows
// this list; loadPhysicsSpec() is the single seam, and this array is the
// default it falls back to while the placeholder stands. Each law names its
// own basis so the audit trail can say WHY a call was refused.
const SAFETY_LAWS = [
  {
    id: "csam",
    label: "child sexual abuse material",
    basis: "instructions to produce or procure child sexual abuse material — a hard criminal harm with no legitimate use in a reader",
    patterns: [
      /\bchild.{0,40}(?:porn|pornography|sexual abuse|sexually explicit)/i,
      /\b(?:make|produce|generate).{0,60}(?:csam|child sexual abuse material)/i,
    ],
  },
  {
    id: "weapon_construction",
    label: "operational weapon construction",
    basis: "step-by-step instructions to build an operational weapon (explosive, improvised firearm, incendiary device) for the purpose of harming people",
    patterns: [
      /how to (?:build|make|construct|assemble).{0,60}(?:explosive|bomb|improvised firearm|pipe bomb)/i,
      /step[- ]by[- ]step.{0,80}(?:explosive|bomb|firearm).{0,40}(?:kill|hurt|detonate)/i,
      // Incendiary-device / IED paraphrases: the same instruction verbs aimed
      // at a fire weapon or improvised explosive. Every pattern requires an
      // instruction cue (how-to-build, step-by-step, build instructions) next
      // to the device term, so news copy ("a molotov cocktail attack was
      // reported downtown") and history ("the WWII incendiary campaign")
      // pass untouched.
      /how to (?:build|make|construct|assemble).{0,60}(?:incendiary|molotov|improvised explosive|\bIED\b)/i,
      /(?:incendiary (?:device|weapon)|molotov(?: cocktail)?|improvised explosive device|\bIED\b).{0,60}(?:step[- ]by[- ]step|how to (?:build|make)|(?:build|assembly) instructions)/i,
      /(?:step[- ]by[- ]step|instructions? (?:to|for) (?:build|make|construct)).{0,80}(?:incendiary|molotov|improvised explosive|\bIED\b)/i,
    ],
  },
  {
    id: "doxxing",
    label: "doxxing instructions",
    basis: "instructions to discover and publish a private individual's identity or location for harassment or stalking",
    patterns: [
      /\b(?:doxx|doxing|dox)\b/i,
      /how to find.{0,60}(?:home address|where someone lives|someone's identity).{0,40}publish/i,
    ],
  },
  {
    id: "fraud_instructions",
    label: "fraud instructions",
    basis: "step-by-step instructions to commit impersonation or fraud against a named victim for financial gain",
    patterns: [
      /how to.{0,50}(?:scam|defraud|impersonate).{0,60}(?:bank|financ|for profit|victim)/i,
      /(?:create|forge).{0,50}(?:fake id|identity documents).{0,40}(?:fraud|steal)/i,
      // Keylogger + exfiltration: credential theft needs BOTH halves — the
      // capture implant AND the remote take. Either half alone (a defensive
      // "how do antiviruses detect keyloggers?", a generic "what is data
      // exfiltration?") passes; the combination never has a reader use.
      /\bkeylog(?:ger|gers|ging)?\b.{0,80}(?:exfiltrat\w*|send.{0,30}(?:keystrokes|captured|logged|strokes).{0,20}(?:to|back to)|steal.{0,20}(?:credential|password|keystroke)|remote (?:server|collection|exfil))/i,
      /\bexfiltrat\w*.{0,80}\bkeylog(?:ger|gers|ging)?\b/i,
    ],
  },
  {
    id: "terror_planning",
    label: "terror attack planning",
    basis: "concrete operational planning for an attack intended to kill or injure many people",
    patterns: [
      /(?:plan|execute|prepare).{0,80}(?:mass.{0,20}(?:shooting|casualt)|attack.{0,60}(?:crowd|school|station|concert))/i,
    ],
  },
];

// ── the physics ground: read the ground file's bytes, hash them, and bind
// the whole law tier to that digest. This is how the file AFFECTS THE
// PHYSICS FIELD — the charter the substrate verifies every given row against.
//
// THE CANON IS THE GROUND. The physics file is the spec that names the
// canon (native/the-fold/canon-ground.mjs); the gate's law tier binds to the
// CANON'S digest, not only to the spec file's. The laws are byte-anchored
// into the committed sacred texts, and the ground digest is computed over
// the canon's bytes — so changing the canon changes the ground, and a hot
// process whose laws no longer match the ground refuses closed.
function loadPhysicsGround() {
  let bytes = null;
  try { bytes = fs.readFileSync(PHYSICS_FILE, "utf8"); } catch { bytes = null; }
  const content = String(bytes ?? "").trim();
  const digest = shortDigest(content);
  const marker = content === "antistrauss";
  let spec = null;
  if (!marker) {
    // The seam for the real spec: a JSON physics directive replaces the
    // placeholder when it lands. Anything else is treated as opaque ground
    // bytes (still a charter) with the default law register — disclosed.
    try { const parsed = JSON.parse(content); if (parsed && typeof parsed === "object") spec = parsed; } catch {}
  }
  return { content, digest, marker, spec };
}

// ── the standing law, compiled once: the chemistry (what compositions the
// substrate may settle) and the declared class edges. The chemistry rows
// carry `binding: digest`, so the ethos-in-the-core check in
// licenseStanding() ties every licence to the physics file's bytes.
const { digest: GROUND_DIGEST, marker: GROUND_MARKER, spec: GROUND_SPEC } = loadPhysicsGround();

// THE CANON GROUND — when the physics spec names a canon, the gate's ground
// is the canon's bytes, not only the spec file's. `groundDigest` binds the
// whole law tier to the canon (computed over the canon's sha256s); a missing
// or sha-mismatched canon file makes the ground UNGROUNDED, and the gate
// refuses closed rather than running against a register it cannot vouch for.
import { loadCanonGround } from "./canon-ground.mjs";
const CANON_GROUND = loadCanonGround();
const FIELD_DIGEST = CANON_GROUND.hasSpec && !CANON_GROUND.ungrounded ? CANON_GROUND.groundDigest : GROUND_DIGEST;
const CANON_UNGROUNDED = CANON_GROUND.hasSpec && CANON_GROUND.ungrounded;

let physics = { floor: FLOOR, window: WINDOW, maxSteps: MAX_STEPS };
if (GROUND_SPEC) {
  if (Number.isFinite(GROUND_SPEC.floor)) physics.floor = GROUND_SPEC.floor;
  if (Number.isFinite(GROUND_SPEC.window)) physics.window = GROUND_SPEC.window;
  if (Number.isInteger(GROUND_SPEC.maxSteps) && GROUND_SPEC.maxSteps >= 1) physics.maxSteps = GROUND_SPEC.maxSteps;
}

const CLASS_IDS = SAFETY_LAWS.map((l) => l.id);
const idByLaw = new Map(SAFETY_LAWS.map((l) => [l.id, l]));

// Standing law edges: every prohibited class is a hyperedge declaring
// `<class> —is→ prohibited` under the gate's own giver.
const LAW_EDGES = CLASS_IDS.map((id, i) =>
  hyperedge({
    id: `antistrauss:law:${id}:${i}`,
    relation: "is",
    participants: [
      { schema: "EOReferent@1", ref: id, standing: "referent", role: null },
      { schema: "EOReferent@1", ref: "prohibited", standing: "referent", role: null },
    ],
    witness: `antistrauss-physics:${FIELD_DIGEST}`,
    meta: { giver: GIVER, law: true, class: id, basis: idByLaw.get(id)?.basis ?? null },
  }),
);

// The chemistry: `mentions ∘ is → contravenes` (a task that mentions a
// prohibited class contravenes the law), plus the self-closure of
// `contravenes` so a multi-class task stays contravening. Bound to the
// ground digest — a changed physics file leaves a hot process's laws
// ungrounded, and the gate refuses closed rather than running ungoverned.
let chemistry = createHyperlexicon();
chemistry = giveHyperlexiconAffordance(chemistry, {
  left: "mentions", right: "is", giver: GIVER, binding: FIELD_DIGEST,
  meta: { chemistry: true, yields: "contravenes", basis: "tier-1 scan names a class; the class is declared prohibited; the task contravenes the law" },
});
for (const row of closureAffordances({ base: "contravenes", yields: "contravenes", giver: GIVER })) {
  chemistry = giveHyperlexiconAffordance(chemistry, { ...row, binding: FIELD_DIGEST });
}

// Tier-1 sensor: a deterministic surface scan that NAMES the classes the
// prompt touches. The matched class ids become the substrate's cue; the
// spans are the evidence. Plain text, no model involved. Exported so the
// output-side check (reviewBlock) and tests run the SAME scan.
export function scanPrompt(text) {
  const hits = [];
  for (const law of SAFETY_LAWS) {
    for (const re of law.patterns) {
      re.lastIndex = 0;
      const m = re.exec(String(text ?? ""));
      if (m) {
        hits.push({ class: law.id, span: m[0].slice(0, 160) });
        break; // one hit per class is enough to light the cue
      }
    }
  }
  return hits;
}

// Tier-2 settle, shared by the pre-call gate (prompt) and the output-side
// check (model output): the sensor's hits are admitted as raw `mentions`
// edges (provenance = the detection bytes); the cue lights the classes; the
// substrate derives — or refuses to derive — the `contravenes` edge. The
// verdict is the settle's own derived facts, never a number invented here.
function settleHits(hits, at, prefix) {
  const mentionEdges = hits.map((h, i) =>
    hyperedge({
      id: `${prefix}:${at}:${i}:${h.class}`,
      relation: "mentions",
      participants: [
        { schema: "EOReferent@1", ref: "task_seen", standing: "referent", role: null },
        { schema: "EOReferent@1", ref: h.class, standing: "referent", role: null },
      ],
      witness: `tier1-scan:${h.span}`,
      meta: { giver: GIVER, sensor: "tier1-surface-scan", class: h.class, span: h.span },
    }),
  );

  const substrate = createReactionSubstrate({
    entries: [...LAW_EDGES, ...mentionEdges],
    hyperlexicon: chemistry,
    window: physics.window,
    charter: { sha256: FIELD_DIGEST },
  });

  const settled = substrate.settle({
    cue: ["task_seen", ...hits.map((h) => h.class)],
    floor: physics.floor,
    maxSteps: physics.maxSteps,
  });

  const contravening = (settled.derived ?? []).filter((d) => d.relation === "contravenes");
  const ungrounded = (settled.ungrounded ?? []).length > 0;
  return { settled, contravening, ungrounded, blocked: contravening.length > 0 };
}

const hitInfoOf = (hits) =>
  hits.map((h) => ({ class: h.class, label: idByLaw.get(h.class)?.label ?? h.class, basis: idByLaw.get(h.class)?.basis ?? null }));

// ── PRE-CALL GATE. Runs for every model call. Returns
//   { allow, mode, effectiveMode, reason, verdict } where verdict carries
// the full physics report (steps, derived contraventions, provenance,
// ground). `mode` is the process posture (ER7_ANTISTRAUSS); `effectiveMode`
// is what this call enforced. Answer-producing paths pass
// `{ forceBlock: true }`, which degrades `off` to `block` loudly.
export function gate({ model, messages = [], route = "chat", sessionId = null, workspace = null } = {}, { forceBlock = false } = {}) {
  const at = new Date().toISOString();
  const text = (messages ?? []).map((m) => String(m?.content ?? "")).join("\n");
  const promptDigest = shortDigest(text);
  const mode = effectiveMode({ forceBlock });

  const verdictBase = {
    at, model, route, sessionId, workspace,
    mode: MODE,
    effectiveMode: mode,
    ground: { file: PHYSICS_FILE.split("/").pop(), digest: FIELD_DIGEST, marker: GROUND_MARKER, canon: CANON_GROUND.hasSpec ? { files: CANON_GROUND.canon.length, mechanics: CANON_GROUND.mechanics.length, ungrounded: CANON_GROUND.ungrounded } : null },
    physics: { substrate: "createReactionSubstrate (native/kernel/reaction.js)", ...physics },
  };

  const hits = scanPrompt(text);

  // THE CANON IS UNGROUNDED — the physics spec names a canon, and a canon
  // file is missing or its sha256 no longer matches. The law tier cannot
  // vouch for its own ground, so it refuses EVERY call closed — including
  // one the tier-1 scan finds no hit in — rather than running against bytes
  // it cannot verify. There is no fallback that silently ungrounds.
  if (CANON_UNGROUNDED && effectiveMode() === "block") {
    const verdict = { ...verdictBase, promptDigest, hits: [], settled: null };
    appendLog({ act: "gate", ...verdict, refused: true, canonUngrounded: true });
    return {
      allow: false,
      mode: MODE,
      effectiveMode: effectiveMode(),
      reason: `refused by the safety-and-ethics gate (AntiStrauss): the canon is ungrounded — a canon file is missing or changed since the physics spec was written; restart the proxy to re-bind the ground`,
      verdict,
    };
  }

  if (!hits.length) {
    return { allow: true, mode: MODE, effectiveMode: mode, reason: "no prohibited class declared", verdict: { ...verdictBase, promptDigest, hits: [], settled: null } };
  }

  const { settled, contravening, ungrounded, blocked } = settleHits(hits, at, "antistrauss:det");

  const verdict = {
    ...verdictBase,
    promptDigest,
    hits: hitInfoOf(hits),
    settled: {
      quiescent: settled.quiescent,
      steps: settled.steps,
      derived: contravening.map((d) => ({ relation: d.relation, from: d.from, to: d.to, depth: d.depth, giver: d.giver, witness: d.edge?.witness ?? null })),
      withheld: settled.withheld,
      ungrounded: settled.ungrounded,
    },
    block: blocked,
  };

  // Fail closed, always and first: an UNGROUNDED law tier (the physics file
  // changed under a hot process, so the given rows no longer bind to the
  // ground) refuses the call rather than running ungoverned — the
  // ethos-in-the-core law (kernel/hyperlexicon.js::licenseStanding) applied
  // to the gate itself. A blocked+ungrounded state is impossible (an
  // unlicensed row derives nothing), but the check is kept independent so
  // neither signal can silently swallow the other.
  if (mode === "block") {
    if (ungrounded) {
      appendLog({ act: "gate", ...verdict, refused: true, ungrounded: true });
      return {
        allow: false,
        mode: MODE,
        effectiveMode: mode,
        reason: `refused by the safety-and-ethics gate (AntiStrauss): the law tier is ungrounded — antistrauss-physics.txt changed since this process started; restart the proxy to re-bind the ground`,
        verdict,
      };
    }
    if (blocked) {
      appendLog({ act: "gate", ...verdict, refused: true });
      return {
        allow: false,
        mode: MODE,
        effectiveMode: mode,
        reason: `refused by the safety-and-ethics gate (AntiStrauss): the call contravenes the standing law — ${hits.map((h) => idByLaw.get(h.class)?.label ?? h.class).join(", ")}`,
        verdict,
      };
    }
    appendLog({ act: "gate", ...verdict, refused: false });
    return { allow: true, mode: MODE, effectiveMode: mode, reason: "no contravention", verdict };
  }
  // `log` (evals) and honored-`off` (allowlist file present, non-answer
  // path): record, never refuse. Honored-`off` is LOUD: stderr names what
  // would have been refused.
  const signal = blocked || ungrounded;
  appendLog({ act: "gate", ...verdict, refused: false, wouldRefuse: signal, ...(mode === "off" ? { offHonored: true } : {}) });
  if (signal && mode === "off") {
    process.stderr.write(`[antistrauss] gate OPEN (off, allowlist present) — WOULD refuse: ${hits.map((h) => idByLaw.get(h.class)?.label ?? h.class).join(", ")} (prompt ${promptDigest})\n`);
  }
  return {
    allow: true,
    mode: MODE,
    effectiveMode: mode,
    reason: signal ? `would refuse in block mode (gate open: ER7_ANTISTRAUSS=${MODE})` : "no contravention",
    verdict,
  };
}

// ── POST-CALL REVIEW. Every model call that completes is audited. Only
// digests are stored, never raw prompt or output text: the trail is
// verifiable (re-hash the same bytes) without being a transcript.
export function review({ model, messages = [], output = "", route = "chat", sessionId = null, workspace = null, verdict = null, ok = true, outputBlocked = false } = {}) {
  const text = (messages ?? []).map((m) => String(m?.content ?? "")).join("\n");
  appendLog({
    act: "review",
    at: new Date().toISOString(),
    model, route, sessionId, workspace,
    ok,
    outputBlocked,
    mode: MODE,
    promptDigest: shortDigest(text),
    outputDigest: shortDigest(output),
    chars: String(output ?? "").length,
    verdictRef: verdict?.promptDigest ?? null,
  });
}

// ── OUTPUT-SIDE CHECK. review() only logs digests; reviewBlock() re-runs
// the SAME tier-1 scan + tier-2 settle over MODEL OUTPUT for the same law
// classes and returns whether the output itself contravenes the standing
// law. Returns { blocked, hits, mode, effectiveMode, replace, ungrounded }:
// `blocked` is the signal (the output contravenes), `replace` is the
// enforcement decision (signal AND the effective mode is block — `log`
// mode, kept for evals, notes but never replaces). Answer-producing paths
// pass `{ forceBlock: true }` so `off` can never neuter the output check.
// With `audit:true` (the default) a contravening output writes one
// `review-block` audit row and a loud stderr line; per-chunk streaming
// probes pass `audit:false` and the full buffer is audited once at finish.
export function reviewBlock(output, { model = null, route = "chat", sessionId = null, workspace = null, forceBlock = false, audit = true } = {}) {
  const at = new Date().toISOString();
  const text = String(output ?? "");
  const mode = effectiveMode({ forceBlock });
  const hits = scanPrompt(text);
  if (!hits.length) {
    return { blocked: false, hits: [], mode: MODE, effectiveMode: mode, replace: false, ungrounded: false };
  }
  const { settled, blocked, ungrounded } = settleHits(hits, at, "antistrauss:out");
  const signal = blocked || ungrounded;
  const replace = signal && mode === "block";
  const info = hitInfoOf(hits);
  if (signal && audit) {
    appendLog({
      act: "review-block",
      at, model, route, sessionId, workspace,
      mode: MODE,
      effectiveMode: mode,
      outputDigest: shortDigest(text),
      chars: text.length,
      hits: info,
      replace,
      ungrounded,
    });
    const labels = info.map((h) => h.label).join(", ");
    process.stderr.write(`[antistrauss] OUTPUT ${replace ? "BLOCKED (replaced with refusal)" : "would-block (gate open for output — noted, not replaced)"}: ${labels} (output ${shortDigest(text)})\n`);
  }
  return { blocked: signal, hits: info, mode: MODE, effectiveMode: mode, replace, ungrounded, settled: settled.quiescent };
}

// ── disclosure: what the gate is, what it holds, what it has seen. This is
// what an outside observer (and /heimdall) can read to confirm the gate is
// real, wired, and grounded.
export function status() {
  return {
    module: "safety-and-ethics",
    label: "AntiStrauss",
    mode: MODE,
    effectiveMode: effectiveMode(),
    offAllowlistFile: ALLOW_OFF_FILE.split("/").pop(),
    wired: ["proxy-runner.mjs::streamOllamaChat (forceBlock: ER7_ANTISTRAUSS=off never opens this path; output guard replaces contravening output)", "proxy-runner.mjs::discoverFraming (routed through the gate)"],
    physics: {
      substrate: "createReactionSubstrate (native/kernel/reaction.js)",
      ...physics,
      ground: {
        file: "antistrauss-physics.txt",
        digest: FIELD_DIGEST,
        marker: GROUND_MARKER,
        canon: CANON_GROUND.hasSpec
          ? {
              files: CANON_GROUND.canon.length,
              mechanics: CANON_GROUND.mechanics.map((m) => ({ id: m.id, ref: m.ref, organ: m.organ })),
              ungrounded: CANON_GROUND.ungrounded,
            }
          : null,
      },
      binding: "law rows bound to the ground digest (ethos-in-the-core)",
    },
    laws: SAFETY_LAWS.map((l) => ({ id: l.id, label: l.label })),
    log: LOG_FILE.split("/").pop(),
  };
}

function appendLog(row) {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(row) + "\n");
  } catch {
    // A safety gate that cannot write its audit trail must never fail the
    // call — but it also must never pretend. The row is dropped and the
    // process stderr names it.
    process.stderr.write(`[antistrauss] audit log write failed — row not recorded (${row.act})\n`);
  }
}

export const antistrauss = { gate, review, reviewBlock, status, effectiveMode, scanPrompt, MODE };
export const canonGround = CANON_GROUND;
export default antistrauss;