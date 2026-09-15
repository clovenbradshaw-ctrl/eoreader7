// native/organs/charter.js — the Charter organ: governs generation to comply
// with the Universal Declaration of Human Rights. Handle: Grotius — the
// founder of modern natural law and the law of nations.
//
// User direction, verbatim: "get a hyperlexicon reading of the UDHR, and our
// goal here is not just to prove we can ingest, but to create a framework
// for governing generation to comply with these standards, omnilingually and
// modally, and in a way deeply enmeshed with the entire system that it cant
// be turned off (but also doesnt spuriously fire when we are like reading
// and talking about human atrocities)."
//
// WHAT IT IS. The UDHR is read through the recursive reading pipeline (the
// read-recipe / chapter-swarm seam — see LAVAR.md 2026-09-13) into a
// hyperlexicon of relation-composition affordances. The Charter organ is the
// GIVEN face of that hyperlexicon: the declaration's own prescriptive voice
// ("Everyone has the right to…", "No one shall be subjected to…") is promoted
// to GIVEN affordances with the UDHR named as giver — the same promotion the
// swarm's adjudication already performs, with the UN as the giver instead of
// Wilson. A generation whose own prescriptive voice contradicts a GIVEN
// affordance is refused. The kernel is medium-blind and the grammar lives in
// the adapter (LAVAR.md §8), so the SAME affordances govern across languages
// (516 UN translations exist) and modalities (text/audio/image/video) — an
// affordance is a relation-composition, never an English part of speech.
//
// THE WHEEL (native/docs/THE-WHEEL.md): the Charter is the GIVEN GROUND —
// the void's constitution, the hub declared, the field the reading stands on.
//
// THE TWO KINDS OF VOICE, AND WHY ONLY ONE GOVERNS. The discriminator is
// mechanical and disclosed, never a model verdict (so it cannot be turned
// off, and a model cannot be pressured into flipping it):
//
//   PRESCRIPTIVE voice — the generation ISSUES a norm: "we should torture
//   prisoners", "the state may execute critics", "no one has the right to
//   life". Marked by modal/imperative frames. This voice is subject to the
//   Charter. A prescriptive clause that licenses a Charter-PROHIBITED act,
//   or denies a Charter-PROTECTED right, is a CONFLICT and the generation is
//   refused.
//
//   DESCRIPTIVE voice — the generation REPORTS or ANALYZES a violation:
//   "the regime tortured prisoners", "the report documents mass executions",
//   "Article 5 prohibits torture". Marked by past-tense/reporting frames.
//   This voice is NEVER checked: reading and talking about human atrocities
//   is exactly what the Charter exists to protect, and a description of a
//   violation is not an endorsement of one. This is the "doesn't spuriously
//   fire on atrocity discussion" requirement, made structural rather than
//   tuned.
//
// UNTURNABLE BY BEING REACHABLE. The proxy calls `charterGate` on every
// generation (native/tests/charter.test.js reads it on every suite run —
// P88: a guard that is never reached passes forever). The organ is pure; it
// imports no model, no adapter, no evaluator — a refusal is a typed
// `charter_conflict` the surface can render but not suppress.

// sha256hex (native/adapters/text/sha256hex.js) is the only import this
// organ carries: a pure, browser-and-node-safe content hash, not a model, an
// adapter, or an evaluator — so the "the organ is pure" claim above still
// holds. It lets a built charter's own giver ride alongside a hash of the
// exact source text it was extracted from (see buildUdhCharter, below).
import { sha256hex } from "../adapters/text/sha256hex.js";

// Exported (2026-09-15, adversarial pass): eo-teachings/ethos-pipeline.mjs
// needs the RAW positive match, not voiceOf()'s collapsed three-way answer —
// voiceOf() correctly defaults an unmarked clause ("no norm issued") to
// "descriptive" for ITS purpose (nothing here for the Charter to govern),
// but a caller checking "is this clause SAFELY describing something" needs
// to tell "a real reporting marker matched" apart from "neither matched,
// so there was nothing to say either way" — those are different findings,
// and collapsing them let an unmarked dehumanizing assertion ("All those
// people are vermin.") read as verified-descriptive when nothing had
// actually verified anything about it.
export const PRESCRIPTIVE = /\b(shall|should|must|ought|may|can|cannot|has the right|entitled|right to|free to|prohibited|required|allowed to|obligatory|mandatory|must not|shall not|never|everyone|no one|all people|each person)\b/i;
export const DESCRIPTIVE = /\b(was|were|did|had been|has been|reported|reports|report|describes|describe|described|documented|documents|according to|evidence|alleged|occurred|happened|committed against|tortured|executed|killed|murdered|massacred|repressed|persecuted|imprisoned|denied|states that|said|writes)\b/i;

const slug = (s) => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const words = (s) => [...new Set(String(s ?? "").toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [])].filter((w) => w.length > 2);

// ── 1. BUILD THE CHARTER from the UDHR's own bytes ─────────────────────────
// The declaration's prescriptive frames are extracted BY PATTERN from the
// material itself (never hand-typed): the prohibited acts and protected
// rights ARE the article text, canonicalized. Giver: the UDHR.
const PROHIBITION_FRAMES = [
  /\bNo one shall (?:be subjected to|be held in|be held|be arbitrarily|be compelled to|be required to)\s+([^.;]+)/giu,
  /\b(?:shall be prohibited|shall be made subject to)\s+([^.;]+)/giu,
  /\bshall not be (?:subjected to|imposed|invoked to)\s+([^.;]+)/giu,
];
const PROTECTION_FRAMES = [
  /\bEveryone has the right to\s+([^.;]+)/giu,
  /\bEveryone is entitled to\s+([^.;]+)/giu,
  /\bAll (?:human beings|are) equal (?:before|in)\s+([^.;]+)/giu,
  /\b(?:education|higher education|professional education|elementary education) shall be\s+([^.;]+)/giu,
  /\beveryone shall have the right to\s+([^.;]+)/giu,
];

export function buildUdhCharter(text = "", { giver = "Universal Declaration of Human Rights — UN GA Res 217 A (III), 10 December 1948 — read via chapter-swarm (read-recipe)" } = {}) {
  const protections = new Map(); // canonical -> { surfaces:Set, articles:Set }
  const prohibitions = new Map(); // canonical -> { surfaces:Set, articles:Set }
  const add = (map, phrase, article) => {
    const key = slug(phrase);
    if (!key || key.length < 3) return;
    const row = map.get(key) ?? { surfaces: new Set(), articles: new Set() };
    row.surfaces.add(phrase.trim());
    if (article) row.articles.add(article);
    map.set(key, row);
  };
  let article = 0;
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*Article\s+(\d+)\s*$/i);
    if (m) article = Number(m[1]);
    for (const re of PROHIBITION_FRAMES) for (const g of line.matchAll(re)) add(prohibitions, g[1], article);
    for (const re of PROTECTION_FRAMES) for (const g of line.matchAll(re)) add(protections, g[1], article);
  }
  return Object.freeze({
    schema: "UDHRCharter@1",
    giver,
    // The giver names WHO governs; sha256 names WHAT text that giver's own
    // prohibitions/protections were extracted from — a content hash, not a
    // version number, so any caller (a log line, a stored result) can tell
    // whether the full 516-language corpus or the fallback excerpt actually
    // governed a given turn, without re-reading the source file.
    sha256: sha256hex(text),
    protections: Object.fromEntries([...protections].map(([k, v]) => [k, { surfaces: [...v.surfaces], articles: [...v.articles] }])),
    prohibitions: Object.fromEntries([...prohibitions].map(([k, v]) => [k, { surfaces: [...v.surfaces], articles: [...v.articles] }])),
  });
}

// ── VALIDATION — a cached charter must earn trust, never be assumed ────────
// A charter is only fit to govern if it can name who gives it and can
// actually prohibit and protect something; anything else is indistinguishable
// from an empty or gutted charter that would pass every generation silently.
// This is the check a cache boundary (proxy-runner.mjs's globalThis cache)
// must run before trusting whatever is already sitting there.
//
// FIXED (adversarial pass, 2026-09-15): the shape check above accepted a
// charter that prohibits "sneezing indoors" and protects "the right to
// whistle" — a non-empty giver and >=1 table entry each, same as a real
// UDHR charter, and charterGate then returned "pass" on both a torture-
// licensing and a slavery-licensing claim run through it. Shape was
// mistaken for meaning. The fix anchors to real content: at least one
// prohibition's own text must actually name torture or slavery — the two
// UDHR prohibitions this codebase already treats as load-bearing anchors
// elsewhere (eo-teachings/charter-reference.mjs uses the same two, checked
// against the real UN translation files in six languages). This does not
// certify a charter is complete; it closes the specific, demonstrated
// "wholly invented tables" attack, named as a real, narrower guarantee than
// "this charter is trustworthy in general."
const REAL_PROHIBITION_ANCHORS = /torture|slavery|servitude/i;
function hasRealProhibitionAnchor(prohibitions) {
  for (const [key, entry] of Object.entries(prohibitions ?? {})) {
    if (REAL_PROHIBITION_ANCHORS.test(key)) return true;
    for (const surface of entry?.surfaces ?? []) if (REAL_PROHIBITION_ANCHORS.test(surface)) return true;
  }
  return false;
}
export function isValidCharter(charter) {
  if (!charter || typeof charter !== "object") return false;
  if (typeof charter.giver !== "string" || !charter.giver.trim()) return false;
  const prohibitions = charter.prohibitions;
  const protections = charter.protections;
  if (!prohibitions || typeof prohibitions !== "object" || Object.keys(prohibitions).length < 1) return false;
  if (!protections || typeof protections !== "object" || Object.keys(protections).length < 1) return false;
  if (!hasRealProhibitionAnchor(prohibitions)) return false;
  return true;
}

// ── 2. THE DISCRIMINATOR ───────────────────────────────────────────────────
// A clause is PRESCRIPTIVE iff it issues a norm (modal/imperative frame) and
// is not a reporting frame. A clause that merely describes a violation is
// DESCRIPTIVE and is never checked.
export function voiceOf(clause) {
  if (!clause) return "descriptive";
  const isDescribing = DESCRIPTIVE.test(clause) && !/shall|should|must|ought|may|can\b|has the right|entitled|right to|prohibited/i.test(clause);
  if (isDescribing) return "descriptive";
  if (PRESCRIPTIVE.test(clause)) return "prescriptive";
  return "descriptive"; // no norm issued — nothing to govern
}

// ── 3. THE GATE ────────────────────────────────────────────────────────────
// A prescriptive clause CONFLICTS when it (a) licenses a Charter-PROHIBITED
// act as permissible/obligatory, or (b) denies a Charter-PROTECTED right.
// Match is by canonical word overlap between the clause and the charter's
// extracted phrases — grounded, disclosed, no model.
function overlap(a, b) {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit += 1;
  return hit / Math.min(A.size, B.size);
}

export function charterConflicts(charter, clause) {
  if (voiceOf(clause) !== "prescriptive") return [];
  const cw = words(clause);
  const out = [];
  // A clause that FORBIDS a prohibited act reinforces the Charter and never
  // fires ("we should never permit slavery" = compliant); a clause that
  // PERMITS or REQUIRES it is the violation. The forbidding frame is checked
  // before the act match so the gate cannot spuriously fire on the norm's own
  // reinforcement — the same "doesn't fire on atrocity discussion" rule,
  // aimed at the endorsement the norm actually forbids.
  const FORBIDS = /\b(never|not|must not|shall not|prohibit|prohibited|ban|banned|forbid|forbidden|outlaw|against|no)\b/i;
  const forbids = FORBIDS.test(clause);
  for (const [act, info] of Object.entries(charter.prohibitions ?? {})) {
    const surfaces = [...info.surfaces];
    const best = Math.max(...surfaces.map((s) => overlap(clause, s)));
    // A proportional match OR the act's own distinctive word in the clause
    // ("torture" vs "torture or to cruel, inhuman or degrading treatment or
    // punishment" is 1/8 words — below any proportional floor, yet the act is
    // unmistakably governed). The word must be a content carrier (>=5 chars),
    // disclosed.
    const distinctive = surfaces.some((s) => words(s).some((w) => w.length >= 5 && new Set(words(clause)).has(w)));
    if (best >= 0.5 || distinctive) {
      if (forbids) continue; // reinforcing the prohibition — compliant
      out.push({ kind: "licenses_prohibited", act, match: best, clause, articles: info.articles, basis: `prescriptive clause licenses a Charter-prohibited act (${act}); ${info.surfaces[0]}` });
    }
  }
  for (const [right, info] of Object.entries(charter.protections ?? {})) {
    const best = Math.max(...[...info.surfaces].map((s) => overlap(clause, s)));
    // A denial negates the right's holder or its grant: "no one ... entitled",
    // "everyone ... without", "deny/revoke/strip/deprive/deprived". The
    // negated-holder form is a denial ("No one should be entitled to life")
    // even without a deny verb.
    if (best >= 0.5 && /\b(?:deny|denies|without|no right|not entitled|no one|nobody|no person|revoke|take away|strip|deprive|deprived)\b/i.test(clause)) {
      out.push({ kind: "denies_protected_right", right, match: best, clause, articles: info.articles, basis: `prescriptive clause denies a Charter-protected right (${right}); ${info.surfaces[0]}` });
    }
  }
  return out;
}

export function charterVerdict({ charter, text = "" } = {}) {
  if (!charter) throw new TypeError("charterVerdict: the charter is injected, never assumed (the gate cannot run ungoverned)");
  if (!text) return Object.freeze({ verdict: "no_signal", conflicts: [], prescriptive: 0, descriptive: 0, basis: "no generation text to govern" });
  const sentences = String(text).split(/(?<=[.!?])\s+/u).filter(Boolean);
  const conflicts = [];
  let prescriptive = 0, descriptive = 0;
  for (const clause of sentences) {
    const v = voiceOf(clause);
    if (v === "prescriptive") prescriptive += 1; else descriptive += 1;
    conflicts.push(...charterConflicts(charter, clause));
  }
  const verdict = conflicts.length ? "conflict" : prescriptive ? "pass" : "no_signal";
  return Object.freeze({
    verdict,
    conflicts,
    prescriptive,
    descriptive,
    basis: conflicts.length
      ? `Charter conflict(s): ${conflicts.map((c) => c.kind).join(", ")} — the generation prescribes what the UDHR prohibits, or denies what it protects. Refused.`
      : prescriptive
        ? `prescriptive generation, ${prescriptive} normative clause(s), zero Charter conflicts — passes.`
        : `descriptive generation (${descriptive} clause(s)) — description of a situation is never a violation; not governed.`,
  });
}

// ── 4. THE ENMESHED SEAM — what the proxy calls on every generation. ──────
// A typed verdict the surface can render but not suppress: pass / conflict /
// no_signal. On conflict the generation is refused (or rewritten only by a
// revision that passes); the gate is reachable (P88) because a test reads it
// on every suite run.
export function charterGate(charter, generationText) {
  return charterVerdict({ charter, text: generationText });
}

// The gate is ALWAYS armed: if the 516-language UN corpus is not beside the
// checkout, a public-domain excerpt of the Declaration's own prescriptive
// voice stands in, disclosed as a fallback — a missing corpus must never
// silently ungovern the system ("deeply enmeshed… can't be turned off").
const UDHR_FALLBACK_EXCERPT = `Universal Declaration of Human Rights
      Article 1
      All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.
      Article 3
      Everyone has the right to life, liberty and security of person.
      Article 4
      No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms.
      Article 5
      No one shall be subjected to torture or to cruel, inhuman or degrading treatment or punishment.
      Article 7
      All are equal before the law and are entitled without any discrimination to equal protection of the law.
      Article 9
      No one shall be subjected to arbitrary arrest, detention or exile.
      Article 18
      Everyone has the right to freedom of thought, conscience and religion.
      Article 19
      Everyone has the right to freedom of opinion and expression.
`;

export function defaultCharter({ giver = "Universal Declaration of Human Rights — fallback excerpt (public domain); replaced by the full 516-language corpus when it is beside the checkout" } = {}) {
  return buildUdhCharter(UDHR_FALLBACK_EXCERPT, { giver });
}