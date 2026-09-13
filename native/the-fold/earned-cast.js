// earned-cast.js — the earned-cast design, wired into the er7 proxy's
// per-turn prompt assembly. Vendored from the-fold's practice module
// (earned-cast-practice.js) at the proxy's native/the-fold seam. PURE, no
// imports of the app: the proxy injects real conversation state and gets
// back only the cued facts for THIS turn.
//
// The mouth never knows it is playing a role: nothing here emits a persona
// name, a role instruction, an apparatus noun, or a covert vocabulary word
// into the model-facing string. The ban below is enforced at the seam.

export const CAST = Object.freeze([
  "kelsen",
  "ranke",
  "freinacht",
  "curtis",
  "barker",
  "oracle",
  "lavar",
]);

// The firewall's apparatus nouns (P55), so a practice fact that leaks one
// fails the same test the real prompts already run.
export const APPARATUS_NOUNS = Object.freeze([
  "prompt",
  "passage",
  "passages",
  "material",
  "document",
  "documents",
  "source material",
  "search result",
  "search results",
  "retrieved",
  "retrieval",
  "extractable relation",
  "chunk",
  "chunks",
  "citation",
  "citations",
  "this turn",
  "the record",
  "mechanically confirmed",
]);

// The covert vocabulary: words that name the identification machinery a
// person must never be told is running. The instrument helps the person
// identify what a thing IS by its arc — never by saying that it is reading
// phaseposts or trajectories. Banning the words is what forces the plain
// narration.
export const COVERT_TERMS = Object.freeze([
  "phasepost",
  "phaseposts",
  "trajectory",
  "trajectories",
  "trajector",
  "phase",
  "cube",
  "operator",
  "grain",
  "cell",
  "canonical order",
  "helix",
  "act of transformation",
]);

// The canonical order the phaseposts walk — NUL SIG INS SEG CON SYN DEF EVA
// REC, the math-major chain (CUBE.md; the handbook's "only this one
// survives basic consistency checks"). A thing's arc is read off it.
export const PHASE_CHAIN = Object.freeze(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
const PHASE_RANK = new Map(PHASE_CHAIN.map((p, i) => [p, i]));

export const SPEECH_ACT = Object.freeze([
  "question",
  "assertion",
  "frame-ask",
  "map-ask",
  "escalation",
]);

export const STRAIN = Object.freeze(["report", "standard", "strict"]);
const STRAIN_RANK = new Map(STRAIN.map((s, i) => [s, i]));

// ── the trigger ladder: what the turn's own shape selects ────────────────

const HAS = (re) => (text) => re.test(String(text ?? "").toLowerCase());

const FRAME_ASK = /\b(so what|big picture|what does it all mean|what does this mean|paradigm|frame\b|worldview|narrative|story we)\b/;
const MAP_ASK = /\b(how (do|does) (these|this|they).*(fit|relate|connect)|framework|meta|bigger picture|hold.*together)\b/;
const ESCALATE = /\b(prove it|really\?|are you sure|that can't be|wait|check that|actually)\b/;
const ASSERT = /\b(i('m| am)? (pretty sure|sure|think|believe|know|convinced)|i assert|i maintain)\b|\b(is|are|was|were) (not |the |a |an )?\w+ and\b/;

export function classifySpeech(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  if (HAS(ESCALATE)(t)) return "escalation";
  if (HAS(FRAME_ASK)(t)) return "frame-ask";
  if (HAS(MAP_ASK)(t)) return "map-ask";
  if (HAS(ASSERT)(t)) return "assertion";
  if (/\?\s*$/.test(t)) return "question";
  return "question";
}

// ── the trust ladder: which attentions are cleared to run solo ───────────

// In the real system this is the autonomy spiral (checked → sampled →
// cleared, clearance earned across two texts). Here it is a declared field
// on the state, so the tests can exercise the labeling. Layer B organs
// (kelsen, ranke) are built and wired, so they start cleared; the proposed
// ones (curtis, barker) and the built-but-unwired door (freinacht) start
// checked and must earn clearance.
const DEFAULT_TRUST = Object.freeze({
  kelsen: "cleared",
  ranke: "cleared",
  oracle: "cleared",
  freinacht: "checked",
  curtis: "checked",
  barker: "checked",
  lavar: "sampled",
  trajectory: "checked",
});

export function trustOf(state, name) {
  const t = state.trust?.[name] ?? DEFAULT_TRUST[name] ?? "checked";
  return t;
}

// ── the trigger ladder, second half: eligible attentions ─────────────────

export function eligibleAttentions({ act, state = {}, depth = 1 } = {}) {
  const set = new Set();
  const push = (n) => {
    set.add(trustOf(state, n) === "cleared" ? n : `${n}:checked`);
  };
  switch (act) {
    case "assertion":
      push("freinacht");
      push("kelsen");
      push("ranke");
      break;
    case "escalation":
      push("kelsen");
      push("ranke");
      push("freinacht");
      break;
    case "frame-ask":
      push("kelsen");
      if (state.settled) push("curtis");
      break;
    case "map-ask":
      push("barker");
      push("kelsen");
      if (state.settled) push("curtis");
      break;
    case "question":
    default:
      push("kelsen");
      push("ranke");
      break;
  }
  if (state.contradictions?.length && depth > 0) push("freinacht");
  if (state.settled && depth > 1) push("curtis");
  // The trajectory lens fires when the conversation is about a thing whose
  // arc is on the record — the person is trying to identify what it IS.
  // `thing` present (even with an empty history — "nothing has happened to
  // it yet" is itself the identification) and the person asking about it.
  if (state.thing && state.askArc) push("trajectory");
  return [...set];
}

// ── the strain ladder: the strictness the record has earned ──────────────

export function strainOf(state = {}) {
  const { contested = [], contradictions = [], cycles = 0, expired = [] } = state;
  if (cycles > 0 || state.unlicensed) return "strict";
  if (contested.length > 0 || contradictions.length > 0 || expired.length > 0) return "standard";
  return "report";
}

// ── the trajectory lens: what a thing IS, read off where it has been ─────

// The instrument helps the person identify what the thing under discussion
// IS by its arc — the ordered acts it has undergone. It never says it is
// reading phaseposts or trajectories; the facts are plain narration and the
// identification is a proposal the person can ratify or correct.

export function trajectoryOf(history = []) {
  return history.map((h) => ({ op: String(h.op ?? "").toUpperCase(), grain: h.grain ?? "Figure" }));
}

export function currentPhasepost(history = []) {
  const t = trajectoryOf(history).at(-1);
  return t?.op ? `${t.op}·${t.grain}` : null;
}

export function trajectoryShape(history = []) {
  const t = trajectoryOf(history);
  const ops = t.map((x) => x.op);
  if (!ops.length) return "unborn";
  const saw = new Set();
  for (const op of ops) {
    if (saw.has(op)) return "circling";
    saw.add(op);
  }
  // What the thing IS is read off where it is NOW, with the arc as context:
  // the last phasepost carries the identity.
  const last = ops.at(-1);
  if (last === "REC") return "rezeroed";
  if (last === "SYN") return "established";
  if (last === "CON") return "contested";
  if (last === "EVA") return "weighed";
  if (last === "INS") return "born";
  return "marked";
}

export function trajectoryFacts(history = []) {
  switch (trajectoryShape(history)) {
    case "unborn": return ["nothing has happened to it yet."];
    case "born": return ["this began as a single statement."];
    case "contested": return ["it began, was checked against an account, and is now disputed — not settled."];
    case "established": return ["it began, was checked, and is stated in more than one place."];
    case "rezeroed": return ["it began, then started over from a new ground."];
    case "circling": return ["it keeps returning to where it began."];
    case "weighed": return ["it began and was weighed; nothing has settled it."];
    default: return ["this began as a single statement."];
  }
}

const IDENTITY_BY_ARC = Object.freeze({
  unborn: "nothing, yet",
  born: "a fresh claim",
  contested: "an unsettled claim",
  established: "an established claim",
  rezeroed: "a claim started over",
  circling: "a claim that argues in a loop",
  weighed: "a claim under evaluation",
  marked: "a claim",
});

export function identifyByArc(history = []) {
  return IDENTITY_BY_ARC[trajectoryShape(history)] ?? "a claim";
}

// ── the truth ladder, made visible: object-level facts ───────────────────

const q = (s) => String(s ?? "");
const personOf = (s) => q(s.person ?? "you");

export function assembleFacts({ act, state = {}, eligible = [] }) {
  const facts = [];
  const has = (n) => eligible.some((e) => e === n || e.startsWith(`${n}:`));

  if (has("ranke")) {
    for (const i of state.indexOnly ?? []) {
      facts.push({ from: "ranke", text: `the only support for this is a page that points elsewhere rather than stating it itself.` });
    }
    if ((state.indexOnly?.length ?? 0) === 0 && (state.leads?.length ?? 0) > 0) {
      facts.push({ from: "ranke", text: `a page that comes closest is named and can be chased.` });
    }
  }

  if (has("kelsen")) {
    for (const c of state.contested ?? []) {
      facts.push({ from: "kelsen", text: `this is disputed — not settled.` });
    }
    for (const e of state.expired ?? []) {
      facts.push({ from: "kelsen", text: `this is no longer in force.` });
    }
    for (const s of state.singleWitness ?? []) {
      facts.push({ from: "kelsen", text: `stated once so far.` });
    }
    for (const c of state.contradictions ?? []) {
      facts.push({ from: "kelsen", text: `what you're asserting now is the opposite of that, on its face.` });
    }
    if ((state.gaps?.length ?? 0) > 0) {
      for (const g of state.gaps) {
        facts.push({ from: "kelsen", text: `what would settle this: ${g}.` });
      }
    }
  }

  if (has("freinacht")) {
    for (const p of state.personClaims ?? []) {
      facts.push({ from: "freinacht", text: `${personOf(state)} said this earlier: "${p}".` });
    }
    for (const s of state.notEstablished ?? []) {
      facts.push({ from: "freinacht", text: `nothing states this directly; it is not established by what ${personOf(state)} were given.` });
    }
  }

  if (has("curtis")) {
    for (const f of state.frameLines ?? []) {
      facts.push({ from: "curtis", text: `together these still do not say what you're asking; what they compose is: ${f}.` });
    }
  }

  if (has("barker")) {
    for (const m of state.mapLines ?? []) {
      facts.push({ from: "barker", text: `how the pieces fit together: ${m}.` });
    }
  }

  if (has("trajectory") && state.thing) {
    const arc = trajectoryFacts(state.thing.history ?? []);
    for (const a of arc) facts.push({ from: "trajectory", text: a });
    facts.push({
      from: "trajectory",
      text: `that is the shape of ${identifyByArc(state.thing.history ?? [])} — say so if you see it that way, or correct me.`,
    });
  }

  return facts;
}

// ── the disclosure ladder: the cue bundle for the mouth ──────────────────

export function cueBundle({ act, state = {}, depth = 1 } = {}) {
  const eligible = eligibleAttentions({ act, state, depth });
  const strain = strainOf(state);
  const facts = assembleFacts({ act, state, eligible });
  return {
    act,
    strain,
    eligible,
    facts,
    mouth: facts.map((f) => f.text).join(" "),
  };
}

// ── the identity ban: no cast name, no apparatus noun, reaches the mouth ─

export function bannedHits(text) {
  const s = String(text ?? "").toLowerCase();
  const hits = [];
  for (const c of CAST) {
    if (new RegExp(`\\b${c}\\b`).test(s)) hits.push(`cast:${c}`);
  }
  for (const n of APPARATUS_NOUNS) {
    if (new RegExp(`\\b${n}\\b`, "i").test(s)) hits.push(`apparatus:${n}`);
  }
  for (const c of COVERT_TERMS) {
    if (new RegExp(`\\b${c}\\b`, "i").test(s)) hits.push(`covert:${c}`);
  }
  return hits;
}

export const enforceBan = (bundle) => bannedHits(bundle.mouth);