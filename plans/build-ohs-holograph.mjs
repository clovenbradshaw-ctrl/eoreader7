// build-ohs-holograph.mjs — the OHS custody instance, as a TRAVERSABLE
// HOLOGRAPH.
//
// Per native/docs/THE-HOLOGRAPH.md: the holograph is PER-SOURCE (the record
// of one text's reading, every observation addressed, "the whole a
// traversable concept graph"), and the hyperlexicon is where CROSS-READING
// knowledge lives (the earned SVO structure many readings accrete into).
// This driver runs the same block chain as the nashville plans surface —
// ground → cast → links → derive → gate → surface — over the byte-addressable
// text layers retained by the ohs-custody register (14 documents), then adds
// the two layers that make it a HOLOGRAPH rather than a surface:
//
//   · the typed prose (output-holograph.js holographType): every overview
//     sentence tagged material (with its byte ref) or self:model (the mouth);
//   · the hyperlexicon (organs/hyperlexicon.js makeHyperlexicon): the
//     cross-source SVO assertions, each with its byte refs and witnesses.
//
// The gate is a hard precondition, unchanged in spirit: an ungrounded
// surface is refused, and nothing here is cited that does not resolve
// verbatim into a retained, hashed ground file.
//
// Usage
//     node plans/build-ohs-holograph.mjs
//     OHS_CUSTODY=/abs/path node plans/build-ohs-holograph.mjs   # override ground repo
//
// Writes
//     plans/ohs/ground/            retained text layers + sidecars + pagemaps
//     plans/ohs/ground-digest.json
//     plans/ohs/ledger/plans-ohs.jsonl        the byte-anchored links
//     plans/ohs/ledger/summary.json
//     plans/ohs/metrics/metrics-ohs.json
//     plans/ohs/hyperlexicon.json  the folded SVO + standings + gaps
//     plans/ohs/holograph.json     the typed overview (EOHolographOutput@1)
//     native/the-fold/ohs-holograph.html      the traversable surface
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSnippet } from "../cli/holograph.mjs";
import { castTexts } from "../native/the-fold/surface/block-cast.mjs";
import { groundDigest } from "../native/the-fold/surface/block-ground.mjs";
import { gateSurface } from "../native/the-fold/surface/block-gate.mjs";
import { makeHyperlexicon } from "../native/organs/hyperlexicon.js";
import { holographType } from "../native/organs/output-holograph.js";
import { splitSentences } from "../native/adapters/text/spans.js";
import * as TL from "../native/kernel/task-log.js";
import * as CUBE from "../native/kernel/cube.js";
import { renderLatticeSurface } from "../native/the-fold/surface/block-surface-lattice.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OHS = join(HERE, "ohs");
const GROUND = join(OHS, "ground");
const CUSTODY = process.env.OHS_CUSTODY
  ? resolve(process.env.OHS_CUSTODY)
  : resolve(HERE, "..", "..", "ohs-custody");

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const foldWs = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const loadJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n", "utf8");

// ---------------------------------------------------------------- 1 · ground

function retainOhsGround() {
  mkdirSync(GROUND, { recursive: true });
  const manifest = loadJson(join(OHS, "ground-manifest.json"));
  const enriched = loadJson(join(CUSTODY, "sources.enriched.json"));
  const byId = new Map(enriched.entries.map((e) => [e.id, e]));

  const docs = [];
  for (const doc of manifest.docs) {
    const src = join(CUSTODY, doc.source);
    if (!existsSync(src)) throw new Error(`ground source missing in custody repo: ${doc.source} (set OHS_CUSTODY?)`);
    const dst = join(GROUND, `${doc.id}.txt`);
    const srcHash = sha(src);
    if (!existsSync(dst) || sha(dst) !== srcHash) copyFileSync(src, dst);
    const txt_sha256 = sha(dst);
    const text = readFileSync(dst, "utf8");

    const entry = byId.get(doc.custody) ?? {};
    const cap = entry.capture ?? {};

    let pages;
    if (doc.extraction === "pdfminer") {
      const pagesPath = join(CUSTODY, "derived", `${doc.custody}.pages.json`);
      pages = existsSync(pagesPath)
        ? loadJson(pagesPath).map((p) => ({ page: p.page, byteStart: p.start, byteEnd: p.end }))
        : [{ page: 1, byteStart: 0, byteEnd: text.length }];
    } else {
      pages = [{ page: 1, byteStart: 0, byteEnd: text.length }];
    }
    writeJson(join(GROUND, `${doc.id}.txt.pagemap.json`), pages);

    writeJson(join(GROUND, `${doc.id}.txt.provenance.json`), {
      title: doc.title,
      category: doc.category,
      scale: doc.scale,
      custody: { entry: doc.custody, repo: manifest.custodyRepo, status: cap.status ?? "unverified", archive_tier: cap.archive_tier ?? null },
      originalBytes: { sha256: cap.sha256 ?? null, bytes: cap.bytes ?? null, content_type: cap.content_type ?? null },
      extraction: { tool: doc.extraction },
      txt_sha256,
      chars: text.length,
      pages: pages.length,
    });

    docs.push({ id: doc.id, title: doc.title, category: doc.category, scale: doc.scale, extraction: doc.extraction, txtPath: dst });
  }

  const digest = groundDigest({ docs });
  writeJson(join(OHS, "ground-digest.json"), { schema: "OHSGroundDigest@1", docs: docs.map((d) => d.id), digest, builtAt: new Date().toISOString() });
  return { schema: "EOGround@1", digest, docs };
}

// ------------------------------------------------------------------ 2 · links

function buildLinks(ground) {
  const enriched = loadJson(join(CUSTODY, "sources.enriched.json"));
  const byId = new Map(enriched.entries.map((e) => [e.id, e]));
  const byCustody = new Map();
  for (const d of ground.docs) (byCustody.get(d.id) ?? new Set()).add(d);

  const links = [];
  for (const doc of ground.docs) {
    const text = readFileSync(doc.txtPath, "utf8");
    // Which custody entries live in this ground? Normally one per doc; the
    // rendered municipal-code doc hosts two (MUNI-263040 and -HR).
    const custodyIds = doc.id === "MUNI-263040" ? ["MUNI-263040", "MUNI-263040-HR"] : [doc.custody ?? doc.id];
    let n = 0;
    for (const cid of custodyIds) {
      const entry = byId.get(cid);
      if (!entry) continue;
      const readingPath = join(CUSTODY, "readings", `${cid}.json`);
      if (!existsSync(readingPath)) continue;
      const reading = loadJson(readingPath);
      for (const span of reading.spans ?? []) {
        let start = null, end = null, page = null;
        if (span.kind === "anchor-pdf") { start = span.text_offset; end = start + (span.text_length ?? 0); page = span.page ?? null; }
        else if (span.kind === "anchor-rendered") { start = span.text_offset; end = start + (span.text_length ?? 0); page = null; }
        else if (span.kind === "anchor" && span.byte_offset != null) { start = span.byte_offset; end = start + (span.byte_length ?? 0); page = null; }
        if (start == null || start < 0 || end > text.length) continue;
        const verbatim = foldWs(text.slice(start, end));
        if (!verbatim) continue;
        n += 1;
        links.push({
          schema: "PlanLedgerObservation@1",
          id: `surface:ohs/ground/${doc.id}.txt:row:${String(n).padStart(4, "0")}`,
          doc: `ohs/ground/${doc.id}.txt`,
          at: [start, end],
          verbatim,
          kind: "claim",
          fields: {
            section: entry.tier ?? null,
            claim: entry.claim ?? null,
            used_for: entry.used_for ?? null,
            anchor: entry.anchor ?? null,
            status: (entry.capture ?? {}).status ?? null,
            custody: cid,
          },
          basis: `custody register verified span (${(entry.capture ?? {}).anchor_method ?? span.method ?? "?"})`,
          supersedes: null,
          giver: null,
          page,
        });
      }
    }
  }
  links.sort((a, b) => a.doc.localeCompare(b.doc) || a.at[0] - b.at[0]);
  return links;
}

// ------------------------------------------------------------- 3 · the cast

function castStep(ground) {
  const texts = ground.docs.map((d) => ({ name: d.title, text: readFileSync(d.txtPath, "utf8") }));
  let cast;
  try {
    cast = castTexts({ texts });
  } catch (err) {
    console.warn("cast refused, register stands alone:", err.message);
    cast = { schema: "EOCast@1", referents: new Set(), resolve: () => new Set(), represent: () => null, resolveIn: () => new Set() };
  }
  const referents = [];
  for (const id of cast.referents) {
    const surface = cast.represent(id);
    referents.push({ id, surface });
  }
  referents.sort((a, b) => a.surface.localeCompare(b.surface));
  return { referents, resolve: cast.resolve, represent: cast.represent, resolveIn: cast.resolveIn };
}

// -------------------------------------------------- 4 · the hyperlexicon

function hyperlexiconStep(ground) {
  const props = loadJson(join(OHS, "propositions.json")).propositions;
  const hl = makeHyperlexicon({
    createTaskLog: TL.createTaskLog, append: TL.append, projectTasks: TL.projectTasks,
    ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS,
    GRAINS: CUBE.GRAINS, cellOf: CUBE.cellOf,
  });
  let log = hl.createHyperlexicon({ frame: { case: "ohs-standby-overview", source: "ohs-custody register, retained byte-addressable text layers" } });

  const groundTexts = new Map(ground.docs.map((d) => [d.id, readFileSync(d.txtPath, "utf8")]));
  const docFor = new Map(ground.docs.map((d) => [d.custody ?? d.id, d]));
  // The rendered municipal-code ground hosts two custody entries; make the
  // second one resolvable to the same text layer.
  if (docFor.has("MUNI-263040")) docFor.set("MUNI-263040-HR", docFor.get("MUNI-263040"));
  const readings = new Map();
  for (const d of ground.docs) {
    const rp = join(CUSTODY, "readings", `${d.custody ?? d.id}.json`);
    if (existsSync(rp)) readings.set(d.custody ?? d.id, loadJson(rp));
  }
  // Second custody entry hosted by the rendered municipal-code ground.
  const hrPath = join(CUSTODY, "readings", "MUNI-263040-HR.json");
  if (existsSync(hrPath)) readings.set("MUNI-263040-HR", loadJson(hrPath));

  // Anchor a proposition at its source entry's verified span when one
  // exists; otherwise at the wording's own byte position in the ground;
  // otherwise (no byte address at all) the proposition is a typed gap.
  const spanFor = (p) => {
    const doc = docFor.get(p.source);
    if (!doc) return null;
    const text = groundTexts.get(doc.id);
    const reading = readings.get(p.source);
    const span = (reading?.spans ?? []).find((s) => s.text_offset != null || s.byte_offset != null);
    if (span) {
      const start = span.text_offset ?? span.byte_offset;
      const len = span.text_length ?? span.byte_length;
      if (start != null && start + (len ?? 0) <= text.length) {
        return { ref: `ohs/ground/${doc.id}.txt`, start, end: start + (len ?? 0), text: foldWs(text.slice(start, start + (len ?? 0))) };
      }
    }
    const probe = text.indexOf(p.wording);
    if (probe === -1) return null;
    return { ref: `ohs/ground/${doc.id}.txt`, start: probe, end: probe + p.wording.length, text: foldWs(text.slice(probe, probe + p.wording.length)) };
  };

  const admitted = [];
  const gaps = [];
  for (const p of props) {
    const spans = p.gap ? [] : (spanFor(p) ? [spanFor(p)] : []);
    if (!spans.length) gaps.push(p);
    log = hl.hear(log, {
      subject: p.subject,
      verb: p.verb,
      object: p.object,
      spans,
      witness: p.source,
      subjectFace: p.subject,
      objectFace: p.object,
    });
    admitted.push({ ...p, span: spans[0] ?? null });
  }

  const folded = hl.foldWithStanding(log).map((n) => {
    const spans = (n.spans ?? []).map((s) => {
      const m = /#(\d+)-(\d+)$/.exec(s.at ?? "");
      return { ref: s.ref ?? s.at, at: s.at, start: m ? Number(m[1]) : null, end: m ? Number(m[2]) : null, text: s.text ?? null };
    });
    return {
      id: n.id,
      subject: n.end1, verb: n.label, object: n.end2,
      witnessCount: n.sources ?? n.witnesses?.length ?? 1,
      standing: n.standing ?? null,
      spans,
    };
  });
  const cuts = hl.foldCuts(log).map((n) => ({ id: n.id, subject: n.end1, verb: n.label, object: n.end2 }));

  writeJson(join(OHS, "hyperlexicon.json"), {
    schema: "EOHyperlexicon@1",
    frame: hl.frameOf(log),
    propositions: admitted.map((p) => ({
      id: p.id, subject: p.subject, verb: p.verb, object: p.object, source: p.source,
      wording: p.wording, span: p.span ? { ref: p.span.ref, start: p.span.start, end: p.span.end } : null,
      gap: !p.span, note: p.note,
    })),
    folded: folded.map((n) => ({
      id: n.id, subject: n.subject, verb: n.verb, object: n.object,
      witnessCount: n.witnessCount, spans: n.spans,
    })),
    cuts,
    gaps: gaps.map((g) => ({ id: g.id, subject: g.subject, verb: g.verb, object: g.object, wording: g.wording, note: g.note })),
  });
  return { folded, cuts, gaps, propositions: admitted, hl, log };
}

// --------------------------------------------------------- 5 · the holograph

function holographStep(hyper) {
  const ground = hyper.folded.map((n) => {
    const s = (n.spans ?? [])[0];
    return {
      fact: [n.subject, n.verb, n.object].filter(Boolean).join(" "),
      end1: n.subject, label: n.verb, end2: n.object ?? "",
      ...(s ? { ref: `${s.ref}#${s.start}` } : { gap: { type: "no_byte_address", detail: `"${n.subject} ${n.verb} ${n.object}" has no byte address (private/relayed or unverified)` } }),
    };
  });

  const overview = [
    "The Metro Human Relations Commission found probable cause on a Title VI complaint against OHS.",
    "The staff investigative report found that OHS's administration of federally-funded housing programs did not comply with Title VI requirements.",
    "The Executive Director upheld the complaint and referred it to conciliation.",
    "Councilmember Welsch requested an OHS audit, itemizing the 3.2 million dollar figure into named components.",
    "The enacted code says the OHS director shall be appointed by the mayor.",
    "The planning council retains only a seat in the interview process.",
    "The CoC decided not to fund HMIS and Coordinated Entry in this year's competition.",
    "Removing the dollars bypasses the outlined charter process for the HMIS and CE Lead roles.",
    "OHS is the Collaborative Applicant and the current designated lead agency.",
    "A private correction puts HMIS in year 3 of a 5-year term and CE in year 8.",
    "The written minutes of the September 23 meeting never mention public comment; the recording captures a public comment period.",
    "The predecessor audit scored 52 percent HUD non-compliance in the Homeless Impact Division.",
  ].join("\n");

  const typed = holographType({ prose: overview, ground, splitSentences });

  writeJson(join(OHS, "holograph.json"), { ...typed, overview });
  return typed;
}

// --------------------------------------------------------------- 6 · metrics

function metricsStep(links, ground) {
  // Retain the register's own manifest as the instance's data snapshot —
  // byte-addressable, hash-pinned, sidecar'd — so every metric on the
  // lattice is sourceable: raw rows by byte ref, aggregates by derivedFrom
  // over the deterministic fold of this retained snapshot.
  const enriched = loadJson(join(CUSTODY, "sources.enriched.json"));
  const dataDir = join(OHS, "data");
  mkdirSync(dataDir, { recursive: true });
  const SNAP = join(dataDir, "sources.enriched.json");
  copyFileSync(join(CUSTODY, "sources.enriched.json"), SNAP);
  const snapSha = sha(SNAP);
  writeJson(join(dataDir, "sources.enriched.json.sidecar.json"), {
    schema: "EODataArtifact@1",
    path: "ohs/data/sources.enriched.json",
    sha256: snapSha,
    chars: readFileSync(SNAP, "utf8").length,
    source: "ohs-custody chain-of-custody register",
    asOf: enriched.last_run ?? new Date().toISOString(),
  });

  const cap = (s) => enriched.entries.filter((e) => (e.capture ?? {}).status === s).length;
  const fields = {
    total: enriched.entries.length,
    captured: cap("captured"),
    localOnly: cap("local-only"),
    bytesHeld: cap("bytes-held"),
    anchorMissing: cap("anchor-missing"),
    notLocated: cap("not-located"),
    grounded: links.length,
  };
  const registerRow = {
    schema: "MetricRow@1", registry: "register", id: "metric:register:0001",
    fields,
    provenance: {
      dataset: "ohs-custody/sources.enriched.json",
      source: "ohs-custody chain-of-custody register",
      asOf: enriched.last_run ?? new Date().toISOString(),
      registry: "register",
    },
    derivedFrom: { address: "ohs/data/sources.enriched.json#/entries", basis: "deterministic fold over the retained register snapshot" },
  };
  const metrics = [registerRow];
  mkdirSync(join(OHS, "metrics"), { recursive: true });
  writeJson(join(OHS, "metrics", "metrics-ohs.json"), metrics);
  return { metrics, snapshotSidecar: { path: SNAP, sha256: snapSha } };
}

// --------------------------------------------------------------- 7 · render

// --------------------------------------------------------------- 7 · render

// Maps the gated OHS instance onto the lattice template — the same nine
// surfaces as plans-surface.html. Every claim row, assertion edge, prose
// sentence and metric on the lattice is sourceable to the byte; the mouth
// and the gaps are marked, never laundered.
function renderSurface({ def, ground, links, metrics, gate, hyper, holograph, referents, resolved }) {
  const docName = (p) => (p.split("/").pop() || p).replace(".txt", "");
  const facts = links.map((l, i) => {
    const s = resolved[i] ?? {};
    return { ...l, idx: i + 1, verbatimResolved: s.verbatim ?? l.verbatim, ref: `${l.doc}#${l.at[0]}-${l.at[1]}` };
  });

  const enriched = loadJson(join(CUSTODY, "sources.enriched.json"));

  // The beings of the record: the ends of the hyperlexicon assertions —
  // the actors the cross-source knowledge actually connects, named by the
  // cast where the cast found them, else by the term the claim used. A being
  // is a participant in an assertion, never a mention harvested by scan.
  const beingCounts = new Map();
  const bump = (nm) => { const k = String(nm ?? "").trim(); if (k) beingCounts.set(k, (beingCounts.get(k) ?? 0) + 1); };
  for (const a of hyper.folded) { bump(a.subject); bump(a.object); }
  const beingName = (nm) => {
    for (const r of referents) { if (r.surface === nm) return nm; if (nm.length > 3 && r.surface.includes(nm)) return r.surface; }
    return nm;
  };
  const beings = [...beingCounts.entries()].map(([name, count]) => ({ name: beingName(name), count }))
    .filter((b, i, arr) => arr.findIndex((x) => x.name === b.name) === i)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // T1 · Void — the retained corpus
  const t1docs = ground.docs.map((d) => {
    const side = loadJson(`${d.txtPath}.provenance.json`);
    return {
      title: d.title,
      meta: `${d.category} · ${d.scale} · ${side.pages} pages · ${side.chars.toLocaleString()} chars`,
      meta2: `pdf ${side.originalBytes?.sha256 ? `${side.originalBytes.sha256.slice(0, 8)}…` : "?"} · custody ${side.custody?.status ?? "?"}`,
      basis: `retained from ohs-custody · ${side.extraction?.tool ?? d.extraction} · txt ${side.txt_sha256.slice(0, 8)}…`,
    };
  });

  // T2 · Kind — the register's own tiers filter every surface
  const tierCounts = {};
  for (const f of facts) tierCounts[f.fields?.section ?? "?"] = (tierCounts[f.fields?.section ?? "?"] ?? 0) + 1;
  const t2kinds = Object.entries(tierCounts).map(([k, c]) => ({ kind: k, label: k, count: c }));
  const t2categories = [...new Set(ground.docs.map((d) => d.category))].sort();

  // T3 · Entity — beads + the honest split (the record does not reconcile it)
  const t3beads = beings.slice(0, 14).map((b) => ({ name: b.name, count: b.count }));
  const t3splits = [{ left: "the written minutes", leftCount: 1, note: "the recording shows what the minutes omit — public comment — not merged: no single byte reconciles the two records", right: "the recording", rightCount: 1 }];
  const t3note = "identity typed, never guessed — the split renders as a gap until a received prior closes it";

  // T4 · Link — the register, byte-addressed, by document
  const byDoc = {};
  for (const f of facts) (byDoc[f.doc] ??= []).push(f);
  const rowMap = (f) => ({ kind: f.fields?.section ?? "claim", ref: f.ref, page: f.page ? `p.${f.page}` : "", verbatim: f.verbatimResolved, chips: [f.fields?.custody, f.fields?.status].filter(Boolean), basis: f.basis });
  const t4docs = ground.docs.map((d) => ({ title: d.title, rows: (byDoc[`ohs/ground/${d.id}.txt`] ?? []).map(rowMap) }));

  // T5 · Field — provenance-stamped metrics, every row sourceable to the
  // retained register snapshot (derivedFrom over the deterministic fold)
  const regRow = metrics.find((m) => m.registry === "register");
  const regHtml = `<div class="pills">${["captured", "local-only", "bytes-held", "anchor-missing", "not-located"].map((s) => `<span class="chip">${s}: ${regRow?.fields?.[s] ?? "?"}</span>`).join("")}</div><p class="empty prov">${regRow?.provenance ? `dataset ${regRow.provenance.dataset} · source ${regRow.provenance.source} · asOf ${regRow.provenance.asOf}` : ""}</p><p class="basis prov">${regRow?.derivedFrom ? `${regRow.derivedFrom.address} · ${regRow.derivedFrom.basis}` : ""}</p>`;
  const t5blocks = [
    { title: "the register, by capture status", meta: `${regRow?.fields?.total ?? "?"} entries`, html: regHtml },
  ];

  // T6 · Network — lenses, then the assertion graph
  const t6lenses = (def.lenses ?? []).map((t) => {
    const q = (t.queries ?? []).map((x) => String(x).toLowerCase());
    const hit = facts.filter((f) => { const hay = `${f.verbatimResolved} ${f.fields?.claim ?? ""} ${f.fields?.used_for ?? ""}`.toLowerCase(); return q.some((x) => hay.includes(x)); });
    if (!hit.length) return null;
    const byL = {};
    for (const f of hit) (byL[f.doc] ??= []).push(f);
    return {
      label: t.label,
      meta: `${hit.length} claims · ${Object.keys(byL).length} documents`,
      docs: Object.entries(byL).map(([doc, rs]) => ({
        doc: docName(doc),
        rows: rs.map(rowMap),
        more: rs.length > 6 ? rs.length - 6 : 0,
      })),
    };
  }).filter(Boolean);

  const topAssertions = hyper.folded.slice(0, 8);
  const leftNames = [...new Set(topAssertions.map((a) => beingName(a.subject)))];
  const rightNames = [...new Set(topAssertions.map((a) => beingName(a.object)))];
  const LY = 260, LX = 90, RX = 450, PAD = 30;
  const col = (arr) => { const out = {}; const step = arr.length > 1 ? (LY - 2 * PAD) / (arr.length - 1) : 0; arr.forEach((n, i) => { out[n] = PAD + i * step; }); return out; };
  const leftY = col(leftNames), rightY = col(rightNames);
  const svgNodes = [...leftNames.map((n) => ({ x: LX, y: leftY[n], label: n })), ...rightNames.map((n) => ({ x: RX, y: rightY[n], label: n }))];
  const svgEdges = topAssertions.map((a) => {
    const s = beingName(a.subject), o = beingName(a.object);
    const y1 = leftY[s] ?? LY / 2, y2 = rightY[o] ?? LY / 2;
    return { x1: LX, y1, x2: RX, y2, mx: (LX + RX) / 2, my: (y1 + y2) / 2 - 8, label: `${a.verb} · ${a.witnessCount}${a.witnessCount === 1 ? " witness" : " witnesses"}` };
  });
  const t6svg = { note: "nodes are the beings, edges are the hyperlexicon assertions — every edge carries its byte refs and witness count", nodes: svgNodes, edges: svgEdges };

  // T7 · Atmosphere — the typed prose, byte-pointed or marked the mouth
  const prose = (holograph.prose ?? []).map((s) => {
    let factIdx = null;
    if (s.ref) { const m = /^(.*?)#(\d+)$/.exec(s.ref); if (m) { const start = Number(m[2]); const hit = facts.find((f) => f.doc === m[1] && f.at[0] === start); if (hit) factIdx = hit.idx; } }
    return {
      text: s.text,
      ground: s.ground,
      tag: s.ground === "material" ? (factIdx ? `[S${factIdx}]` : "[S?]") : "[M]",
      ref: s.ground === "material" ? s.ref : null,
      gapNote: s.ground === "self:model" ? "self:model — the mouth" : (s.gap ? "grounded but unaddressed" : null),
    };
  });

  // T8 · Lens — lenses, byte inspector, lighting
  const t8pills = (def.lenses ?? []).map((t) => t.label);
  const t8lighting = beings.slice(0, 8).map((b) => ({
    label: b.name,
    badge: `<span class="badge ${b.count >= 3 ? "v" : "a"}">${b.count >= 3 ? "lit" : "dim"} · ${b.count} ${b.count === 1 ? "link" : "links"}</span>`,
    rows: facts.filter((f) => `${f.verbatimResolved} ${f.fields?.claim ?? ""}`.includes(b.name)).slice(0, 3).map(rowMap),
  }));

  // T9 · Paradigm — worldviews over the gate
  const t9 = {
    worldviews: [
      { label: "the fold · byte-honesty", on: true },
      { label: "civil rights" }, { label: "governance" }, { label: "funding" }, { label: "process" },
      { label: "compare ⇄", compare: true },
    ],
    note: "the gate is paradigm-independent — every worldview reads the same retained, byte-anchored record",
    strata: [{ current: true, line: `the record, intact — ${facts.length} claims, ${hyper.gaps.length} typed gaps, no revisions yet` }],
    seal: { pass: gate.ok, text: gate.ok ? "● pass" : "● refuse" },
    checks: gate.checks.map((c) => ({ ok: c.ok, text: `${c.name} · ${c.detail}` })),
    prov: `source ohs-custody chain-of-custody register · last_run ${enriched.last_run ?? ""}`,
  };

  const status = { left: "live", ok: `${facts.length} claims · ${hyper.folded.length} assertions · ${beings.length} beings · ${gate.ok ? "gate pass" : "gate refuse"}` };

  const instance = {
    def: {
      mark: "OHS",
      title: "OHS — standby custody holograph",
      sub: `${ground.docs.length} retained documents · ${facts.length} byte-anchored claims · ${hyper.folded.length} hyperlexicon assertions · the gate ${gate.ok ? "passes" : "refuses"}`,
      verbs: [
        { word: "scope", text: "narrows the whole lattice (doc · lens · kind)" },
        { word: "light", text: "selects a being — lit everywhere at once, one hop" },
        { word: "open", text: "a byte ref opens its row — sentence, assertion, claim, all resolve to the byte" },
        { word: "propose", text: "lands in Paradigm — only the gate changes the record" },
      ],
    },
    t1: { docs: t1docs },
    t2: { kinds: t2kinds, categories: t2categories },
    t3: { beads: t3beads, splits: t3splits, note: t3note },
    t4: { docs: t4docs },
    t5: { blocks: t5blocks },
    t6: { lenses: t6lenses, svg: t6svg },
    t7: { note: `${holograph.verdict?.line ?? ""} — material sentences carry file#byte; click one to open its row`, prose },
    t8: { lensPills: t8pills, lighting: t8lighting },
    t9,
    status,
  };
  return renderLatticeSurface(instance);
}

// ------------------------------------------------------------------- main

function main() {
  console.log("OHS holograph build");
  console.log("  ground repo:", CUSTODY);
  if (!existsSync(join(CUSTODY, "sources.enriched.json"))) {
    console.error("  ✗ custody repo not found at", CUSTODY, "— set OHS_CUSTODY");
    process.exit(1);
  }

  const def = loadJson(join(OHS, "ohs.surfacedef.json"));

  // 1 · ground
  const ground = retainOhsGround();
  console.log("  ground:", ground.docs.length, "documents · digest", ground.digest.slice(0, 12), "…");

  // 2 · links (the register's verified claims, byte-addressed)
  const links = buildLinks(ground);
  mkdirSync(join(OHS, "ledger"), { recursive: true });
  writeFileSync(join(OHS, "ledger", "plans-ohs.jsonl"), links.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
  const summary = { total: links.length, perDoc: {} };
  for (const l of links) { summary.perDoc[l.doc] = (summary.perDoc[l.doc] ?? 0) + 1; }
  writeJson(join(OHS, "ledger", "summary.json"), summary);
  console.log("  links:", links.length);

  // 3 · cast
  const cast = castStep(ground);
  console.log("  cast:", cast.referents.length, "referents");

  // 4 · hyperlexicon
  const hyper = hyperlexiconStep(ground);
  console.log("  hyperlexicon:", hyper.folded.length, "assertions ·", hyper.gaps.length, "typed gaps");

  // 5 · holograph (typed prose)
  const holograph = holographStep(hyper);
  console.log("  holograph:", holograph.verdict.line);

  // 6 · metrics
  const { metrics, snapshotSidecar } = metricsStep(links, ground);

  // 7 · gate — refuse an ungrounded surface
  const resolved = links.map((l) => resolveSnippet(`${l.doc}#${l.at[0]}-${l.at[1]}`, [HERE]));
  const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: HERE, snapshotSidecar });
  console.log("  gate:", gate.ok ? "PASS" : "REFUSE");
  for (const c of gate.checks) console.log(`    ${c.ok ? "●" : "✗"} ${c.name} · ${c.detail}`);
  if (!gate.ok) { console.error("refusing to render — the surface is ungrounded."); process.exit(1); }

  // 8 · surface
  const projections = { networks: [], places: [], changeLog: [], atmosphere: [] };
  const html = renderSurface({ def, ground, links, metrics, gate, hyper, holograph, referents: cast.referents, resolved });
  const out = join(dirname(HERE), "native", "the-fold", "ohs-holograph.html");
  writeFileSync(out, html);
  console.log("  wrote", out, (html.length / 1e6).toFixed(2), "MB");
}

main();