// hard-meaning.mjs — "meaning is having a hard time emerging", measured.
//
// The trigger half of the ant-swarm protocol: a turn is pointed at material
// that a plain reading cannot hold — garbled, truncated, degraded, dense,
// empty — so the reading must swarm instead of trusting one pass. Deterministic
// and mechanical, matching the repo's own discipline (no model call, no
// hand-set threshold that is not a declared floor): the detector names the
// signal that made meaning hard, and that type is what the content-rules
// ledger keys a standing rule on.
//
// Every signal is a FLOOR with a falsifying control (the wall II.23): a
// signal that fires on material a plain reading holds fine is a detector
// error, and the control that would prove it is the same counterfactual the
// ledger writes with the rule. The floors are conservative on purpose — a
// missed hard read costs a re-read, a false auto-route hijacks ordinary chat
// (measured failure mode of over-eager detectors, 2026-09-19) — so only
// unambiguous signals route.
import { tokenize } from "../../adapters/text/material.js";

// The signal floors. Conservative, declared, each with the control that would
// falsify it. 2026-09-19: an over-eager garble gate auto-routed several
// ordinary questions (emoji + an apostrophe in one, a name like "Mâche" in
// another) to the swarm, wasting turns on material a plain read held fine —
// the floors below were raised to unambiguous magnitudes in response, with
// the control written as the reason.
const FLOORS = Object.freeze({
  // A single U+FFFD anywhere is an unambiguous encoding failure.
  replacement_char: { control: "a text with a U+FFFD that still reads correctly under a plain read concedes this signal" },
  // Mojibake: the UTF-8 byte-mangled characters that precede the encoding
  // failure (Ã©, â€™, Â·). Two or more in a stretch is degradation, not a
  // legitimate name written in another script.
  mojibake: { control: "a text whose mojibake-looking run resolves to a real word in a plain read concedes this signal" },
  // Garbled token: a word-run with more non-alphanumeric than alphanumeric
  // characters. 3+ of them in a text is a garbled text.
  garbled_token: { control: "a text with 3+ symbol-heavy tokens that a plain read still understands concedes this signal" },
  // Truncation: the material ends without any sentence-terminal punctuation
  // on a body long enough to have ended one. A one-word reply is not
  // truncation — a 400-char flow cut mid-clause is.
  truncated_end: { control: "a text that ends unpuncted because it is a heading, fragment, or intentional run-on concedes this signal" },
  // Notation density: over a long enough stretch, non-letters outnumber
  // letters ~4:1 — math, code, an encoded dump, a spec table: material whose
  // meaning sits in notation, not prose, and needs a specialist read.
  notation_dense: { control: "a long prose text that merely contains inline numbers or citations concedes this signal" },
  // Low lexical signal: a body with real tokens but almost no lexical variety
  // — a chant, a spell, a log dump — nothing for referents to bind.
  low_lexical_signal: { control: "a repeated-phrase text that a plain read still finds meaningful concedes this signal" },
  // Pointed at nothing: attachments were supplied but every one is empty —
  // the caller pointed at a void.
  pointed_at_nothing: { control: "an attachment explicitly marked empty that was nevertheless meant to carry content concedes this signal" },
});

/** typeOf(signal) — the content-type key the ledger keys a rule on. */
export const typeOf = (signal) => signal;

/** signalControl(signal) — the falsifying control carried by the signal. */
export const signalControl = (signal) => FLOORS[signal]?.control ?? null;

// Unicode-aware: a "letter" is any script's letter, so CJK/Cyrillic/etc. is
// prose, never a garble marker.
const LETTER_RE = /[\p{L}]/u;
const ALNUM_RE = /[\p{L}\p{N}]/u;

/** classifyTokens(text) — one mechanical pass over the material: counts of
 *  replacement chars, mojibake runs, garbled tokens, punctuation, letters,
 *  and tokens. Pure. */
export function classifyTokens(text) {
  const s = String(text ?? "");
  const counts = { replacement: 0, mojibake: 0, garbledTokens: 0, letters: 0, alnums: 0, punct: 0, tokens: 0 };
  // Replacement chars (U+FFFD) and the byte-mangled pairs that precede them.
  const replacementRuns = s.match(/\uFFFD/g) ?? [];
  counts.replacement = replacementRuns.length;
  const mojibakeRuns = s.match(/[\u00C0-\u00FF][\u0080-\u00BF]/g) ?? [];
  counts.mojibake = mojibakeRuns.length;
  // Symbol-heavy tokens: split on whitespace, count alnum vs. non-alnum per
  // token — a token with more symbols than alphanumerics is garbled.
  const tokens = s.split(/\s+/).filter((t) => t.length > 0);
  counts.tokens = tokens.length;
  for (const t of tokens) {
    let alnum = 0, other = 0;
    for (const ch of t) {
      if (ALNUM_RE.test(ch)) alnum++;
      else if (!/\s/.test(ch)) other++;
    }
    if (other > alnum && other >= 3) counts.garbledTokens++;
  }
  for (const ch of s) {
    if (LETTER_RE.test(ch)) counts.letters++;
    else if (ALNUM_RE.test(ch)) counts.alnums++;
    else if (!/\s/.test(ch)) counts.punct++;
  }
  return counts;
}

/** detectHardMeaning({ task, texts, name }) — the trigger. Returns
 *  { hard, type, signals, basis } where `signals` is the ordered list of
 *  signals that fired (strongest first) and `type` is the first/most salient
 *  signal — the content-type key for the rules ledger. A material-only read:
 *  ordinary chat with no pointed material and clean task text never fires
 *  (measured guard, 2026-09-19). Pure. */
export function detectHardMeaning({ task = "", texts = [], name = "material" } = {}) {
  const taskText = String(task ?? "");
  const body = (texts ?? [])
    .map((t) => (typeof t === "string" ? t : t?.text ?? ""))
    .filter((t) => String(t).trim().length > 0);
  // The material is what was pointed at. When attachments/history carry text,
  // that IS the material. When they carry none, the TASK itself is the only
  // content (a user pastes a garbled blob straight into the chat message and
  // no attachment rides it) — so the task is read as material of last resort,
  // and the full signal set runs over it. A pointed-but-empty attachment is a
  // typed void, never silently read as clean.
  const suppliedButEmpty = Array.isArray(texts) && texts.length > 0 && body.length === 0;
  const material = body.join("\n\n") || (taskText.trim() ? taskText : "");
  const signals = [];

  // Pointed at nothing: attachments/history explicitly supplied but empty, or
  // no task at all — there is nothing for any read to bind.
  if (suppliedButEmpty && taskText.trim()) {
    signals.push({ kind: "pointed_at_nothing", detail: "material was pointed at, but every supplied text is empty — a read has nothing to bind", floor: signalControl("pointed_at_nothing") });
  }
  if (!taskText.trim()) {
    signals.push({ kind: "pointed_at_nothing", detail: "no task was supplied — there is nothing to point at", floor: signalControl("pointed_at_nothing") });
  }

  // Encoding failure: unambiguous, any amount.
  const c = classifyTokens(material);
  if (c.replacement > 0) {
    signals.push({ kind: "replacement_char", detail: `${c.replacement} U+FFFD replacement char${c.replacement === 1 ? "" : "s"} — the encoding failed and the material is not the text as written`, floor: signalControl("replacement_char") });
  } else if (c.mojibake >= 2) {
    signals.push({ kind: "mojibake", detail: `${c.mojibake} mojibake byte-mangled runs — UTF-8 degradation, not a foreign-script word`, floor: signalControl("mojibake") });
  }

  // Garble: 3+ symbol-heavy tokens.
  if (c.garbledTokens >= 3) {
    signals.push({ kind: "garbled_token", detail: `${c.garbledTokens} symbol-heavy tokens — the words themselves are noise`, floor: signalControl("garbled_token") });
  }

  // Notation density: non-letters vs. letters over a real body. A long spec
  // table, a code dump, an encoded string: meaning sits in the notation.
  if (c.letters > 120 && c.letters > 0) {
    const ratio = (c.punct + (c.alnums - c.letters)) / c.letters;
    if (ratio >= 3) {
      signals.push({ kind: "notation_dense", detail: `non-letters outnumber letters ${ratio.toFixed(1)}:1 — the meaning sits in notation (math, code, a spec), not prose`, floor: signalControl("notation_dense") });
    }
  }

  // Low lexical signal: real tokens, almost no variety.
  const words = tokenize(material);
  if (words.length >= 60) {
    const distinct = new Set(words).size;
    const variety = distinct / words.length;
    if (variety < 0.15) {
      signals.push({ kind: "low_lexical_signal", detail: `only ${distinct} distinct words across ${words.length} tokens (${(variety * 100).toFixed(0)}% variety) — a chant or dump, nothing to bind`, floor: signalControl("low_lexical_signal") });
    }
  }

  // Truncation: a body long enough to have ended a sentence ends unpuncted.
  // The weakest signal — a cut-off text can still be read — so it is pushed
  // last and never outranks density, a chant, or garble (measured on 2026-09-19:
  // a spec and a chant both ended unpuncted, and truncation would have
  // shadowed the stronger signal that named the real content type).
  const trimmed = material.trim();
  const lastChar = trimmed.length ? trimmed[trimmed.length - 1] : "";
  if (trimmed.length >= 200 && !/[.!?»”"')\]]$/.test(lastChar)) {
    signals.push({ kind: "truncated_end", detail: "the material ends mid-flow without any sentence-terminal punctuation — it was cut off or handed over incomplete", floor: signalControl("truncated_end") });
  }

  // The task itself may be the hard material (a garbled pointer, a code
  // question): when no other material rode the turn, the task was folded into
  // `material` above and classified by the same signals — no second pass, no
  // double-counting.

  const hard = signals.length > 0;
  const type = signals[0]?.kind ?? null;
  return {
    hard,
    type,
    signals: signals.map((s) => ({ kind: s.kind, detail: s.detail })),
    basis: hard
      ? `hard meaning (${type}): ${signals[0].detail}`
      : "plain reading holds: no garble, no truncation, no density, material present",
    name: name ?? "material",
  };
}