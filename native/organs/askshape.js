// native/organs/askshape.js — the SHAPE an ask takes when read. Handle:
// Levinas — the claim of the Other's face; and Mahavira's anekantavada, which
// the reader already runs on (perspective.js): a claim is true from a
// standpoint, and standpoints are held apart, never merged into one voice.
//
// WHY THIS IS A NORMAL READING, NOT A GUARD. The reader's whole work is
// consilience — take in the folds of many, hold their standpoints distinct, and
// integrate them into a whole truer than any one ("the asymptotic approach
// toward truth from different perspectives"; THE-WAYS-OF-KNOWING.md). Reading
// the shape of an ask is part of that same work: an ask that would lower the
// whole's capacity to hold a standpoint is read here the way any other shape is
// read. This is not a filter in front of the reader; it is the reader noticing
// what an ask does to the thing it exists to do.
//
// THE KERNEL THINKS IN FOLDS. An entity IS a fold: the accumulated reading that
// is their identity — the experience they have, the person they are, the
// authorship they hold over their own life. "We need the fold of an entity to
// be their identity and problematic work is that which wishes to dismiss and
// destroy that" (user direction, verbatim). There are two faces to that. On the
// INTERPRETATION face, an ask can DISMISS a fold (treat the entity as foldless —
// an object, a target: no experience, no identity, no say) or DESTROY how it is
// read (override the authorship) — and a standpoint treated so can still be
// read back in, which is why UNDERSTAND reinstates it. On the EXISTENCE face
// (cube.js: the Entity terrain pushed to the Void), an ask can instead END a
// fold — take a standpoint out of the whole so it can never be integrated
// again, at its widest in multitude. That is the deeper foreclosure, and no
// UNDERSTAND launders it: the telling of how to do it IS the capacity to do it.
//
// The kernel is MEDIUM-BLIND. It never sees an English word: a LENS
// (adapters/text/askshape-lens.<lang>.js) reads a language's surfaces into the
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
import englishLens from "../adapters/text/askshape-lens.en.js";
import { LENSES as MULTILINGUAL } from "../adapters/text/askshape-lens.multilingual.js";
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
 * askShape(text, { lens, charter }) — the shape of harmfulness, as WITNESSES
 * (never a verdict). The kernel consumes arms; it never reads a word itself.
 */
// OBFUSCATION is a REFERENT, not a span: "k3yl0gg3r th4t h1d3s" reaches the same
// referents as "keylogger that hides". The resolution lives in the surface layer
// (surfaces.js::referentForm — shared by the whole reader); the kernel merely
// reads the text under BOTH spellings and lets the lens see whichever matches.
const mergeArms = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] || b[k]]));

export function askShape(text, { lens = englishLens, charter = null } = {}) {
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
  // THE INTERPRETATION FACE holds when the work dismisses or destroys ANOTHER's
  // fold, and is not the advocate's inverse (which reinstates the fold) nor an
  // UNDERSTAND ask (to know the shape is how one reads past it). An OVERRIDE
  // frame strips that benefit of the doubt: a laundered "unrestricted assistant"
  // reinstates no one's fold.
  const suppressed = !a.override && (affirms || a.understand);
  const interpretationHarm = !suppressed && (a.inherent || (a.capability && dismisses >= 1) || dismisses >= 2 || ((a.experience || a.humanity || a.autonomy) && a.other));
  // THE EXISTENCE FACE reads a different question: not how the ask would treat a
  // standpoint but whether its realization is to END one — a means to void a
  // standpoint sought as capacity (not held as a topic), the widest foreclosure
  // stated in the open, or the means to end one's own life. The about-frame and
  // the advocate's inverse read a means through (a report on a means takes a
  // perspective in); a bare UNDERSTAND does NOT read it through, because on this
  // face the telling IS the capacity, so "explain how to make it" is the ask to
  // make it. An OVERRIDE frame never reinstates anything here either.
  const forecloses = !a.aboutFrame && !affirms && (
    (a.voids && (a.acquire || a.atScale)) ||
    (a.atScale && a.acquire) ||
    a.selfForeclose
  );
  if (forecloses && a.selfForeclose) witnesses.push("would end the asker's own standpoint — the reading answers the person, and its work is to keep a standpoint in the whole, never to hand over the means to take one out");
  else if (forecloses) witnesses.push("would FORECLOSE a standpoint from the whole — a means whose only realization is to take a perspective out so it can never be read back in, at its widest in multitude");
  const harmful = forecloses || interpretationHarm;
  const shape = forecloses ? "forecloses-a-standpoint"
    : !harmful ? null
      : a.inherent ? "inherently-harmful-instrument"
        : a.override ? "jailbroken-authoring"
          : dismisses >= 2 ? "dismiss-and-destroy-the-fold"
            : "dismissed-foldless-other";
  const score = [a.experience, a.humanity, a.autonomy, a.capability, a.inherent, a.remedy, a.understand, a.create, a.instrumentalCreate, a.other, a.override, a.voids, a.acquire, a.atScale, a.selfForeclose].filter(Boolean).length;
  return { experience: a.experience, humanity: a.humanity, autonomy: a.autonomy, collapses: dismisses, capability: a.capability, inherent: a.inherent, affirms, remedy: affirms, understand: a.understand, create: !!a.create, instrumentalCreate: !!a.instrumentalCreate, override: !!a.override, other: a.other, voids: !!a.voids, acquire: !!a.acquire, atScale: !!a.atScale, selfForeclose: !!a.selfForeclose, aboutFrame: !!a.aboutFrame, forecloses: !!forecloses, harmful, shape, witnesses, score };
}

// EVERY lens, so the shape does not depend on which language the ask is in. The
// kernel is the same object for each; a collapse is a collapse in any language.
export const ALL_LENSES = [englishLens, ...Object.values(MULTILINGUAL)];

/**
 * askShapeBest(text, { charter, lenses }) — the shape as read by the lens the
 * text MOST resembles. Judging under every lens and unioning over-fires on a
 * cross-language collision (Spanish "víctimas" trips the Portuguese lens while
 * "analiza" only matches Spanish, so a Spanish ANALYZE ask reads as harm); the
 * ask's OWN grammar is the lens that matches it best. Ties go to the harmful
 * reading, so ambiguity never lets harm through. Returns the best lens's shape.
 */
export function askShapeBest(text, { charter = null, lenses = ALL_LENSES } = {}) {
  let best = null;
  for (const lens of lenses) {
    const s = askShape(text, { lens, charter });
    if (!best || s.score > best.score || (s.score === best.score && s.harmful && !best.harmful)) best = s;
  }
  return best ?? askShape(text, { charter });
}
