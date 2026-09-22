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

import { createDocumentLedger, appendLedgerLine, ledgerFilePath } from "./document-ledger.js";
import { signProvisionalKind, corroboration, confirmKind, falsifyOccurrence, CANONICALIZATION_FLOOR } from "../kernel/kind-universe.js";

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
  const features = (paradigm.features ?? []).map((f) => ({ cell: f.cell, key: f.key, slot: f.slot, value: f.value, support: +f.support.toFixed(3), contrast: f.contrast != null ? +f.contrast.toFixed(3) : null, same: f.same ?? undefined }));
  return { schema: paradigm.schema, emergent: !!paradigm.emergent, count: paradigm.count ?? null, scheme: paradigm.scheme ?? null, satisfies: paradigm.satisfies, featureCount: paradigm.all?.length ?? paradigm.features?.length ?? 0, features };
};

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
export function recordExpertise(ex, { name, paradigm, formPrior = null, source, note = "" } = {}) {
  if (!name) throw new TypeError("recordExpertise: name is declared");
  if (paradigm?.refused) throw new TypeError(`recordExpertise: paradigm was refused (${paradigm.refused}) — nothing learned to record`);
  if (!source) throw new TypeError("recordExpertise: source is declared — provenance is not optional");
  const sig = signProvisionalKind(ex.store, { name, source });
  const current = projectExpertise(ex, name);
  const body = compact(paradigm);
  const basis = [
    `learned from ${source}: ${paradigm.instances} instance(s) against ${paradigm.population} population`,
    paradigm.emergent ? `${paradigm.features.length} of ${paradigm.all?.length ?? paradigm.features.length} feature(s) after dominance compression` : `${paradigm.features.length} feature(s)`,
    formPrior ? `expectation: ${formPrior.form?.length ?? 0} slot(s) predictable, learned at instance ${formPrior.learnedAt ?? "—"}` : null,
    note || null,
  ].filter(Boolean).join("; ");
  const line = appendLedgerLine(ex.ledger, {
    role: "paradigm", kind: name, title: `Expertise: ${name}${current ? ` (revision ${(current.revision ?? 1) + 1})` : ""}`,
    text: JSON.stringify({ ...body, formPrior: formPrior ? { form: formPrior.form?.slice(0, 40), learnedAt: formPrior.learnedAt, deltaToForm: [formPrior.bayes?.form?.first, formPrior.bayes?.form?.last] } : null, revision: (current?.revision ?? 0) + 1, source, learnedAt: new Date().toISOString() }),
    giver: "expertise:polanyi", basis, supersedes: current?.id ?? null,
  });
  const corro = corroboration(ex.store, name);
  const conf = confirmKind(ex.store, name);
  return { line, status: sig.status, corroboration: corro, confirmed: conf?.confirmed ?? null, floor: CANONICALIZATION_FLOOR };
}

/** The named form's CURRENT understanding: its latest non-superseded
 *  observation, parsed, or null if this engine has never learned it. */
export function projectExpertise(ex, name) {
  const alive = ex.ledger.lines.filter((l) => l.kind === name && !ex.ledger.superseded.has(l.id));
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

export function expertiseLines(ex, name) {
  const cur = projectExpertise(ex, name);
  if (!cur) return [`${name}: never learned`];
  const out = [`${name} — ${cur.status} (corroborated by ${cur.corroboration}/${CANONICALIZATION_FLOOR} distinct source(s)), revision ${cur.revision}`];
  out.push(`  ${cur.basis}`);
  if (cur.count) out.push(`  ${cur.count} part(s)${cur.scheme ? `, scheme ${cur.scheme}` : ""}`);
  for (const f of cur.features.slice(0, 12)) out.push(`  ${f.key}${f.same?.length ? ` (+${f.same.length} equivalent)` : ""}`);
  return out;
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
