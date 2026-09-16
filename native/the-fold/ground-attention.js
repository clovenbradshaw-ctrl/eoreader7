// native/the-fold/ground-attention.js — closes the archon-activation loop:
// router (matchArchons) -> ground-selector collapse -> Nagarjuna veto ->
// one covert, object-level fact. This is the piece earned-cast.js's own
// CAST never had: a criterion whose CHOICE is informed by which archon's
// domain the material touches, without ever naming that archon or quoting
// its words — "not the words of the archon, but their style of thinking"
// (user direction, this session).
//
// THE ROUTER. organs/archon-compendium.js::matchArchons(text) already does
// exactly what the very first design ask wanted ("if a question is
// relevant to these priors, they get priority") — reused as-is, zero
// changes to that file. Its `credit`/`work` fields are for a DIFFERENT,
// explicit-citation use (that module's own "always credited in a
// response" rule) and must never reach this attention's output — only a
// matched archon's `handle` is read here, to look up a ground-criterion,
// never printed.
//
// THE MAP. A small, explicit, hand-reviewed table from archon handle to
// one of ground-selector.js's four criteria — not an invented heuristic
// per call. Only archons whose OWN compendium `role` text plainly names an
// evidentiary-grounding discipline get a slot; most of the ~60 archons are
// not about grounding at all and are correctly absent.
const ARCHON_TO_CRITERION = Object.freeze({
  mozi: "what eyes and ears witnessed", // "it is in the bytes the eyes and ears can witness, or it isn't"
  bukhari: "independent voices", // "stands only on independent chains; shared chain = one witness" — sharedTextGroups' own semantic
  sima: "distinct sources", // "walk past the received account to the archive"
  wigmore: "doubt carried forward", // "ask the witness twice ... verdict from the pair" — checking for reconciliation
});

// THE FACT, per winning criterion — plain, object-level, in the exact
// register earned-cast.js's existing kelsen/ranke/eastwood facts already
// use. Never the archon's name, handle, or the compendium's `credit`/`work`
// strings — bannedHits (earned-cast.js) enforces the ban on CAST names, but
// these strings are checked against it anyway as a second, disclosed line
// of defense, since Mozi/Bukhari/etc. are not in that CAST list at all and
// bannedHits would not otherwise catch a leak of one.
const GROUND_FACT = Object.freeze({
  "distinct sources": "this stands on more than one truly separate source, not one account repeated.",
  "independent voices": "the accounts that agree here are independent of each other, not one voice reprinted.",
  "what eyes and ears witnessed": "one account stands apart as written by someone who was there.",
  "doubt carried forward": "the accounts here diverge and do not reconcile — the doubt stands, not settled either way.",
});

/**
 * groundAttention({ task, records, edges }, deps) — the covert attention.
 *
 * `task` — the turn's own text, handed to matchArchons for routing.
 * `records` — [{ref, text, kind?}], the turn's real material. Absent or
 *   too thin returns `{fired: false, reason: "insufficient_material"}` —
 *   never a fabricated fact.
 * `edges` — optional real EOHyperedge@1 relations for this material, for
 *   Nagarjuna's veto. Absent is honest, not a failure: the veto reports
 *   `insufficient` rather than a silent pass upgraded to "verified".
 *
 * `deps` — injected real organs, so this file carries no import a caller
 *   cannot substitute in a test: `{ matchArchons, groundSelector,
 *   refuteRelation, criteria = ARCHON_TO_CRITERION, groundOpts }`.
 *   `groundOpts` is `{draws, seed, alpha}` — declared by the CALLER
 *   (II.23); this file does not default a threshold nobody chose.
 */
export function groundAttention({ task, records, edges = null } = {}, {
  matchArchons, groundSelector, refuteRelation,
  criteria = ARCHON_TO_CRITERION, groundOpts,
} = {}) {
  if (typeof matchArchons !== "function") throw new TypeError("groundAttention: matchArchons is injected — the real compendium organ, never reimplemented");
  if (typeof groundSelector !== "function") throw new TypeError("groundAttention: groundSelector is injected");
  if (typeof refuteRelation !== "function") throw new TypeError("groundAttention: refuteRelation is injected — Nagarjuna, never skipped by omission");
  if (!groundOpts) throw new TypeError("groundAttention: groundOpts {draws, seed, alpha} is declared by the caller — a threshold nobody chose is not a threshold");

  const list = (records ?? []).filter((r) => r && r.ref && r.text);
  if (list.length < 2) return Object.freeze({ fired: false, reason: "insufficient_material" });

  const matches = matchArchons(String(task ?? ""));
  const wanted = new Set(matches.map((m) => criteria[m.handle]).filter(Boolean));
  if (!wanted.size) return Object.freeze({ fired: false, reason: "no_matched_archon_names_a_criterion" });

  const verdict = groundSelector(list, groundOpts);
  if (verdict.standing !== "collapse") return Object.freeze({ fired: false, reason: `ground_selector_${verdict.standing}`, verdict });
  if (!wanted.has(verdict.winner)) return Object.freeze({ fired: false, reason: "collapse_on_unmatched_criterion", verdict });

  let veto = { standing: "insufficient", reason: "no relation edges offered for this material" };
  if (edges && edges.length) {
    const refutation = refuteRelation(edges, "corroborates", {});
    veto = refutation.power === "insufficient"
      ? { standing: "insufficient", reason: "refuteRelation: below the minimum resolved edges to check" }
      : refutation.refuted
        ? { standing: "refuted", refutation }
        : { standing: "not_refuted", refutation };
  }
  if (veto.standing === "refuted") return Object.freeze({ fired: false, reason: "nagarjuna_veto", verdict, veto });

  const text = GROUND_FACT[verdict.winner];
  return Object.freeze({ fired: true, from: "ground", text, winner: verdict.winner, verdict, veto });
}

export const ARCHON_TO_CRITERION_MAP = ARCHON_TO_CRITERION;
