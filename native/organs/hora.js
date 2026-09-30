// Handle: Hora — Herbert Simon's watchmaker (The Architecture of Complexity,
// 1962), the giver kernel/assembly.js and kernel/artifact.js already cite:
// stable sub-assemblies, each set down whole before the next is started.
//
// hora.js — the WALKER of the void holarchy. The structure already exists:
// organs/void-holarchy.js (Koestler) declares a build as a whole whose parts
// are wholes in their own right, each defined by the nine operators;
// organs/void-satisfaction.js checks any node of it; kernel/artifact.js seals
// what an assembly sets down, only after its conformance passed;
// organs/build-clarify.js declares the whole from the ask-back. What was
// missing is the thing that FILLS it: that turns each undeclared field and
// each empty cell into a small, specific task for the mouth, carrying only
// that cell's own path — never the tree, never another part's content — and
// walks the holarchy node by node, checking each before the next is started.
// The engine is not there to flood the model; it is there to give it
// specific tasks.
//
//   plan    the whole's void comes from the caller (build-clarify's declared
//           fields); the mouth is asked, in plain words, for the fields the
//           parts' voids still lack: the parts (the whole's composition), and
//           per part what each entry shows (INS, admits) and how many (DEF,
//           cardinality). Each part void is a defineLevelVoid.
//   fill    one ask per entry, completion-anchored on its first detail, with
//           the sibling names already taken; an entry with an empty detail or
//           a repeated name is refused at once and asked again fresh (never
//           shown its own reply — CODING-LESSONS 24/25), once, a little warmer
//   check   satisfyVoid at ["whole", part] after each part and at ["whole"]
//           at the end; a part that REOPENS on DEF/SYN/INS gets one more
//           fresh round for exactly the cells that failed
//   set down a renderer (injected, one per kind) assembles the filled
//           holarchy; an injected verifier judges the whole; sealArtifact
//           seals it only if both the verifier and satisfaction passed —
//           otherwise it stays unsealed scratch, and says so
//
// Programs are not built here: organs/code-build.js is the code-unit builder
// (plan units, draw bodies, assemble, validate), and a second one would be a
// second source of truth. Hora covers the records a page (or any document of
// entries) is made of. Nothing here calls a model (`ask` is injected) and
// nothing here is a regular expression.

import { createHash } from "node:crypto";
import { voidHolarchy, defineLevelVoid } from "./void-holarchy.js";
import { satisfyVoid } from "./void-satisfaction.js";
import { sealArtifact } from "../kernel/artifact.js";
import { wordsOf } from "./build-check.js";

export const HORA_SCHEMA = "HoraBuild@1";
/** Budgets, set by hand 2026-09-27 (not measured): the most parts, entries per
 *  part and details per entry the planner keeps, so every leaf stays a small
 *  task for a 1.5b mouth. */
export const MAX_PARTS = 5;
// Entries per part: set by hand 2026-09-27, the largest count the battery's
// requests name that still keeps a build under about 40 asks.
export const MAX_ENTRIES = 8;
// Details per entry: set by hand 2026-09-27, not measured — one ask fills
// every detail of an entry, so each detail added lengthens that one ask.
export const MAX_SLOTS = 4;

const NUMBER_WORDS = Object.freeze({ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30 });
const LEAD = new Set(["-", "*", "•", "·", "#", ">", "–", "—"]);
const isDigit = (ch) => ch >= "0" && ch <= "9";

/** One line of a reply without its list furniture: bullets, "1." / "2)",
 *  bold markers, wrapping quotes. */
export function cleanLine(line) {
  let s = String(line ?? "").trim();
  let moved = true;
  while (moved && s) {
    moved = false;
    if (LEAD.has(s[0])) { s = s.slice(1).trim(); moved = true; continue; }
    let i = 0;
    while (i < s.length && isDigit(s[i])) i++;
    if (i > 0 && i < s.length && (s[i] === "." || s[i] === ")")) { s = s.slice(i + 1).trim(); moved = true; }
  }
  s = s.split("**").join("").split("__").join("").trim();
  if (s.length >= 2 && (s[0] === '"' || s[0] === "'") && s[s.length - 1] === s[0]) s = s.slice(1, -1).trim();
  return s;
}

/** The reply's items, one per line: cleaned, non-empty; a line that only
 *  introduces the list (ends with ":") dropped; at most `max`. */
export function listOf(reply, max = MAX_PARTS) {
  return String(reply ?? "").split("\n").map(cleanLine).filter((l) => l && l[l.length - 1] !== ":").slice(0, max);
}

/** The first number a text states, as digits or a word; null if none. */
export function firstNumber(text) {
  for (const w of wordsOf(text)) {
    if (w.split("").every(isDigit)) return Number(w);
    if (NUMBER_WORDS[w] != null) return NUMBER_WORDS[w];
  }
  return null;
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sameWords = (a, b) => wordsOf(a).join(" ") === wordsOf(b).join(" ");

/** Read "detail: value" lines back into the named slots; the reply continues
 *  after the first slot's label, which the prompt ends on. */
export function slotsFrom(reply, slots) {
  const out = {};
  for (const raw of `${slots[0]}: ${String(reply ?? "").trim()}`.split("\n")) {
    const line = cleanLine(raw);
    const at = line.indexOf(":");
    if (at <= 0) continue;
    const slot = slots.find((s) => sameWords(s, line.slice(0, at)));
    if (slot && out[slot] == null) out[slot] = line.slice(at + 1).trim();
  }
  return out;
}

// ── the asks: each carries its own path and nothing else (plain words — Gary:
//    no apparatus, no operator names, no prohibitions reach the mouth) ────────
const pathOf = (whole, extra = []) => [`Request: ${whole.slot}`, `For: ${whole.anchor ?? "the person asking"}`, `Size: ${whole.cardinality ?? "small"}`, ...extra].join("\n");
export const ASKS = Object.freeze({
  kind: (w) => `${pathOf(w)}\nIs this something people open in a web browser, or a program run at the command line? Answer with one word, web or program:`,
  name: (w) => `${pathOf(w)}\nA short name for it, two to five words:`,
  parts: (w) => `${pathOf(w)}\nThe main sections of its front page, one per line, three to five sections:\n1.`,
  cardinality: (w, part) => `${pathOf(w, [`Section: ${part}`])}\nHow many entries this section shows, a number from 1 to ${MAX_ENTRIES}:`,
  admits: (w, part) => `${pathOf(w, [`Section: ${part}`])}\nEach entry in this section shows these details, one per line, two to four details:\n1.`,
  entry: (w, part, slots, i, n, taken) => `${pathOf(w, [`Section: ${part}`, `Entry ${i} of ${n}`, ...(taken.length ? [`Already listed: ${taken.join("; ")}`] : [])])}\nFill in each detail for this entry, one per line:\n${slots[0]}:`,
  form: (w) => `${pathOf(w)}\nDoes a visitor fill anything in on its front page, such as posting, signing up, voting, searching or adding something? Answer yes or no:`,
  formFields: (w) => `${pathOf(w)}\nThe fields a visitor fills in, one per line, one to four fields:\n1.`,
  button: (w) => `${pathOf(w)}\nThe text on the button that sends the form, one to three words:`,
});

const entryText = (slots, e) => slots.map((s) => e[s]).filter(Boolean).join(" · ");
/** A record belongs to its section by STRUCTURE, the way void-satisfaction
 *  already treats code (a unit binds to its artifact structurally, not by a
 *  shared word): "J-pod is back" is a post of a dolphin reddit without
 *  saying "dolphin". So the lexical CON test is recorded as a signal and does
 *  not block the seal; every other operator's failure does. */
const holds = (sat) => sat.failures.every((f) => f.op === "CON");
const unbound = (sat) => sat.failures.filter((f) => f.op === "CON").length;

/** makeHora({ ask, renderers, verify, log, modality })
 *  ask(prompt, { stage, temperature, maxTokens }) -> Promise<string>   the mouth
 *  renderers: { page(filled, whole) -> text }                          one per kind
 *  verify(kind, text) -> Promise<{ ok, checks: string[], detail }>     the whole's judge
 *  log(event)                                                           every ask and verdict */
export function makeHora({ ask, renderers, verify = async () => ({ ok: false, checks: [], detail: "no verifier" }), log = () => {}, modality = "text" }) {
  let asks = 0;
  const tell = async (stage, prompt, { temperature = 0.3, maxTokens = 120, op = null, path = [] } = {}) => {
    const t0 = Date.now();
    const reply = String(await ask(prompt, { stage, temperature, maxTokens }) ?? "");
    asks++;
    log({ kind: "ask", stage, op, path, prompt, reply, ms: Date.now() - t0, chars: prompt.length });
    return reply;
  };

  /** Plan: the parts' voids, their undeclared fields asked of the mouth. */
  async function plan(whole) {
    const name = listOf(await tell("name", ASKS.name(whole), { op: "NUL", path: ["whole"] }), 1)[0] ?? whole.slot;
    const partNames = listOf(`1. ${await tell("parts", ASKS.parts(whole), { op: "SYN", path: ["whole"], maxTokens: 80 })}`, MAX_PARTS);
    const parts = [];
    for (const part of partNames) {
      const path = ["whole", part];
      const n = clamp(firstNumber(await tell("cardinality", ASKS.cardinality(whole, part), { op: "DEF", path, maxTokens: 8 })) ?? 3, 1, MAX_ENTRIES);
      let slots = listOf(`1. ${await tell("admits", ASKS.admits(whole, part), { op: "INS", path, maxTokens: 60 })}`, MAX_SLOTS);
      if (!slots.length) slots = ["Title", "Details"];
      const fields = { slot: `${part} — ${whole.slot}`, anchor: whole.slot, admits: slots.join(", "), extent: `${n} entries`, relation: `a section of ${name}`, composition: "entries side by side, one card each", cardinality: n, admission: "every detail filled, and not a repeat of an entry already listed", reopensOn: "an empty detail, a repeated entry, or too few entries" };
      parts.push({ part, n, slots, fields, void: defineLevelVoid(fields), entries: [], gaps: [] });
    }
    let form = null;
    if (wordsOf(await tell("form", ASKS.form(whole), { op: "INS", path: ["whole", "form"], maxTokens: 4 }))[0] === "yes") {
      const fields = listOf(`1. ${await tell("form-fields", ASKS.formFields(whole), { op: "INS", path: ["whole", "form"], maxTokens: 50 })}`, 4);
      const button = listOf(await tell("button", ASKS.button(whole), { op: "NUL", path: ["whole", "form"], maxTokens: 8 }), 1)[0] ?? "Send";
      if (fields.length) form = { fields, button };
    }
    const holarchy = voidHolarchy({ modality, fieldsByLevel: { whole: { ...whole, composition: partNames.join(", "), extent: `${partNames.length} sections`, relation: "the whole", admission: "every section satisfied", reopensOn: "a section that reopens" } } });
    return { kind: "page", name, whole, holarchy, parts, form };
  }

  /** Fill one entry: fresh ask, refused at once when a detail is empty or it
   *  repeats a sibling; one warmer fresh re-ask. */
  async function fillEntry(whole, p, i) {
    const taken = p.entries.map((e) => e[p.slots[0]]).filter(Boolean);
    for (let attempt = 0; attempt < 2; attempt++) {
      const got = slotsFrom(await tell(`entry`, ASKS.entry(whole, p.part, p.slots, i, p.n, taken), { op: "SEG", path: ["whole", p.part, `entry ${i}`], temperature: 0.6 + attempt * 0.3, maxTokens: 30 * p.slots.length }), p.slots);
      const filled = p.slots.every((s) => got[s] && got[s].length <= 200);
      const repeat = taken.some((t) => sameWords(t, got[p.slots[0]] ?? ""));
      if (filled && !repeat) return got;
      log({ kind: "cell_refused", path: ["whole", p.part, `entry ${i}`], attempt, why: !filled ? "a detail was left empty" : "repeats an entry already listed" });
    }
    return null;
  }

  async function fill(tree) {
    for (const p of tree.parts) {
      for (let i = 1; i <= p.n; i++) { const e = await fillEntry(tree.whole, p, i); if (e) p.entries.push(e); else p.gaps.push(i); }
      // the part's own node check (void-satisfaction); one fresh round for the cells that failed
      let sat = satisfyVoid({ address: ["whole", p.part], modality, void: p.fields, fillers: p.entries.map((e) => entryText(p.slots, e)), declaredCount: p.n });
      log({ kind: "satisfaction", path: ["whole", p.part], ok: sat.ok, standing: sat.standing, failures: sat.failures.map((f) => `${f.op} ${f.kind}`) });
      const reopensOnFill = sat.failures.some((f) => f.op === "DEF" || f.op === "SYN" || f.op === "INS");
      if (!sat.ok && reopensOnFill) {
        const dup = new Set();
        p.entries = p.entries.filter((e) => { const k = entryText(p.slots, e); if (dup.has(k)) return false; dup.add(k); return true; });
        p.gaps = [];
        for (let i = p.entries.length + 1; i <= p.n; i++) { const e = await fillEntry(tree.whole, p, i); if (e) p.entries.push(e); else p.gaps.push(i); }
        sat = satisfyVoid({ address: ["whole", p.part], modality, void: p.fields, fillers: p.entries.map((e) => entryText(p.slots, e)), declaredCount: p.n });
        log({ kind: "satisfaction", path: ["whole", p.part], round: 2, ok: sat.ok, standing: sat.standing, failures: sat.failures.map((f) => `${f.op} ${f.kind}`) });
      }
      p.satisfaction = sat;
    }
    tree.satisfaction = satisfyVoid({ address: ["whole"], modality, void: { slot: tree.whole.slot, anchor: tree.whole.slot }, fillers: tree.parts.filter((p) => p.entries.length).map((p) => `${p.part}: ${p.entries.map((e) => entryText(p.slots, e)).join("; ")}`), declaredCount: tree.parts.length });
    log({ kind: "satisfaction", path: ["whole"], ok: tree.satisfaction.ok, standing: tree.satisfaction.standing, failures: tree.satisfaction.failures.map((f) => `${f.op} ${f.kind}`) });
    return tree;
  }

  /** Build one whole: { slot, anchor, cardinality } — build-clarify's
   *  declared fields. Returns { kind, tree, artifact, verdict, sealed, asks }.
   *  A request the mouth calls a program is handed back (kind "program",
   *  artifact null): organs/code-build.js builds programs. */
  async function build(whole) {
    asks = 0;
    const kind = wordsOf(await tell("kind", ASKS.kind(whole), { op: "INS", path: ["whole"], maxTokens: 4 }))[0] === "program" ? "program" : "page";
    log({ kind: "set_down", level: "kind", value: kind });
    if (kind !== "page") return { schema: HORA_SCHEMA, kind, tree: null, artifact: null, verdict: null, sealed: null, asks, handedTo: "organs/code-build.js" };
    const tree = await fill(await plan(whole));
    const artifact = renderers.page(tree, whole);
    const verdict = await verify(kind, artifact);
    const checks = [...(verdict.checks ?? []), ...tree.parts.map((p) => `${p.part}: ${holds(p.satisfaction) ? "holds" : p.satisfaction.standing}${unbound(p.satisfaction) ? ` (${unbound(p.satisfaction)} entr${unbound(p.satisfaction) === 1 ? "y shares" : "ies share"} no word with the request)` : ""}`), `whole: ${holds(tree.satisfaction) ? "holds" : tree.satisfaction.standing}`];
    let sealed = null;
    try {
      sealed = sealArtifact({
        kind: "HoraPage@1",
        producer: { assembly: "assembly:hora", version: 1 },
        material: { source: `request:${whole.slot}`, hash: createHash("sha256").update(JSON.stringify(whole)).digest("hex"), extent: tree.parts.length, unit: "sections" },
        regime: { modality, maxParts: MAX_PARTS, maxEntries: MAX_ENTRIES, maxSlots: MAX_SLOTS },
        dropped: ["the mouth's raw replies (kept in the log, not in the artifact)"],
        body: { name: tree.name, html: artifact },
        sealedAtSequence: asks,
        conformance: { passed: verdict.ok === true && holds(tree.satisfaction) && tree.parts.every((p) => holds(p.satisfaction)), checks },
      });
    } catch (err) {
      log({ kind: "unsealed", why: String(err?.message ?? err).slice(0, 200) });
    }
    log({ kind: "set_down", level: "whole", ok: verdict.ok, sealed: !!sealed, checks });
    return { schema: HORA_SCHEMA, kind, tree, artifact, verdict, sealed, asks };
  }

  return { build };
}
