// expertise.js — REC·Paradigm: A REVISABLE RECORD OF WHAT THIS ENGINE HAS
// LEARNED ABOUT A FORM, EVERY LINE TIED TO WHAT PRODUCED IT (2026-09-22).
//
// The user: "mint an archon for 'expertise' and consolidate all we've
// learned about how to understand a medium. we want to save a revisable EOT
// file on 'expertise' tied to what influenced it, and then task that archon
// … to go learn about things and record what it finds to that log … all
// provenance saved." This module is that record. It invents no new
// mechanism — it wires together what this session already built and what
// the engine already had:
//
//   the DEFINITION    learnParadigmEmergent / learnForm (paradigm.js,
//                      form-prior.js) — a form's shape, compressed, measured
//                      against a relative ground, nothing about the form
//                      written in.
//   THE REVISABLE LOG  document-ledger.js's own append-only ledger: an
//                      observation per learning pass, `kind` = the form's
//                      name, `supersedes` the observation it revises — the
//                      SAME discipline the generation pipeline's own ledger
//                      already uses for every other revisable fact. Nothing
//                      is edited; a later pass appends and points back.
//   PROVENANCE         every observation's `basis` names its sources (which
//                      corpus, how many instances, how many population,
//                      when) — read straight off learnParadigm's own
//                      `sources`/`instances`/`population` fields.
//   PROVISIONAL →      kernel/kind-universe.js's own store: a kind is
//   CORROBORATED       provisional on its first signing and confirmed once
//                      distinct sources corroborate it (CANONICALIZATION_
//                      FLOOR = 2) — the same machinery organs/mnemonic.js
//                      already uses for a taught image concept, applied here
//                      to a taught FORM. A later pass that finds the same
//                      form from a DIFFERENT source corroborates it; a pass
//                      whose measured shape genuinely disagrees is the
//                      caller's to falsify (falsifyOccurrence), never
//                      silently overwritten.
//
// A form's CURRENT expertise is the projection: its latest non-superseded
// observation. Everything before it stays on the ledger, on the record.

import crypto from "node:crypto";
import { createDocumentLedger, appendLedgerLine, ledgerFilePath } from "./document-ledger.js";
import { signProvisionalKind, corroboration, confirmKind, falsifyOccurrence, CANONICALIZATION_FLOOR } from "../kernel/kind-universe.js";
import { elementsOf } from "./medium.js";
import { emergentFacts } from "./form-prior.js";
import { ABSENT } from "../kernel/bayes-surprise.js";

/** sha256 of exact bytes — so a source can be re-fetched and checked, not
 *  merely named. Hex, the same form git and every other checksum here uses. */
export const sha256 = (bytes) => crypto.createHash("sha256").update(String(bytes ?? ""), "utf8").digest("hex");

export const EXPERTISE_SCHEMA = "EOExpertise@1";
export const EXPERTISE_DOC_ID = "expertise:1";

/** A fresh ledger + kind store, the way a caller starts one (in memory; the
 *  disk file is the caller's — loadExpertise/saveExpertise below). */
export function createExpertise() {
  return { schema: EXPERTISE_SCHEMA, ledger: createDocumentLedger({ docId: EXPERTISE_DOC_ID, title: "Expertise: what this engine has learned about each form" }), store: { concepts: {} } };
}

const compact = (paradigm) => {
  // The KEPT set (paradigm.features) is what is stored — already compressed
  // by dominance (paradigm.js): every fold's `same` names still ride along,
  // so nothing dominated is lost, only said once. `featureCount` is the
  // uncompressed total this pass actually looked at, for reference only.
  const features = (paradigm.features ?? []).map((f) => ({ cell: f.cell, key: f.key, slot: f.slot, value: f.value, support: +f.support.toFixed(3), contrast: f.contrast != null ? +f.contrast.toFixed(3) : null, same: f.same ?? undefined, gloss: glossFeature(f), groundedAt: f.groundedAt ?? undefined }));
  return { schema: paradigm.schema, emergent: !!paradigm.emergent, count: paradigm.count ?? null, scheme: paradigm.scheme ?? null, satisfies: paradigm.satisfies, featureCount: paradigm.all?.length ?? paradigm.features?.length ?? 0, features };
};

// ── plain-language competency parameters (2026-09-22) ───────────────────
// The user: "it should have a coherent and intelligible set of parameters
// that explain what it means to be competent at generating this content."
// A slot key like "heading@0:syllables=5" is exact but not READABLE — this
// mechanically (never by asking a model) turns a feature's own slot/value
// into one plain clause. Pure text transform of the SAME measured fact,
// nothing inferred beyond what form-prior.js's own slot grammar encodes
// (SIG "this attribute is this value at this position", CON "equals an
// earlier position's", SYN "is the successor of an earlier position's",
// "*:" a whole-class constant — see form-prior.js's own header comment).
function subjectPhrase(slot) {
  let m;
  if ((m = /^key:([^.]+)\.(.+)$/.exec(slot))) return `its "${m[1]}" field's ${m[2]}`;
  if ((m = /^count:(.+)$/.exec(slot))) return `the number of "${m[1]}" elements`;
  if ((m = /^has-marker:(.+)$/.exec(slot))) return `the presence of a "${m[1]}" marker`;
  if ((m = /^has:(.+)$/.exec(slot))) return `the presence of a "${m[1]}" element`;
  if ((m = /^field:(.+)$/.exec(slot))) return `its "${m[1]}" field`;
  if ((m = /^heading#(\d+)$/.exec(slot))) return `its heading #${m[1]}`;
  if ((m = /^([\w-]+)\*:(.+)$/.exec(slot))) return `every "${m[1]}"'s ${m[2]}`;
  if ((m = /^([\w-]+)?@(\d+):(.+)$/.exec(slot))) return `the "${m[1] || "line"}" at position ${m[2]}'s ${m[3]}`;
  return `"${slot}"`;
}

export function glossFeature(f) {
  const slot = String(f?.slot ?? "");
  const value = f?.value;
  if (slot.endsWith("=")) return `${subjectPhrase(slot.slice(0, -1))} matches an earlier one in the same document (${JSON.stringify(value)})`;
  if (slot.endsWith("+1")) return `${subjectPhrase(slot.slice(0, -2))} follows on from an earlier one (${JSON.stringify(value)})`;
  return `${subjectPhrase(slot)} is ${JSON.stringify(value)}`;
}

/**
 * competencyStatement(cur) → a plain paragraph (string), built ONLY from
 * this form's own stored, measured features — never a model's phrasing of
 * what the form "is." When features carry `groundedAt` (learn-pass.js's
 * multi-ground tiering — the user: "many grounds to zero upon … adjusting
 * based on where you're looking from"), a feature true against every
 * ground offered is named as the STRONGER signal; one true only against
 * the broadest ground (plain, unrelated prose) is named as the weaker one.
 */
export function competencyStatement(cur) {
  if (!cur || !cur.features?.length) return "Nothing measured yet.";
  const glosses = cur.features.map((f) => f.gloss ?? glossFeature(f));
  const tiers = cur.features.some((f) => f.groundedAt?.length);
  const strong = tiers ? cur.features.filter((f) => (f.groundedAt?.length ?? 0) >= 2) : [];
  const weak = tiers ? cur.features.filter((f) => (f.groundedAt?.length ?? 0) < 2) : [];
  const lines = [`To be competent at "${cur.title?.replace(/^Expertise: /, "").replace(/ \(revision.*/, "") ?? ""}" means reliably producing text where ${glosses.length === 1 ? glosses[0] : glosses.slice(0, -1).join("; ") + "; and " + glosses.at(-1)}.`];
  if (tiers && strong.length) lines.push(`Of these, ${strong.length} hold even against OTHER material found while searching for this form — the stronger, more specific signal(s): ${strong.map((f) => f.gloss ?? glossFeature(f)).join("; ")}.`);
  if (tiers && weak.length) lines.push(`${weak.length} hold only against ordinary, unrelated prose — a broader signal (marks this as shaped/formal writing at all, not this form specifically): ${weak.map((f) => f.gloss ?? glossFeature(f)).join("; ")}.`);
  return lines.join(" ");
}

/**
 * recordExpertise(ex, { name, paradigm, formPrior, source, note }) → the
 * appended observation.
 *   ex        an in-memory createExpertise() (or one loaded from disk)
 *   name      the form's name — the kind (never asserted by paradigm.js
 *             itself; the caller names what it went to learn)
 *   paradigm  a learnParadigm / learnParadigmEmergent result
 *   formPrior an optional learnForm result (the expectation side)
 *   source    a short id for WHERE this pass's instances came from (a
 *             corpus directory, a URL, "wikipedia:Category:X") — the
 *             provenance kind-universe.js corroborates against
 *   note      free text, appended to the basis, for anything not carried by
 *             the paradigm itself
 */
export function recordExpertise(ex, { name, paradigm, formPrior = null, source, note = "", sources = null, activation = null } = {}) {
  if (!name) throw new TypeError("recordExpertise: name is declared");
  if (paradigm?.refused) throw new TypeError(`recordExpertise: paradigm was refused (${paradigm.refused}) — nothing learned to record`);
  if (!source) throw new TypeError("recordExpertise: source is declared — provenance is not optional");
  const sig = signProvisionalKind(ex.store, { name, source });
  const current = projectExpertise(ex, name);
  const body = compact(paradigm);
  // HARD PROVENANCE (2026-09-22, the user: "genuinely recording the activity
  // so we can prove"): `sources`, when the caller has the raw fetched bytes,
  // is [{ url, chars, sha256 }] — a checksum of the EXACT bytes read, not
  // just a name. A source can be re-fetched and checked against this hash;
  // a mismatch is a fact about the source changing, not this record lying.
  const provenance = (sources ?? []).map((s) => ({ url: s.url, chars: s.text?.length ?? s.chars ?? null, sha256: s.sha256 ?? (s.text != null ? sha256(s.text) : null) }));
  const basis = [
    `learned from ${source}: ${paradigm.instances} instance(s) against ${paradigm.population} population`,
    paradigm.emergent ? `${paradigm.features.length} of ${paradigm.all?.length ?? paradigm.features.length} feature(s) after dominance compression` : `${paradigm.features.length} feature(s)`,
    formPrior ? `expectation: ${formPrior.form?.length ?? 0} slot(s) predictable, learned at instance ${formPrior.learnedAt ?? "—"}` : null,
    provenance.length ? `${provenance.length} source(s) hashed (sha256)` : "NO SOURCE HASHES — sources named but not checksummed",
    note || null,
  ].filter(Boolean).join("; ");
  const line = appendLedgerLine(ex.ledger, {
    role: "paradigm", kind: name, title: `Expertise: ${name}${current ? ` (revision ${(current.revision ?? 1) + 1})` : ""}`,
    text: JSON.stringify({ ...body, formPrior: formPrior ? { form: formPrior.form?.slice(0, 40), learnedAt: formPrior.learnedAt, deltaToForm: [formPrior.bayes?.form?.first, formPrior.bayes?.form?.last] } : null, activation, revision: (current?.revision ?? 0) + 1, source, sources: provenance, learnedAt: new Date().toISOString() }),
    giver: "mechanical:learnParadigmEmergent+learnForm", basis, supersedes: current?.id ?? null,
  });
  const corro = corroboration(ex.store, name);
  const conf = confirmKind(ex.store, name);
  return { line, status: sig.status, corroboration: corro, confirmed: conf?.confirmed ?? null, floor: CANONICALIZATION_FLOOR };
}

// ── the belief log: what "competency" itself means, to this archon ────────
// The user: "competency without surprise is nothing, make sure the archon
// understands that and has a running log of what they believe competency
// is." This is a DIFFERENT kind of record than a form's paradigm (REC·
// Paradigm above, which is revisable — a later measurement SUPERSEDES an
// earlier one because it was wrong). A belief about competency-in-general
// is not superseded when it deepens; it ACCRETES — every entry stays, in
// order, the way a diary does, because what was understood then is still
// true of then. Nothing here is ever "corrected" by deletion.
export const BELIEF_KIND = "competency-philosophy";

/**
 * recordBelief(ex, { statement, basis, evidence, giver }) → appended entry.
 *   statement  the claim itself, plain language
 *   basis      what measured event grounds it (a real run's numbers, never
 *              "it seems like")
 *   evidence   optional structured data (e.g. a run's instances/population/
 *              activation) so the claim is checkable against what produced it
 *   giver      "archon:polanyi" for a standing philosophical position this
 *              archon holds; "mechanical:<fn>" for a note auto-derived from
 *              one run's own numbers (learn-pass.js's beliefFromRun) — kept
 *              distinct so a reader can tell reflection from raw derivation
 */
export function recordBelief(ex, { statement, basis, evidence = null, giver = "archon:polanyi" } = {}) {
  if (!statement) throw new TypeError("recordBelief: statement is declared");
  const seq = ex.ledger.lines.filter((l) => l.kind === BELIEF_KIND && l.role === "belief").length + 1;
  const line = appendLedgerLine(ex.ledger, {
    role: "belief", kind: BELIEF_KIND,
    title: `Belief #${seq}: ${statement.slice(0, 60)}${statement.length > 60 ? "…" : ""}`,
    text: JSON.stringify({ statement, evidence, seq, at: new Date().toISOString() }),
    giver, basis: basis || "",
  });
  return { line, seq };
}

/** The whole running log, oldest first — nothing superseded, nothing hidden. */
export function beliefLog(ex) {
  return ex.ledger.lines.filter((l) => l.kind === BELIEF_KIND && l.role === "belief").map((l) => ({ ...JSON.parse(l.text), id: l.id, basis: l.basis, giver: l.giver, appendedAt: l.appendedAt }));
}

/** The most recent entry — "what this archon currently believes," while the
 *  full beliefLog keeps every earlier position too. */
export function currentBelief(ex) {
  const log = beliefLog(ex);
  return log.at(-1) ?? null;
}

/** The named form's CURRENT understanding: its latest non-superseded
 *  paradigm observation, parsed, or null if this engine has never learned
 *  it. Filtered to role:"paradigm" — a role:"demonstration" line carries
 *  the same `kind` (it is ABOUT that form) but no `features`, and must
 *  never become "current expertise" just by being the most recent line. */
export function projectExpertise(ex, name) {
  const alive = ex.ledger.lines.filter((l) => l.kind === name && l.role === "paradigm" && !ex.ledger.superseded.has(l.id));
  const last = alive.at(-1);
  if (!last) return null;
  const body = JSON.parse(last.text);
  return { ...body, id: last.id, title: last.title, basis: last.basis, appendedAt: last.appendedAt, status: ex.store.concepts?.[name]?.status ?? "provisional", corroboration: corroboration(ex.store, name) };
}

/** Every form this engine has ever recorded expertise for, current only. */
export function knownForms(ex) {
  return [...new Set(ex.ledger.lines.map((l) => l.kind).filter(Boolean))];
}

/** A form's whole revision history, oldest first (superseded lines included —
 *  the record everything before the current understanding stays on). */
export function expertiseHistory(ex, name) {
  return ex.ledger.lines.filter((l) => l.kind === name).map((l) => ({ ...JSON.parse(l.text), id: l.id, basis: l.basis, appendedAt: l.appendedAt, superseded: ex.ledger.superseded.has(l.id) }));
}

/** A later pass's own measurement disagreed: mark this form's provisional
 *  signing at `source` refuted, without erasing the ledger line it came
 *  from (the-fold's own rule — a revision, never an edit). */
export function falsifyExpertise(ex, name, source, { reason } = {}) {
  const entry = ex.store.concepts?.[name];
  const occ = entry?.occurrences?.find((o) => o.source === source && !o.falsified);
  if (!occ) return { falsified: 0 };
  return falsifyOccurrence(ex.store, name, occ.id, { by: "expertise:polanyi", reason });
}

/**
 * scoreAgainstExpertise(cur, candidateText) → { score, held, of, checks }
 * Recomputes a candidate's score against a CURRENT expertise projection's
 * own stored (compressed) features — using nothing but what is already on
 * the ledger line and the candidate text. This is the check: hand this
 * function a ledger entry's `text` and its `baseline`/`shaped` field and it
 * reproduces the SAME score recorded there, or it does not, and that
 * disagreement is itself a fact. No model, no hidden state.
 */
export function scoreAgainstExpertise(cur, candidateText) {
  const facts = emergentFacts({ elements: elementsOf(candidateText).elements });
  const checks = (cur.features ?? []).map((f) => ({ key: f.key, held: String(facts.has(f.slot) ? facts.get(f.slot) : ABSENT) === String(f.value) }));
  const held = checks.filter((c) => c.held).length;
  return { score: checks.length ? held / checks.length : 0, held, of: checks.length, checks };
}

const article = (w) => (/^[aeiou]/i.test(w) ? "an" : "a");

/**
 * demonstrateExpertise(ex, name, { draw, model, base }) → { line, baseline,
 *   shaped, baselineScore, shapedScore, delta }
 *
 * THE PROOF the user asked for: "genuinely recording the activity so we can
 * prove that competency was learned by a local model in this way." The
 * SHAPE is never learned by the model — learnParadigmEmergent/learnForm are
 * pure measurement, recorded above under a mechanical giver, not Polanyi's
 * or any model's. What a model CAN be shown to do is write BETTER once
 * handed that measured shape as information (Gary: information, never a
 * rule to imitate in language — "model is just the mouth"): `draw` is
 * called TWICE with the SAME open ask, once bare, once with the current
 * expertise's own lines (facts, not instructions) appended.
 *
 * `base` (optional): a real, UNCHOSEN piece of material to write FROM — the
 * user: "have it try to generate something in that modality based on a
 * random Wikipedia article… so there is a base to draw from." When given
 * (wiki-base.js's fetchWikipediaBase result: { url, title, text }), BOTH
 * asks require the reply to draw its content from that material, so a good
 * score cannot come from reciting a memorized stock example — the model
 * must produce genuinely NOVEL content in the modality. Its provenance
 * (url + sha256) is stored on the ledger line, honestly, as what the model
 * actually wrote from. Without `base`, the ask is the old open form ask.
 *
 * Both replies, both prompts, the model's name, the base's provenance if
 * any, and both scores — recomputable by scoreAgainstExpertise on the
 * stored text alone — are appended to the SAME ledger as a "demonstration"
 * line, given by the model itself, never by Polanyi: this line is the
 * model's own output, not the engine's measurement.
 */
export async function demonstrateExpertise(ex, name, { draw, model = "unknown", maxTokens = 260, base = null } = {}) {
  if (typeof draw !== "function") throw new TypeError("demonstrateExpertise: draw (the local model's own call) is declared");
  const cur = projectExpertise(ex, name);
  if (!cur) throw new TypeError(`demonstrateExpertise: "${name}" has never been learned — nothing to demonstrate against`);
  const material = base?.text ? `\n\nDraw its content from this real material (do not just describe it — use it as your subject):\n${base.text.slice(0, 3000)}` : "";
  const ask = `Write ${article(name)} ${name}.${material}`;
  const baseline = String(await draw([{ role: "user", content: ask }], maxTokens) ?? "");
  const baselineScore = scoreAgainstExpertise(cur, baseline);
  const shapeInfo = expertiseLines(ex, name).slice(1).join("\n");
  const shapedPrompt = `${ask} Here is what is measured about this form, from real examples:\n${shapeInfo}`;
  const shaped = String(await draw([{ role: "user", content: shapedPrompt }], maxTokens) ?? "");
  const shapedScore = scoreAgainstExpertise(cur, shaped);
  const delta = shapedScore.score - baselineScore.score;
  const baseProvenance = base?.text ? { url: base.url, title: base.title ?? null, chars: base.text.length, sha256: sha256(base.text) } : null;
  const line = appendLedgerLine(ex.ledger, {
    role: "demonstration", kind: name,
    title: `Demonstration: ${name} — ${model}, unshaped ${Math.round(baselineScore.score * 100)}% → shaped ${Math.round(shapedScore.score * 100)}%${base ? " (grounded in a random article)" : ""}`,
    text: JSON.stringify({ model, expertiseRevision: cur.revision, base: baseProvenance, prompt: ask, baseline, baselineScore, shapedPrompt, shaped, shapedScore, delta, at: new Date().toISOString() }),
    giver: `model:${model}`,
    basis: `the SAME ${cur.features.length} measured feature(s) (expertise revision ${cur.revision}) scored against two real completions from ${model}${base ? `, both drawing on the same ${base.chars}-char base article (sha256 checkable)` : ""}: unshaped ${(baselineScore.score * 100).toFixed(0)}% (${baselineScore.held}/${baselineScore.of}), given the measured shape as information ${(shapedScore.score * 100).toFixed(0)}% (${shapedScore.held}/${shapedScore.of}) — recompute with scoreAgainstExpertise on this line's own \`baseline\`/\`shaped\` text to check${delta > 0 ? "; the shape measurably helped" : delta < 0 ? "; the shape did NOT measurably help — reported as measured, not smoothed over" : "; no measured difference"}`,
  });
  return { line, baseline, shaped, baselineScore, shapedScore, delta };
}

export function expertiseLines(ex, name) {
  const cur = projectExpertise(ex, name);
  if (!cur) return [`${name}: never learned`];
  const out = [`${name} — ${cur.status} (corroborated by ${cur.corroboration}/${CANONICALIZATION_FLOOR} distinct source(s)), revision ${cur.revision}`];
  out.push(`  ${cur.basis}`);
  if (cur.count) out.push(`  ${cur.count} part(s)${cur.scheme ? `, scheme ${cur.scheme}` : ""}`);
  for (const f of cur.features.slice(0, 12)) out.push(`  ${f.key}${f.same?.length ? ` (+${f.same.length} equivalent)` : ""}`);
  return out;
}

const slugify = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form";

/**
 * foldManual(cur, name) → a markdown string, a Claude-Skills-shaped
 * instruction manual (frontmatter `name`/`description`, then sections) —
 * mechanically ASSEMBLED from the ledger's own stored fields (compact()'s
 * `features`/`gloss`/`groundedAt`, `activation`, `sources` provenance,
 * `status`/`corroboration`/`revision`). The user: "the manual is MD but
 * that is a FOLD of the ledger" — every line here is read off `cur`
 * (a projectExpertise result), nothing composed by a model. `cur === null`
 * (nothing learned yet) folds to an honest, empty-handed manual rather
 * than refusing outright, so a caller can always render/save something.
 */
export function foldManual(cur, name) {
  const slug = slugify(name);
  if (!cur) {
    return [`---`, `name: ${slug}`, `description: Nothing has been measured about "${name}" yet — no manual can be written.`, `---`, ``, `# ${name}`, ``, `Nothing recurs here yet. No instance of "${name}" has been read.`, ``].join("\n");
  }
  const heldCount = cur.features?.length ?? 0;
  const description = heldCount
    ? `${competencyStatement(cur).split(". ")[0]}. (${cur.status}, corroborated by ${cur.corroboration}; revision ${cur.revision}.)`
    : `${cur.status} (revision ${cur.revision}) — no feature yet measurably distinguishes "${name}" from its ground(s).`;
  const lines = [
    `---`, `name: ${slug}`, `description: ${description.replace(/\n/g, " ")}`, `---`, ``,
    `# ${name}`, ``,
    heldCount ? competencyStatement(cur) : `Nothing measured yet reliably distinguishes "${name}" from its comparison ground(s) — this is an honest null, not a missing measurement.`,
    ``,
  ];
  if (heldCount) {
    lines.push(`## Measured signals`, ``);
    for (const f of cur.features) {
      const tier = f.groundedAt?.length === 2 ? "strong — holds against both grounds" : f.groundedAt?.length === 1 ? "broad — holds only against plain prose" : "measured";
      lines.push(`- ${f.gloss ?? f.key} _(${tier}${f.same?.length ? `; +${f.same.length} equivalent fact(s)` : ""})_`);
    }
    lines.push(``);
  }
  if (cur.formPrior?.form?.length) {
    lines.push(`## What tends to come next`, ``, `Learned at instance ${cur.formPrior.learnedAt ?? "—"}: ${cur.formPrior.form.length} slot(s) are somewhat predictable once earlier instances are seen (the expectation side — a separate measure from the recurring signals above).`, ``);
  }
  if (cur.activation) {
    const a = cur.activation;
    lines.push(
      `## How sure is this`, ``,
      `${a.admissions} real instance(s) were read one at a time into a fresh holograph — this engine held no prior belief about "${name}" going in.`,
      `Mean Bayesian surprise ${a.stabilizing ? "fell" : "did not fall"} across readings: ${a.meanBayesEarlyHalf} → ${a.meanBayesLateHalf} bits.`,
      a.stabilizing
        ? `Later readings corroborated rather than surprised — this is what real corroboration looks like, not a rule asserted from one example.`
        : `This has not stabilized on this few readings — treat this manual as provisional even where a signal above reads "strong."`,
      ``,
    );
  }
  const provenance = cur.sources ?? [];
  lines.push(`## Provenance`, ``, `Source: \`${cur.source ?? "—"}\`. Learned ${cur.learnedAt ?? "—"}.`, ``);
  if (provenance.length) {
    lines.push(`| source | chars | sha256 |`, `|---|---|---|`);
    for (const s of provenance) lines.push(`| ${s.url} | ${s.chars ?? "—"} | \`${(s.sha256 ?? "—").slice(0, 16)}…\` |`);
    lines.push(``, `Recheck any row by re-fetching its URL and comparing its sha256 — a mismatch is a fact about the source changing, not this manual lying.`, ``);
  } else {
    lines.push(`No source hashes are on record for this revision.`, ``);
  }
  if (!heldCount || cur.status !== "confirmed") {
    lines.push(`## Open questions`, ``);
    if (!heldCount) lines.push(`- Nothing measurable recurs yet against this ground — try a nearer, more specific comparison population, or read more real instances.`);
    if (cur.status !== "confirmed") lines.push(`- Not yet confirmed: needs a second, DISTINCT source to corroborate before this counts as more than provisional.`);
    lines.push(`- This form may itself span more than one real paradigm (e.g. a stance/sector split) — a single flattened manual can hide that; check for a stance-scoped sibling before trusting this as the whole story.`, ``);
  }
  return lines.join("\n");
}

// ── disk persistence (the memory/ convention organs/mnemonic.js already uses) ──
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const EXPERTISE_STORE_PATH = path.join(HERE, "..", "memory", "expertise-store.json");
const DOCS = path.join(HERE, "..", "..", "documents");

/** Load the expertise ledger from documents/expertise:1.jsonl (the same file
 *  appendLedgerLine has been writing to) and the kind store from disk; a
 *  missing file is an honest empty start, never a crash. */
export function loadExpertise() {
  const ex = createExpertise();
  // The ledger is rebuilt from its own JSONL lines directly (append-only —
  // no projection helper is needed to recover `kind`/`supersedes`, which
  // appendLedgerLine already wrote verbatim).
  try {
    for (const raw of fs.readFileSync(ledgerFilePath(DOCS, EXPERTISE_DOC_ID), "utf8").split("\n")) {
      if (!raw.trim()) continue;
      const line = JSON.parse(raw);
      ex.ledger.lines.push(line);
      if (line.supersedes) for (const id of [].concat(line.supersedes)) ex.ledger.superseded.add(id);
    }
  } catch {}
  try { ex.store = JSON.parse(fs.readFileSync(EXPERTISE_STORE_PATH, "utf8")); } catch {}
  return ex;
}

/** Persist the kind store AND the ledger. The ledger file is rewritten from
 *  ex.ledger.lines in full each save — append-only in what it MEANS (no line
 *  is ever edited, only appended and later marked superseded), not
 *  necessarily in how the bytes reach disk; the in-memory ledger is the
 *  single source of truth either way, and this keeps the file byte-identical
 *  to it, which incremental appendLedgerLine writes (this module never calls
 *  it with a `dir`) would not otherwise guarantee across a load/record/save
 *  round trip. */
export function saveExpertise(ex) {
  fs.mkdirSync(path.dirname(EXPERTISE_STORE_PATH), { recursive: true });
  fs.writeFileSync(EXPERTISE_STORE_PATH, JSON.stringify(ex.store, null, 2));
  fs.mkdirSync(DOCS, { recursive: true });
  fs.writeFileSync(ledgerFilePath(DOCS, ex.ledger.docId), ex.ledger.lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
}
