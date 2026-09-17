// adapters/code/anchors.js — turning a document's citations into REAL byte
// anchors, and a claim's load-bearing terms into verifiable facts.
//
// A doc like the STR jobs analysis cites types, fields, ids, operations,
// tables, and product names. Most of those are checkable against artifacts
// this repo actually holds — a Swarm introspection, the Slate/BB field index,
// the compiled-bundle operation index, and the bundle itself. This adapter is
// the resolution layer: it extracts the cited terms, resolves each against the
// artifacts, and reports — for every term — whether it is anchored in real
// bytes, at what offset, and (for a `Type.field` claim) whether the field
// actually exists on that type.
//
// DISCIPLINES (the what-organ's law set, applied to citations):
//   - AN ANCHOR IS A BYTE ADDRESS, NOT A MATCH. A term is anchored only where
//     its actual bytes appear in an artifact, with the offset recorded.
//   - ABSENCE IS A RESULT, NOT A GAP. A term that resolves nowhere is reported
//     `unfound` — that is a real fact about the artifacts (the Azora search,
//     `Asset.contact`), never silently dropped and never guessed around.
//   - TYPE/FIELD IS CHECKED, NOT ASSUMED. For `Type.field`, the field is looked
//     up in the type's own field list when the artifact carries one; a missing
//     field is `field_absent`, a type that is absent is `type_absent`.
//   - DATA-LEVEL IDs ARE MARKED. A `Type.id: 1234` is a data record reference;
//     the TYPE is anchored, the id itself is marked `data_level` (schema
//     artifacts cannot witness instance rows) rather than claimed as schema.

import fs from "node:fs";

// ── artifact loading ─────────────────────────────────────────────────────
// specs: [{ id, kind, path, text? }]. kind ∈
//   "introspection" — a GraphQL introspection JSON (types with kind + fields)
//   "field-index"  — { Type: [fields] } (the Slate/BB field index)
//   "ops-index"    — a BundleOpsIndex@1 ({ rows: [{name,op,fields,offset,…}] })
//   "raw"          — plain text (the bundle itself)
// loadArtifacts reads each file ONCE and returns the resolved structures, so a
// caller can resolve many terms against the same loaded artifacts.
export function loadAnchorArtifacts(specs) {
  const swarmTypes = new Map();
  const slateTypes = new Map();
  const ops = new Map();
  const raws = [];
  const texts = new Map();
  for (const spec of specs ?? []) {
    const text = spec.text ?? fs.readFileSync(spec.path, "utf8");
    texts.set(spec.id, text);
    if (spec.kind === "introspection") {
      const doc = JSON.parse(text);
      for (const t of doc.__schema?.types ?? []) swarmTypes.set(t.name, t);
    } else if (spec.kind === "field-index") {
      const doc = JSON.parse(text);
      for (const [name, fields] of Object.entries(doc)) slateTypes.set(name, Array.isArray(fields) ? fields : []);
    } else if (spec.kind === "ops-index") {
      const doc = JSON.parse(text);
      for (const r of doc.rows ?? []) ops.set(r.name, r);
    } else if (spec.kind === "raw") {
      raws.push({ id: spec.id, path: spec.path ?? null, text });
    }
  }
  return { swarmTypes, slateTypes, ops, raws, texts };
}

// The canonical four-artifact spec for the STR work — the same set every
// anchoring run in this engagement reads, so anchors are comparable across runs.
export function strArtifactSpecs(root = "/Users/mlacy/Documents/3.0") {
  return [
    { id: "swarm", kind: "introspection", path: `${root}/swarm_graphql_schema.json` },
    { id: "slate", kind: "field-index", path: `${root}/slate_api_key_types.json` },
    { id: "ops", kind: "ops-index", path: `${root}/bundle-ops-index.json` },
    { id: "bundle", kind: "raw", path: `${root}/index-px14EQkj.js` },
  ];
}

// ── term extraction ──────────────────────────────────────────────────────
// Pull the cited identifiers out of a document, each with the kind that decides
// how it is resolved. `line` and `offset` are the citing context.
const DOTTED = /\b[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+/g;
const TYPE_ID = /\b([A-Z][A-Za-z0-9]*)\.id:\s*(\d+)/g;
const BACKTICK = /`([A-Za-z_][A-Za-z0-9_]*)`/g;
const QUOTED_TITLE = /"([A-Z][A-Za-z ,'&–-]{3,})"/g;
const TABLE = /\b[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*/g;

export function extractAnchorTerms(text) {
  const seen = new Map();
  const add = (term, kind, line, offset) => {
    if (!term || seen.has(`${kind}\u0000${term}`)) return;
    seen.set(`${kind}\u0000${term}`, { term, kind, line, offset });
  };
  const lines = String(text ?? "").split("\n");
  lines.forEach((line, li) => {
    let m;
    TYPE_ID.lastIndex = 0;
    while ((m = TYPE_ID.exec(line))) add(m[1], "type.id", li, m.index + m[0].indexOf(m[1]));
    DOTTED.lastIndex = 0;
    while ((m = DOTTED.exec(line))) {
      const parts = m[0].split(".");
      if (/^[a-z]/.test(parts[0]) && parts[0].length > 1 && parts[0].includes("_") === false) add(m[0], "type.field", li, m.index);
      else if (parts[0].includes("_") || /^[a-z]/.test(parts[0])) add(m[0], "table", li, m.index);
      else add(m[0], "type.field", li, m.index);
    }
    BACKTICK.lastIndex = 0;
    while ((m = BACKTICK.exec(line))) add(m[1], /^[A-Z]/.test(m[1]) ? "type" : "identifier", li, m.index);
    QUOTED_TITLE.lastIndex = 0;
    while ((m = QUOTED_TITLE.exec(line))) {
      // A quoted RECORD TITLE is short ("STR Listings", "Nights Booked to
      // Date") — a long quoted phrase is prose, not a title; a title cap of 4
      // words keeps record names without flooding the term set with quoted
      // sentences.
      const words = m[1].split(/\s+/).length;
      if (words <= 4 && m[1].length <= 40) add(m[1], "title", li, m.index);
    }
  });
  return [...seen.values()];
}

// ── resolution ───────────────────────────────────────────────────────────
// Where a term is anchored: [{ file, offset, snippet }] — every entry a real
// byte address. `status` is the verdict:
//   anchored      — bytes found in an artifact
//   field_confirmed — the cited Type.field both exist (type has the field)
//   field_absent  — the Type exists but the cited field is not in its field list
//   type_absent   — the Type resolves nowhere
//   data_level    — a Type.id: the TYPE is anchored, the id is a data value
//   unfound       — resolves in no artifact
function snippetOf(text, offset, span = 64) {
  return String(text.slice(Math.max(0, offset - 8), offset + span)).replace(/\s+/g, " ").trim();
}

function anchorIn(artifact, fileId, offset) {
  return { file: fileId, offset, snippet: artifact?.text ? snippetOf(artifact.text, offset) : null };
}

export function resolveTerm(term, kind, artifacts) {
  const { swarmTypes, slateTypes, ops, raws, texts } = artifacts;
  const swarmText = texts?.get("swarm");
  const slateText = texts?.get("slate");
  const rawText = texts?.get("bundle");

  // operation name — the ops index's own byte anchor (into the bundle)
  if (kind === "identifier") {
    const op = ops.get(term);
    if (op) return { term, kind, status: "anchored", anchor: { file: "ops", bundleOffset: op.offset, op, snippet: `${op.op} ${term} (${op.fields.length} fields)` }, fieldPresence: null };
    // an operation whose case differs (GetMigrations vs getMigrations)
    const folded = [...ops.values()].find((r) => r.name.toLowerCase() === term.toLowerCase());
    if (folded) return { term, kind, status: "anchored", anchor: { file: "ops", bundleOffset: folded.offset, op: folded, snippet: `${folded.op} ${folded.name} (${folded.fields.length} fields) — cited as "${term}"` }, fieldPresence: null };
  }

  // Type.field — check the field list on the type wherever the type is defined
  if (kind === "type.field") {
    const [type, field, ...rest] = term.split(".");
    const swarm = swarmTypes.get(type);
    const slate = slateTypes.get(type);
    const inSwarmField = swarm?.fields?.some((f) => f.name === field);
    const inSlateField = Array.isArray(slate) && slate.includes(field);
    const op = [...ops.values()].find((r) => r.fields.includes(field) && (r.fields.includes(type.toLowerCase()) || r.types?.includes(type)));
    if (swarm || slate) {
      const present = inSwarmField || inSlateField;
      const base = { term, kind, status: present ? "field_confirmed" : "field_absent" };
      if (swarm) {
        const at = swarmText?.indexOf(`"${type}"`);
        base.swarmField = inSwarmField;
        if (at >= 0) base.swarmAnchor = { file: "swarm", offset: at };
      }
      if (slate) { base.slateField = inSlateField; base.slateFields = slate; }
      if (op) base.opWitness = { name: op.name, op: op.op, offset: op.offset, fieldInOp: op.fields.includes(field) };
      return base;
    }
    // type absent from both schema surfaces — is it in the raw bundle?
    for (const raw of raws) {
      const at = raw.text.indexOf(type);
      if (at >= 0) return { term, kind, status: "type_absent", rawWitness: { file: raw.id, offset: at, snippet: snippetOf(raw.text, at) }, field: field, fieldInOp: op?.fields.includes(field) ?? false };
    }
    return { term, kind, status: "type_absent", field, fieldInOp: op?.fields.includes(field) ?? false };
  }

  // Type.id: n — anchor the type; the id is data-level
  if (kind === "type.id") {
    const [type] = term.split(".");
    const swarm = swarmTypes.get(type);
    const slate = slateTypes.get(type);
    const base = { term, kind, status: "data_level" };
    if (swarm) { const at = swarmText?.indexOf(`"${type}"`); base.typeAnchor = { file: "swarm", offset: at ?? -1 }; }
    if (slate) base.slateFields = slate;
    if (!swarm && !slate) {
      for (const raw of raws) { const at = raw.text.indexOf(type); if (at >= 0) return { term, kind, status: "data_level", typeAnchor: { file: raw.id, offset: at } }; }
    }
    return base;
  }

  // bare Type / title / table
  if (kind === "type") {
    const swarm = swarmTypes.get(term);
    if (swarm) { const at = swarmText?.indexOf(`"${term}"`); return { term, kind, status: "anchored", typeAnchor: { file: "swarm", offset: at ?? -1 }, kindOf: swarm.kind }; }
    const slate = slateTypes.get(term);
    if (slate) { const at = slateText?.indexOf(`"${term}"`); return { term, kind, status: "anchored", typeAnchor: { file: "slate", offset: at ?? -1 }, fields: slate.length }; }
    // a PascalCase backticked term may be an OPERATION, not a type — the ops
    // index resolves across case (GetMigrations -> getMigrations) exactly like
    // the identifier branch below.
    const op = ops.get(term) ?? [...ops.values()].find((r) => r.name.toLowerCase() === term.toLowerCase());
    if (op) return { term, kind, status: "anchored", anchor: { file: "ops", bundleOffset: op.offset, op, snippet: `${op.op} ${op.name} (${op.fields.length} fields)` }, fieldPresence: null };
    for (const raw of raws) { const at = raw.text.indexOf(term); if (at >= 0) return { term, kind, status: "anchored", typeAnchor: { file: raw.id, offset: at } }; }
    return { term, kind, status: "unfound" };
  }

  // titles ("STR Listings") and table paths (schema.table) — raw byte search
  for (const raw of raws) {
    const at = raw.text.indexOf(term);
    if (at >= 0) return { term, kind, status: "anchored", anchor: { file: raw.id, offset: at, snippet: snippetOf(raw.text, at) } };
  }
  const swarmAt = swarmText?.indexOf(term);
  if (swarmAt >= 0) return { term, kind, status: "anchored", anchor: { file: "swarm", offset: swarmAt, snippet: snippetOf(swarmText, swarmAt) } };
  return { term, kind, status: "unfound" };
}

/**
 * linkDocument(docText, artifacts, { fileId }) -> { terms, byStatus, anchorCount, unfound }
 * Extract the document's cited terms and resolve each. `artifacts` is the
 * loadAnchorArtifacts result; the caller must also supply `swarmText`,
 * `slateText`, and `rawText` views if it wants byte offsets into those files —
 * loadAnchorArtifacts stores raw text under `raws` and, for the two JSON
 * surfaces, the caller can attach the file text for offset resolution.
 */
export function linkDocument(docText, artifacts) {
  const terms = extractAnchorTerms(docText);
  const resolved = terms.map((t) => resolveTerm(t.term, t.kind, artifacts));
  const byStatus = {};
  for (const r of resolved) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  return {
    terms: resolved,
    byStatus,
    anchorCount: resolved.filter((r) => r.status === "anchored" || r.status === "field_confirmed" || r.status === "data_level").length,
    unfound: resolved.filter((r) => r.status === "unfound" || r.status === "type_absent").map((r) => r.term),
  };
}