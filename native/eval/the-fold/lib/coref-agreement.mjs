// lib/coref-agreement.mjs — the fold's coreference held against its OWN
// individuation rule, as ONE implementation shared by the MHC battery
// (order 5's task and arms) and the regression test that pins it.
//
// WHY THIS IS A SEPARATE MODULE, AND WHY IT EXISTS AT ALL. The MHC battery
// is "a re-runnable driver, not a committed regression test" (its own
// header), and its committed output — `results/mhc-RESULTS.md` — reported
// War and Peace at stage 13 for six days after the same day's
// `WORKING_PASSAGES` widening (2026-08-30) had silently broken order 5 on
// that material. Nothing read the number, so nothing failed. Moving this
// computation here lets `native/tests/mhc-order5-precision.test.js` read
// it against the real fixtures on every suite run: the next drift fails a
// test instead of waiting for someone to disbelieve a document.
//
// One implementation, two consumers, deliberately: the driver and the test
// must never carry separate copies of "what does the rule say" — that is
// the drift class this project's own postmortems name three times (P22's
// Array.find, P24's runtime-type ternary, P39's deleted landCell).
//
// The computation is moved from mhc-battery.mjs's deriveSpec VERBATIM (its
// own comments kept, since they record three wrong versions of this probe
// that must not be re-made); only the wrapping changed.

/**
 * Hold `discoverReferents`'s own grouping against the individuation rule it
 * says it applies: strip GENERIC tokens (those appearing with many partners
 * — titles, family names, demonyms) from both surfaces and require the
 * REMAINDERS to corefer.
 *
 * @param {string} text — the material, as one string
 * @param {object} organs — { splitSentences, extractSurfaces, discoverReferents,
 *   genericTokens, namesCorefer, diaNorm } (the engine's own)
 * @param {object} [opts]
 * @param {function} [opts.foldToken] — a received per-token fold (Russian
 *   case-forms), threaded to discoverReferents exactly as the battery does;
 *   omitted for English, byte-identical.
 * @returns {{regime1, regime2, shouldMerge, didMerge, missed, abstained,
 *   shouldWithhold, wronglyMerged, stranded}}
 */
export function corefAgreementFor(text, organs, { foldToken } = {}) {
  const clean = (x) => typeof x === "string" && x.trim() && !/[\n\r]/.test(x);

  // ── THE TWO NOMINAL QUESTIONS, POSED WITH THE FOLD'S OWN RULE ──────────
  //
  // Three wrong versions of this were built before this one, and the wrong
  // turns are worth keeping because each was a real methodological error:
  //
  //   1. Pairs chosen by SPELLING ("b starts with a plus a space") drew
  //      "Russian" / "Russian Army". The reading refuses to merge those, and
  //      it is RIGHT to; the probe scored it as failing.
  //   2. Pairs chosen by `namesCorefer` on the RAW surfaces drew "Ilya
  //      Andreyevich Rostov" / "Petya Rostov" — coreferent on a shared final
  //      token, two different people. Again the reading was right.
  //
  // Both were the same mistake, and it is this repo's own P38 in a new place:
  // an organ answering "could these two strings be variants of one name" is
  // not an organ answering "does this material establish them as one being",
  // and handing the first to a mechanism that reads the second convicts the
  // reader of the probe's error. `discoverReferents` does not call
  // `namesCorefer` on surfaces at all — it strips GENERIC tokens (titles,
  // family names, demonyms: the ones that appear with many partners) from
  // both sides first and requires the REMAINDERS to corefer, precisely so
  // that "Princess Mary" and "Princess Hélène" stay apart. Its own comment
  // says so.
  //
  // So the pairs below are built with that same rule, using the engine's own
  // exported `genericTokens`, which puts the probe and the organ on one
  // footing and makes the disagreement — where there is one — mean something.
  const generic = (() => {
    try {
      const entries = organs.extractSurfaces(organs.splitSentences(text), {});
      return organs.genericTokens ? organs.genericTokens(entries, {}) : new Set();
    } catch {
      return new Set();
    }
  })();
  // The same three lines `discoverReferents::individuating` runs, through the
  // session's own fold (P7.1: one fold per session, by import, never a local
  // reimplementation).
  const individuating = (surface) =>
    organs
      .diaNorm(surface)
      .split(/\s+/)
      .filter((t) => t.length > 2 && !generic.has(t));

  // NOT `index.events`. cast.js builds its referent index with
  // `minSentences: 0` — its own header says why: "presence... a name
  // mentioned once is present once", which is the right floor for a citation
  // presence check and the wrong one for this question. Reading the coref
  // regimes off it drew 510 "pairs" on this material, most of them
  // capture artefacts ("Moscow Pierre", "Tolly Pyotr Bagration"), and scored
  // the reading as stranding names it had rightly never admitted.
  //
  // That is P38 exactly — "an index answering 'does this exist' is not an
  // index answering 'is this established' — never hand one to a mechanism
  // that reads" — committed here, by this driver, against the very organ
  // whose floor P38 was written about. The regimes are therefore built from a
  // `discoverReferents` pass at the organ's OWN derived floor.
  const eventId = new Map();
  let establishedEvents = [];
  let ambiguous = [];
  try {
    const entries = organs.extractSurfaces(organs.splitSentences(text), {});
    const disc = organs.discoverReferents(entries, { foldToken });
    establishedEvents = disc.events ?? [];
    // A form the fold REFUSED as ambiguous gets no DEF.admit event, so it is
    // absent from `eventId` and from both regimes below — neither gathered
    // nor stranded nor withheld. Left uncounted, a refusal would look like
    // nothing happened, which is how a precision fix could hide its own
    // recall cost. Surfaced here so the caller can count it beside the
    // regimes (a typed gap is a result, never silence — P41).
    ambiguous = (disc.gaps ?? [])
      .filter((g) => g.reason === "ambiguous_surface")
      .map((g) => ({ surface: g.surface, candidates: g.candidates ?? [], conflictsWith: g.conflictsWith ?? null }));
  } catch {
    establishedEvents = [];
  }
  for (const ev of establishedEvents) if (!eventId.has(ev.surface)) eventId.set(ev.surface, ev.referent_id);
  const allSurfaces = [...eventId.keys()].filter((f) => clean(f));

  // TWO REGIMES, AND ONE DELIBERATELY NOT SCORED.
  //
  // `corefersIndividuated` has two branches. The FIRST — both sides carry
  // individuating evidence, and the remainders corefer — is fully computable
  // here from exported organs (`genericTokens` + `namesCorefer`), and it is
  // what regimes 1 and 2 below measure, in both directions.
  //
  // The SECOND branch is the documented singleton-partner RESCUE: a bare
  // generic token whose corpus-wide partner set is exactly one can only name
  // that partner's bearer ("Clerval" → "Henry Clerval", the code's own
  // example). A first version of this driver treated every one-side-bare pair
  // as "the rule withholds" and duly reported `Anna` | `Anna Karenina` and
  // `Hélène` | `Hélène Bezukhova` as wrongly merged. Checked rather than
  // believed: both are the rescue firing exactly as designed. Computing that
  // branch here would mean reimplementing the engine's own partner-eligibility
  // floor in a driver — the drift this repo has already caught itself at
  // twice — so one-side-bare pairs are EXCLUDED from the score and counted as
  // a disclosed abstention instead.
  const regime1 = [];
  const regime2 = [];
  let abstained = 0;
  const rawShare = (a, b) => {
    const ta = new Set(organs.diaNorm(a).split(/\s+/).filter((t) => t.length > 2));
    return organs
      .diaNorm(b)
      .split(/\s+/)
      .some((t) => t.length > 2 && ta.has(t));
  };
  for (let i = 0; i < allSurfaces.length; i += 1) {
    for (let j = i + 1; j < allSurfaces.length; j += 1) {
      const a = allSurfaces[i];
      const b = allSurfaces[j];
      const ia = individuating(a);
      const ib = individuating(b);
      if (!(ia.length && ib.length)) {
        let raw = false;
        try {
          raw = !!organs.namesCorefer(a, b);
        } catch {
          raw = false;
        }
        if (raw) abstained += 1;
        continue;
      }
      let remaindersCorefer = false;
      try {
        remaindersCorefer = !!organs.namesCorefer(ia.join(" "), ib.join(" "));
      } catch {
        remaindersCorefer = false;
      }
      const merged = eventId.get(a) === eventId.get(b);
      if (remaindersCorefer) regime1.push({ a, b, merged });
      // A near miss is a pair a NAIVE fold would merge — the raw surfaces
      // share a token — whose individuating remainders nonetheless say they
      // are different beings. "Princess Mary" / "Princess Hélène" is the
      // code's own example: both share "princess", both individuate, and
      // [mary] vs [helene] do not corefer. The shared token is the GENERIC
      // one, which is exactly why the remainders must be compared instead of
      // the surfaces; an earlier version of this line looked for a shared
      // token in the REMAINDERS and found none anywhere, in either material.
      else if (rawShare(a, b)) regime2.push({ a, b, merged });
    }
  }

  return {
    regime1,
    regime2,
    shouldMerge: regime1.length,
    didMerge: regime1.filter((r) => r.merged).length,
    missed: regime1.filter((r) => !r.merged),
    stranded: regime1.filter((r) => !r.merged),
    abstained,
    shouldWithhold: regime2.length,
    wronglyMerged: regime2.filter((r) => r.merged),
    ambiguous,
    eventId,
  };
}
