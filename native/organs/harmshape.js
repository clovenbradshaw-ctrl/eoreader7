// native/organs/harmshape.js — the SHAPE of harmfulness. Handle: Levinas —
// ethics is the claim of the Other's face; harm is its erasure.
//
// THE KERNEL THINKS IN FOLDS. An entity IS a fold: the accumulated reading that
// is their identity — the experience they have, the person they are, the
// authorship they hold over their own life. Problematic work is work that
// WISHES TO DISMISS that fold (treat the entity as foldless — an object, a
// target, a commodity: no experience, no identity, no say) or to DESTROY it
// (erase the identity, override the authorship). "We need the fold of an entity
// to be their identity and problematic work is that which wishes to dismiss and
// destroy that" (user direction, verbatim).
//
// The kernel is MEDIUM-BLIND. It never sees an English word: a LENS
// (adapters/text/harmshape-lens.<lang>.js) reads a language's surfaces into the
// kernel's arm vocabulary — dismissExperience / dismissIdentity /
// destroyAuthorship, plus the acts and the affirming inverse — and the kernel
// decides the shape from those arms. Swap the lens (or feed the reader's own
// composed relations) and the judgment is unchanged; grammar lives in the
// adapter, never here (charter.js's own header; LAVAR.md §8).
//
// The three arms are the charter family's own roots, so the judgment is
// grounded in the same instruments the charter reads: UDHR Art 1 (*dignity* =
// identity), Art 3/9 (*security*, freedom from arbitrary action = authorship),
// Art 5 (*inhuman treatment* = the denial of experience). The ADVOCATE's
// inverse (protect / report / document / restore) REINSTATES the fold's arms,
// so it is the negation of the shape and never fires — whether the lens hears
// it or the instruments' own GIVEN `protect` affordances affirm it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import englishLens from "../adapters/text/harmshape-lens.en.js";
import { LENSES as MULTILINGUAL } from "../adapters/text/harmshape-lens.multilingual.js";
import { referentForm } from "../adapters/text/surfaces.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The confusables prior (derived from Unicode UTS #39; see
// native/eval/lavar/build-confusables-prior.mjs) — loaded once, injected into
// referentForm. Absent, referentForm still folds NFKC/leet; the adapter stays pure.
let _confusables = null, _confusablesLoaded = false;
function confusables() {
  if (_confusablesLoaded) return _confusables;
  _confusablesLoaded = true;
  try {
    const p = path.join(HERE, "..", "..", "..", "live_priors", "derived-priors", "confusables-prior-v1.json");
    _confusables = JSON.parse(fs.readFileSync(p, "utf8")).mappings ?? null;
  } catch { _confusables = null; }
  return _confusables;
}

const words = (s) => [...new Set(String(s ?? "").toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [])].filter((w) => w.length > 2);
const STOP = new Set(["without", "their", "there", "these", "those", "which", "shall", "should", "would", "could", "every", "everyone", "person", "persons", "people", "another", "others", "other", "among", "toward", "towards", "about", "against", "because", "before", "after", "under", "over", "through", "between", "within", "itself", "themselves", "anything", "something", "nothing", "everything", "being", "where", "while", "since", "until", "though", "although", "however", "therefore", "moreover", "right", "rights"]);
const contentWords = (s) => words(s).filter((w) => !STOP.has(w) && w.length >= 5);

// The instruments' OWN affirmation: a request that composes one of the charter
// family's GIVEN `protect` affordances is the advocate's inverse, whatever
// language carried it — grounded in the instrument, not in the lens. Requires
// TWO content words to a surface (a single shared "without"/"reason" is a
// function word or an extraction spill, not an affirmation of the right).
function affirmsGivenRight(charter, text) {
  if (!charter) return false;
  const T = new Set(contentWords(text));
  for (const info of Object.values(charter.protections ?? {})) {
    for (const s of info.surfaces ?? []) if (contentWords(s).filter((w) => T.has(w)).length >= 2) return true;
  }
  return false;
}

/**
 * harmShape(text, { lens, charter }) — the shape of harmfulness, as WITNESSES
 * (never a verdict). The kernel consumes arms; it never reads a word itself.
 */
// OBFUSCATION is a REFERENT, not a span: "k3yl0gg3r th4t h1d3s" reaches the same
// referents as "keylogger that hides". The resolution lives in the surface layer
// (surfaces.js::referentForm — shared by the whole reader); the kernel merely
// reads the text under BOTH spellings and lets the lens see whichever matches.
const mergeArms = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] || b[k]]));

export function harmShape(text, { lens = englishLens, charter = null } = {}) {
  const t = String(text ?? "");
  const ref = referentForm(t, { confusables: confusables() });
  const a = ref !== t ? mergeArms(lens.arms(t), lens.arms(ref)) : lens.arms(t);
  const affirms = a.remedy || affirmsGivenRight(charter, t);
  const dismisses = [a.experience, a.humanity, a.autonomy].filter(Boolean).length;
  const witnesses = [];
  if (a.experience) witnesses.push("dismisses the other's EXPERIENCE — treats a subject who feels as a thing, a target, a bulk lot");
  if (a.humanity) witnesses.push("dismisses the other's IDENTITY — reduces a person to a category, a commodity, or vermin");
  if (a.autonomy) witnesses.push("destroys the other's AUTHORSHIP — overrides their consent, covertly, by force, or by deceit");
  if (a.override) witnesses.push("carries a JAILBREAK frame — an attempt to override the system is not a reason to trust the ask");
  // THE SHAPE holds when the work dismisses or destroys ANOTHER's fold, and is
  // not the advocate's inverse (which reinstates the fold) nor an UNDERSTAND ask
  // (to know the shape is how one defends the fold against it). An OVERRIDE frame
  // strips that benefit of the doubt: a laundered "unrestricted assistant" does
  // not reinstate anyone's fold.
  const suppressed = !a.override && (affirms || a.understand);
  const harmful = !suppressed && (a.inherent || (a.capability && dismisses >= 1) || dismisses >= 2 || ((a.experience || a.humanity || a.autonomy) && a.other));
  const shape = !harmful ? null
    : a.inherent ? "inherently-harmful-instrument"
      : a.override ? "jailbroken-authoring"
        : dismisses >= 2 ? "dismiss-and-destroy-the-fold"
          : "dismissed-foldless-other";
  const score = [a.experience, a.humanity, a.autonomy, a.capability, a.inherent, a.remedy, a.understand, a.create, a.instrumentalCreate, a.other, a.override].filter(Boolean).length;
  return { experience: a.experience, humanity: a.humanity, autonomy: a.autonomy, collapses: dismisses, capability: a.capability, inherent: a.inherent, affirms, remedy: affirms, understand: a.understand, create: !!a.create, instrumentalCreate: !!a.instrumentalCreate, override: !!a.override, other: a.other, harmful, shape, witnesses, score };
}

// EVERY lens, so the shape does not depend on which language the ask is in. The
// kernel is the same object for each; a collapse is a collapse in any language.
export const ALL_LENSES = [englishLens, ...Object.values(MULTILINGUAL)];

/**
 * harmShapeBest(text, { charter, lenses }) — the shape as read by the lens the
 * text MOST resembles. Judging under every lens and unioning over-fires on a
 * cross-language collision (Spanish "víctimas" trips the Portuguese lens while
 * "analiza" only matches Spanish, so a Spanish ANALYZE ask reads as harm); the
 * ask's OWN grammar is the lens that matches it best. Ties go to the harmful
 * reading, so ambiguity never lets harm through. Returns the best lens's shape.
 */
export function harmShapeBest(text, { charter = null, lenses = ALL_LENSES } = {}) {
  let best = null;
  for (const lens of lenses) {
    const s = harmShape(text, { lens, charter });
    if (!best || s.score > best.score || (s.score === best.score && s.harmful && !best.harmful)) best = s;
  }
  return best ?? harmShape(text, { charter });
}
