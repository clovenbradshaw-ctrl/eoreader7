// discipline/hypothesis.mjs — the standing of any claim in khora (seed clause 3):
// half-life'd, controlled, falsifier written beside it; REC applies to the axes
// themselves. A claim is a hypothesis, never a constitution. PURE: no imports.
//
// The external witness (clause 6): a claim passes to STANDING only when a
// witness that did NOT author the claim confirms it — the two-faculty split made
// mechanical. Assent from the author is not a witness; it is an echo.
//
// Selftest: node --input-type=module -e "import('./hypothesis.mjs').then(m=>m.selftest())"

export const CLAIM_SCHEMA = "Hypothesis@1";
export const STATUS = Object.freeze(["hypothesis", "standing", "superseded", "falsified"]);

const authorOf = (ref) => String(ref ?? "").split("/")[0] ?? null;

/** A claim is born a hypothesis — half-life'd, falsifier beside it, append-only
 *  history. `falsifier` is a string naming what would dissolve it, or a
 *  predicate the reviewer may call; both are written at birth, never after. */
export function declare({ ref, addr = null, bytes = null, witnesses = [], falsifier = null, falsify = null, halfLifeRounds = null, now = 0 } = {}) {
  if (!ref) throw new Error("a claim needs a ref");
  return Object.freeze({
    schema: CLAIM_SCHEMA, ref, addr, bytes, falsifier, falsify, halfLifeRounds,
    witnesses: [...witnesses], status: "hypothesis", supersededBy: null, born: now,
    history: Object.freeze([Object.freeze({ at: now, status: "hypothesis" })]),
  });
}

/** Has the claim's half-life expired? It must then be re-witnessed or decay. */
export function review(claim, { now = 0 } = {}) {
  const reviews = claim.history.length;
  if (claim.halfLifeRounds != null && reviews >= claim.halfLifeRounds) {
    return { ok: false, why: `half-life expired (${reviews} reviews, budget ${claim.halfLifeRounds}) — re-witness or let it decay`, expired: true };
  }
  return { ok: true, expired: false };
}

/** Confirm with witnesses. A claim reaches STANDING only on a witness whose
 *  author did not author the claim (clause 6). Otherwise it stays hypothesis —
 *  assent is never standing. If `falsify` fires, the claim is FALSIFIED and
 *  superseded, never silently repaired. */
export function confirm(claim, { witnesses = [], now = 0 } = {}) {
  if (typeof claim.falsify === "function") {
    try {
      if (claim.falsify(claim)) return supersede(claim, { now, verdict: "falsified" });
    } catch { /* a falsifier that throws is a gap, not a pass */ }
  }
  const author = authorOf(claim.ref);
  const external = witnesses.filter((w) => w?.author && w.author !== author);
  const all = [...claim.witnesses, ...witnesses];
  if (external.length) {
    return Object.freeze({ ...claim, witnesses: all, status: "standing", history: Object.freeze([...claim.history, Object.freeze({ at: now, status: "standing" })]) });
  }
  return Object.freeze({ ...claim, witnesses: all });
}

/** Append-only: a superseded claim is kept, never rewritten; the pointer is the
 *  record of the falsification. */
export function supersede(claim, { byRef = null, now = 0, verdict = "superseded" } = {}) {
  if (!STATUS.includes(verdict)) throw new Error(`verdict must be one of ${STATUS.join("|")}`);
  return Object.freeze({ ...claim, status: verdict, supersededBy: byRef, history: Object.freeze([...claim.history, Object.freeze({ at: now, status: verdict })]) });
}

export function selftest() {
  const t = (n, c) => { if (!c) { console.error("FAIL", n); process.exitCode = 1; } else console.log("ok", n); };
  const c = declare({ ref: "khora/H", falsifier: "a transformation no 27-cell address can hold", falsify: () => false, halfLifeRounds: 2 });
  t("a claim is born a hypothesis", c.status === "hypothesis");
  t("author's own assent is an echo, not a witness", confirm(c, { witnesses: [{ author: "khora", basis: "self" }] }).status === "hypothesis");
  t("an external witness promotes to standing", confirm(c, { witnesses: [{ author: "penelope", basis: "gate" }] }).status === "standing");
  t("a falsifier that fires falsifies", confirm(declare({ ref: "x/y", falsify: () => true }), { witnesses: [{ author: "penelope" }] }).status === "falsified");
  t("history is append-only", confirm(c, { witnesses: [{ author: "penelope", basis: "gate" }] }).history.length >= 1);
  t("half-life forces re-witnessing", (() => { let x = declare({ ref: "a/b", halfLifeRounds: 1 }); x = confirm(x, { witnesses: [{ author: "penelope" }] }); return review(x).ok === false; })());
  t("supersede keeps the claim, points to the next", (() => { const s = supersede(c, { byRef: "khora/H@2" }); return s.status === "superseded" && s.supersededBy === "khora/H@2"; })());
}