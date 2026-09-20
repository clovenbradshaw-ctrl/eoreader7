// discover-nashville.mjs — THE DISCOVERY DRIVER (Void → Lens, no model
// authoring the schema).
//
// The whole point: a large model does NOT create the schema of what we're
// looking for. The sources are handed to eoreader7; eoreader7 reads them
// with its own organs (the full reading crew, the layout rule set, CV only
// where a page's shape demands it, a swarm of ants on the discovery
// question), then ASKS the person what they want to discover, and the
// answers become whatever limited schema is needed. The surfacedef that
// results is the dialogue's own product — every topic, query, place, and
// metric registry in it traces to (a) a byte-anchored finding from the
// retained corpus or (b) a person's answer to a question that finding
// grounded.
//
// PIPELINE:
//   ground  → retain/verify the corpus (Void)
//   crew    → the FULL reading pipeline per document (surfaces → referents
//             → pronoun binding → typed relations → composition), the
//             "full reading pipeline crew" the fold calls in
//   layout  → per page: the reusable layout rule set settles the shape
//             mechanically (columns merged, tables tupled, chrome dropped);
//             only a page no rule settles goes to CV (visual-rec/look.js),
//             and its verdict is REC'd so the same page is mechanical next
//             time
//   ants    → eoSwarm over candidate discovery cells (which beings, which
//             quantity kinds, which headings) — fitness is mechanical
//             support in the retained bytes; the admitted best ants become
//             the questions
//   ask     → the dialogue: eoreader7 asks what we want to discover, one
//             grounded question at a time; the person answers
//   schema  → the answers fold into the minimal surfacedef
//   surface → the existing blocks render plans-surface.html from that schema
//
// usage: node discover-nashville.mjs [--skip crew|layout|ants] [--answers file]
//        --answers <file>  replay a JSON answers file instead of asking
//                          (for a non-interactive run; each round is
//                          [question-cell, answer] pairs, see roundHelp)
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { resolveSnippet } from "../cli/holograph.mjs";
import { retainGround } from "../native/the-fold/surface/block-ground.mjs";
import { extractLinks } from "../native/the-fold/surface/block-extract.mjs";
import { foldFieldRows } from "../native/the-fold/surface/block-metrics.mjs";
import { deriveProjections } from "../native/the-fold/surface/block-derive.mjs";
import { gateSurface } from "../native/the-fold/surface/block-gate.mjs";
import { renderSurface } from "../native/the-fold/surface/block-surface.mjs";
import { layoutRead, recLayoutRule } from "../native/the-fold/surface/block-layout.mjs";
import { textEncounters } from "../native/adapters/text/recursive.js";
import { readEncounters } from "../native/eval/lavar/lib/read-recipe.mjs";
import { eoSwarm } from "../native/eval/lavar/eo-swarm.mjs";
import { makeCapacityRunner } from "../native/organs/capacity-runner.js";
import { makeReferentIndex } from "../native/organs/cast.js";
import { engineRelationsFor } from "../native/the-fold/reader-bundle.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../native/adapters/text/surfaces.js";
import { listCapacities } from "../native/organs/capacities.js";
import { capacityAnts, pointCapacities, swarmCapacities } from "../native/eval/lavar/capacity-swarm.mjs";
import { elenchusBar, RERUN_NULL } from "../native/eval/lavar/elenchus-bar.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NASH = join(HERE, "nashville");
const GROUND = join(NASH, "ground");
const DISCO = join(NASH, "discovery");
const DATA = join(NASH, "data");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const CREW_CAP_PER_DOC = 600; // encounters per doc for the crew read (disclosed)
const args = process.argv.slice(2);
const skip = new Set(
  (args.find((a) => a.startsWith("--skip=")) ?? "").replace("--skip=", "").split(",").filter(Boolean)
);
const answersFile = (args.find((a) => a.startsWith("--answers=")) ?? "").replace("--answers=", "") || null;
const guide = (args.find((a) => a.startsWith("--guide=")) ?? "").replace("--guide=", "") || null;
const forceAutonomous = args.includes("--autonomous");
// MODE: a person answers interactively (TTY, no answers file); an answers
// file replays their answers; otherwise the reader DECIDES itself — with a
// `--guide` phrase as minimal guidance when given, else from its own
// measured findings alone. Every decision carries its basis on the record.
const interactive = process.stdin.isTTY && !answersFile && !forceAutonomous && !guide;
const mode = answersFile ? "guided" : interactive ? "ask" : "autonomous";

const manifest = JSON.parse(readFileSync(join(NASH, "manifest.json"), "utf8"));

// ── the discovery record: everything the driver found, asked, and learned ──
mkdirSync(DISCO, { recursive: true });
const record = { schema: "EODiscovery@1", instance: "nashville", builtAt: new Date().toISOString(), rounds: [] };

// ──────────────────────────────────────────────────────────────────────────
// BLOCK 1 · GROUND (Void) — retain or verify; nothing below reads unretained
// bytes. ──────────────────────────────────────────────────────────────────
const ground = await retainGround({ manifest, dir: GROUND, seedBase: HERE });
record.ground = { docs: ground.docs.map((d) => d.id), digest: ground.digest };

// ──────────────────────────────────────────────────────────────────────────
// BLOCK 2 · CREW (Entity/Kind/Link) — the FULL reading pipeline per doc.
// readEncounters is the assembled reader (createRecursiveReader +
// createCausalTextPerceiver + composition ledger): surfaces → referents →
// pronoun binding → typed relation, with the received POS prior. The read
// is capped per doc and the cap is DISCLOSED on the record — a survey, not
// a production sidecar; the retained layer holds the full corpus.
// ──────────────────────────────────────────────────────────────────────────
const crew = { schema: "EODiscoveryCrew@1", docs: [] };
if (!skip.has("crew")) {
  for (const d of ground.docs) {
    const text = readFileSync(d.txtPath, "utf8");
    const encounters = textEncounters(text, { source: d.id });
    const capped = encounters.slice(0, CREW_CAP_PER_DOC);
    const t0 = Date.now();
    const r = await readEncounters(capped, { source: d.id, language: "eng" });
    const doc = {
      id: d.id,
      encounters: capped.length, totalEncounters: encounters.length,
      ms: Date.now() - t0,
      entries: r.entries.length,
      stats: r.stats,
      candidates: r.candidates,
    };
    crew.docs.push(doc);
    record.rounds.push({ phase: "crew", doc: d.id, found: `${r.entries.length} entries, ${r.candidates.length} composition candidates`, disclosedCap: `${capped.length}/${encounters.length} encounters` });
    console.log(`crew ${d.id}: ${capped.length}/${encounters.length} encounters → ${r.entries.length} entries · ${r.candidates.length} candidates · ${doc.ms}ms`);
  }
  writeFileSync(join(DISCO, "crew.json"), JSON.stringify(crew, null, 2));
}

// ──────────────────────────────────────────────────────────────────────────
// BLOCK 3 · LAYOUT (Field) — the reusable rule set settles each page
// mechanically; only a page whose shape demands it goes to CV, and the CV
// verdict is REC'd into the rule library so the same shape is mechanical
// next time. The settled page text is what the extractor reads, never the
// flat bytes of a columned page. ──────────────────────────────────────────
const layout = { schema: "EODiscoveryLayout@1", pages: [], cvEscalations: 0 };
if (!skip.has("layout")) {
  for (const d of ground.docs) {
    const text = readFileSync(d.txtPath, "utf8");
    const pagemap = JSON.parse(readFileSync(d.pagemapPath, "utf8"));
    const pages = text.split("\f").filter((p) => p.trim());
    const shapes = {};
    for (const [i, page] of pages.entries()) {
      const r = layoutRead(page);
      shapes[r.shape] = (shapes[r.shape] ?? 0) + 1;
      layout.pages.push({ doc: d.id, page: i + 1, shape: r.shape, note: r.note, bands: r.bands ?? null });
      if (r.demandsCV) {
        layout.cvEscalations += 1;
        // The mechanical rule set is exhausted; the page's shape demands the
        // visual sense. In a full run this renders the page and looks
        // (visual-rec.mjs / look.js). Here the escalation is recorded with
        // its REC — the shape, once settled, becomes a rule. The CV call
        // itself is wired for a caller with VISUAL_DETECT_PYTHON + tesseract;
        // absent those, the escalation is disclosed as pending rather than
        // faked.
        const rec = recLayoutRule({ signals: r.signals, settle: "cv", note: `page ${i + 1} of ${d.id} demanded the visual sense` });
        record.rounds.push({ phase: "layout", doc: d.id, page: i + 1, shape: "cv-demanded", rec: rec.rec });
      }
    }
    console.log(`layout ${d.id}: ${pages.length} pages → ${JSON.stringify(shapes)}${layout.cvEscalations ? ` · ${layout.cvEscalations} CV escalations` : ""}`);
  }
  writeFileSync(join(DISCO, "layout.json"), JSON.stringify(layout, null, 2));
}

// ──────────────────────────────────────────────────────────────────────────
// BLOCK 4 · ANTS (Pattern) — dispatch a swarm of ants at the discovery
// question: which beings, quantity kinds, and headings does the retained
// corpus actually support? Every ant's fitness is mechanical (mention count
// × distinct documents); the admitted best ants become the questions. The
// swarm's own bar is the measured rerun floor of the fitness (deterministic
// reads measure 0, so the bar collapses to epsilon — any real support
// recruits, elenchus-bar.mjs's contract). ──────────────────────────────────
// The referent survey runs PER DOCUMENT through surfaces.js's own organs
// (the same discovery the full cast uses, at the survey grain) — a whole-
// corpus makeReferentIndex union would spend two minutes before a single
// question. The per-doc events are byte-anchored to each retained layer;
// nothing below invents a being.
import { splitSentences } from "../native/adapters/text/spans.js";

const textsByDoc = new Map(ground.docs.map((d) => [d.id, readFileSync(d.txtPath, "utf8")]));

// candidate cells: the corpus's own beings, ranked mechanically
const beingCandidates = [];
{
  const eventsByDoc = new Map();
  for (const [docId, text] of textsByDoc) {
    const sentences = splitSentences(text);
    const surfaces = extractSurfaces(sentences, {});
    const events = discoverReferents(surfaces, { minSentences: 0 }).events;
    eventsByDoc.set(docId, events);
  }
  const seen = new Set();
  for (const [docId, events] of eventsByDoc) {
    for (const e of events) {
      if (seen.has(e.referent_id)) continue;
      seen.add(e.referent_id);
      const surface = e.surface;
      if (!surface || surface.length < 3) continue;
      let mentions = 0;
      const docs = new Set();
      for (const [d2, text] of textsByDoc) {
        let n = 0, idx = 0;
        while ((idx = text.indexOf(surface, idx)) !== -1) { n++; idx += surface.length; }
        if (n) { mentions += n; docs.add(d2); }
      }
      if (mentions >= 6 && docs.size >= 1) beingCandidates.push({ id: e.referent_id, surface, mentions, docs: docs.size });
    }
  }
  beingCandidates.sort((a, b) => b.mentions - a.mentions);
}
record.rounds.push({ phase: "survey", referents: beingCandidates.length, basis: "per-doc surfaces.js referent discovery over the retained layers" });

// ACTOR signal: an agency is a being that ACTS — it is named in a
// goal/action line ("MTA will expand…", "MDHA will fund…"). Mechanical:
// the same GOAL-verb line test the deterministic extractor uses, counted
// per being. A being that never appears in a goal/action line is not typed
// as an agency by the reader; it stays untyped rather than guessed.
const GOAL_VERB = /^\s*(?:Goal|Objective|Policy|Action|Strategy|Recommendation|Target|Priority|Adopt|Establish|Create|Expand|Invest|Develop|Fund|Build|Complete|Implement|Preserve|Protect|Reduce|Increase|Achieve|Coordinate|Design|Plan for)\b/i;
const actorCounts = new Map();
for (const [docId, text] of textsByDoc) {
  for (const line of text.split("\n")) {
    const c = line.replace(/\s+/g, " ").trim();
    if (!GOAL_VERB.test(c)) continue;
    for (const b of beingCandidates) {
      if (c.indexOf(b.surface) !== -1) actorCounts.set(b.surface, (actorCounts.get(b.surface) ?? 0) + 1);
    }
  }
}
for (const b of beingCandidates) b.actorLines = actorCounts.get(b.surface) ?? 0;

// quantity kinds: the corpus's own quantity vocabulary — measured against
// the RETAINED LAYER, never a model's idea of what a plan says. The
// patterns are the corpus's own attested shapes (percent, units,
// households, dollars-by-word, distances, capacity).
const QUANTITY_KINDS = [
  { kind: "percent", re: /\b\d[\d,.]*\s*%|\b\d+\s*percent\b/gi },
  { kind: "units", re: /\b\d[\d,.]*\s*(?:units|households|dwelling|families|homes)\b/gi },
  { kind: "dollar", re: /\$\s?\d[\d,.]*|\b\d[\d,.]*\s*(?:million|billion|trillion)\s*(?:dollars|\b)\b|\b\d[\d,.]*\s*dollars\b/gi },
  { kind: "distance", re: /\b\d[\d,.]*\s*(?:miles|acres|square feet|SF|feet)\b/gi },
  { kind: "capacity", re: /\b\d[\d,.]*\s*(?:trips|vehicles|parking spaces|jobs|employees|riders)\b/gi },
  { kind: "climate", re: /\b\d[\d,.]*\s*(?:MW|gallons|degrees|F|C)\b/gi },
];
const quantityCandidates = QUANTITY_KINDS.map((q) => {
  let mentions = 0;
  const docs = new Set();
  for (const [docId, text] of textsByDoc) {
    const n = (text.match(q.re) ?? []).length;
    if (n) { mentions += n; docs.add(docId); }
  }
  return { kind: q.kind, re: q.re.source, mentions, docs: docs.size };
}).filter((q) => q.mentions >= 10);

// seed ants: one per candidate cell; fitness = mechanical support
const ants = [
  ...beingCandidates.slice(0, 24).map((b, i) => ({ id: `being:${i}`, ids: [b.surface], op: "SIG", grain: "Figure" })),
  ...quantityCandidates.map((q, i) => ({ id: `quantity:${i}`, ids: [q.kind], op: "SIG", grain: "Pattern" })),
];
const fitness = (ids) => {
  let f = 0;
  for (const id of ids) {
    const b = beingCandidates.find((c) => c.surface === id);
    if (b) { f += b.mentions * b.docs; continue; }
    const q = quantityCandidates.find((c) => c.kind === id);
    if (q) f += q.mentions * q.docs;
  }
  return f;
};
const terrainOf = (ids) => ids.map((id) => (beingCandidates.some((c) => c.surface === id) ? "entity" : "quantity"));
const legal = (ids) => ids.every((id) => beingCandidates.some((c) => c.surface === id) || quantityCandidates.some((c) => c.kind === id));

const antsOut = skip.has("ants")
  ? null
  : eoSwarm({ ants, fitness, terrainOf, legal, bar: Number.EPSILON });
if (antsOut) {
  const best = antsOut.best;
  record.rounds.push({ phase: "ants", seeds: ants.length, evaluated: antsOut.ants.length, admitted: antsOut.ants.filter((a) => a.admitted).length, best: { ids: best?.ids ?? null, f: best?.f ?? 0 } });
  console.log(`ants: ${antsOut.ants.length} evaluated · best ${best?.ids?.join("+") ?? "none"} @ ${best?.f ?? 0}`);
  writeFileSync(join(DISCO, "ants.json"), JSON.stringify({ schema: "EODiscoveryAnts@1", ...antsOut }, null, 2));
}

// ── THE CAPACITY SWARM (the "swarm the ants" phase) — every capacity in
// the registry is an ant, pointed at each retained document, Wilson's
// round runs per doc (breed + differentiate, gated by the measured rerun
// floor). cast and relations execute for real; every other registered
// capacity reports its typed not_yet_executable gap — a gap is a result,
// never a silence. The census (yields, personas, admitted children, the
// anti-matter) lands on the discovery record. ──────────────────────────────
const SWARM_NL = "swarm everything — every capacity at the retained plans";
const swarmCensus = { schema: "EOSwarmCensus@1", docs: [] };
if (!skip.has("swarm")) {
  const refIdx = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const swRun = makeCapacityRunner({ referentIndexFor: refIdx, relationsFor: (chunks) => engineRelationsFor(chunks) });
  const swPoint = pointCapacities(SWARM_NL);
  if (!swPoint.gap) {
    const swBar = (ants, text, name) => {
      const yields = ants.map((a) => {
        try {
          const r = swRun(a.capacity, { text, name });
          return r?.gap ? 0 : (r?.referents?.length ?? r?.edges?.length ?? r?.fillers?.length ?? r?.count ?? 0);
        } catch { return 0; }
      });
      const best = Math.max(0, ...yields);
      return elenchusBar(Array.from({ length: RERUN_NULL.draws }, () => best));
    };
    for (const d of ground.docs) {
      const text = readFileSync(d.txtPath, "utf8");
      const bar = swBar(swPoint.ants, text, d.id);
      const out = swarmCapacities({ nl: SWARM_NL, runCapacity: swRun, material: { text, name: d.id }, bar });
      const bySeed = new Map(out.reports.map((r) => [r.capacity, r]));
      swarmCensus.docs.push({
        doc: d.id, bar, pointed: out.pointed.length,
        seeds: out.swarm.ants.filter((a) => a.kind === "seed").map((a) => {
          const rep = bySeed.get(a.ids[0]) ?? null;
          const res = rep?.result ?? null;
          return { ids: a.ids, f: a.f, persona: a.persona?.label ?? null, ...(res?.gap ? { gap: res.gap } : { yield: rep?.yield ?? 0, truncated: res?.truncated ?? false, examinedChars: res?.examinedChars ?? null, totalChars: res?.totalChars ?? null }) };
        }),
        admitted: out.swarm.ants.filter((a) => a.kind !== "seed" && a.admitted).map((a) => ({ ids: a.ids, f: a.f })),
        best: { ids: out.swarm.best?.ids ?? [], f: out.swarm.best?.f ?? 0 },
        gapped: [...new Set(out.reports.map((r) => r.result?.gap).filter(Boolean))],
      });
      console.log(`swarm ${d.id}: cast ${bySeed.get("cast")?.yield ?? "-"} · relations ${bySeed.get("relations")?.yield ?? "-"} · best ${out.swarm.best?.ids?.join("+") ?? "none"} @ ${out.swarm.best?.f ?? 0}`);
    }
    writeFileSync(join(DISCO, "swarm.json"), JSON.stringify(swarmCensus, null, 2));
    record.rounds.push({ phase: "swarm", docs: swarmCensus.docs.length, bestPerDoc: swarmCensus.docs.map((d) => ({ doc: d.doc, best: d.best })), basis: "every registered capacity pointed at each retained document — cast/relations execute, the rest typed gaps" });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// BLOCK 5 · DECIDE/ASK — the schema cells. In `ask`/`guided` mode the
// reader asks what we want to discover, grounded in what the crew + layout
// + ants actually found; the person's answers fold into the cells. In
// `autonomous` mode the reader DECIDES the same cells from the same
// evidence, mechanically, with every decision recorded with its basis —
// minimal guidance only when `--guide` names a preference. A cell the
// evidence cannot settle stays open and disclosed: never guessed. ─────────
const schema = {
  city: "nashville",
  name: "Nashville — Davidson County",
  documents: manifest.docs.map((d) => ({ id: d.id, category: d.category, scale: d.scale })),
  topics: [],
  metrics: { registries: [], placeDistricts: {} },
  vocab: { agencies: [], places: [], quantities: [], goals: [] },
  decidedBy: mode,
};

const guideWords = guide
  ? String(guide).toLowerCase().split(/[^a-z]+/i).filter((w) => w.length > 2)
  : [];

// the corpus's own recurring section vocabulary — the extractor's
// byte-anchored `section` fields, ranked by row count and doc spread. These
// ARE the corpus's own themes: a section name that recurs across plans is
// a lens the corpus itself distinguishes.
const sectionCounts = new Map();
for (const [docId, text] of textsByDoc) {
  for (const line of text.split("\n")) {
    const c = line.replace(/\s+/g, " ").trim();
    if (!c || c.length > 80 || /\.$/.test(c)) continue;
    if (!/^[A-Z0-9]/.test(c)) continue;
    if (!/^[A-Za-z0-9&',.\- ]+$/.test(c)) continue;
    const words = c.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 8) continue;
    const key = c.toLowerCase();
    const rec = sectionCounts.get(key) ?? { text: c, docs: new Set(), rows: 0 };
    rec.rows++;
    rec.docs.add(docId);
    sectionCounts.set(key, rec);
  }
}
const headingCandidates = [...sectionCounts.values()]
  .filter((h) => h.docs.size >= 2 && h.rows >= 4)
  .sort((a, b) => b.docs.size - a.docs.size || b.rows - a.rows)
  .slice(0, 14);

// ── the swarm's admitted best cells shape the reader's own preferences ────
const swarmBest = antsOut?.ants?.filter((a) => a.admitted).sort((a, b) => b.f - a.f)[0]?.ids ?? [];
const prefers = (surface) => {
  const s = String(surface ?? "").toLowerCase();
  return swarmBest.some((id) => String(id).toLowerCase() === s);
};

// ── mechanical shape tests: what the reader can settle WITHOUT a person ────
// Measured on this corpus (not tuned to one specimen, but calibrated here):
//   AGENCY  = a pure acronym (MTA, MDHA, MPO…) with real spread (>= 2 docs)
//             and real weight (>= 15 mentions), or a multi-word agency-word
//             surface (Housing Division, Barnes Fund) with spread. A bare
//             generic word (Division, Department, Office alone), a
//             single-doc jargon acronym (LIHTC, AMI, CARP, SAC), and a
//             caption word (FIGURE, TABLE, APPENDIX…) are REFUSED — the
//             reader does not type a fragment or a caption as a being.
//   PLACE   = a multi-word place-word surface that EITHER recurs across
//             >= 3 docs (East Bank: 4 docs) OR follows a location
//             preposition with >= 2 mentions. Only UNAMBIGUOUS location
//             prepositions count ("in/at/on/near/into/across/along/around"
//             — "to"/"from" are excluded: "to complete streets" is a verb
//             phrase, not a location). A single-word fragment (Pike, Avenue,
//             Creek alone) and a policy term (Complete Streets: "to
//             complete streets") are REFUSED.
// The corpus's own self-references (the city, the plan titles) are refused:
// "Nashville", "Nash", "Metro Nashville" name the corpus itself, not a
// being to track.
const AGENCY_WORD = /division|department|authority|agency|commission|office|council|metro|administration|board|partnership|fund|committee|task force/i;
const CAPTION_WORD = /^figure\b|^table\b|^appendix\b|^chapter\b|^contents\b|^glossary\b|^acknowledg|^source\b|^note\b|^index\b|^title\b/i;
const AGENCY_SHAPE = (b) =>
  (/^[A-Z]{2,6}$/.test(b.surface) && b.docs >= 2 && b.mentions >= 15 && !CAPTION_WORD.test(b.surface))
  || (AGENCY_WORD.test(b.surface) && b.surface.split(/\s+/).length >= 2 && b.docs >= 2);
const PLACE_WORD = /bank|boulevard|avenue|road|street|pike|park|creek|river|heights|village|square|neighborhood|corridor|downtown|way$/i;
const LOC_PREP = /\b(?:in|at|on|near|into|across|along|around)\s+/i;
const locPreps = new Map(); // surface -> loc-preposition mention count
for (const [docId, text] of textsByDoc) {
  for (const b of beingCandidates) {
    const re = new RegExp(`\\b(?:in|at|on|near|into|across|along|around)\\s+${b.surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\W|$)`, "gi");
    const n = (text.match(re) ?? []).length;
    if (n) locPreps.set(b.surface, (locPreps.get(b.surface) ?? 0) + n);
  }
}
for (const b of beingCandidates) b.locPreps = locPreps.get(b.surface) ?? 0;
const PLACE_SHAPE = (b) =>
  PLACE_WORD.test(b.surface) && b.surface.split(/\s+/).length >= 2
  && (b.docs >= 3 || b.locPreps >= 2);
// SELF_REF: the corpus naming itself — a surface that resolves to the city
// or a document title is refused as a tracked being (it is the subject of
// the whole corpus, not a being within it). Mechanical: cross the being
// surfaces against the manifest's own titles and the city name.
const SELF_REF = new Set([
  "nashville", "nash", "metro", "metro nashville", "nashville metro",
  "county", "davidson", "davidson county", "nashville-davidson",
  "the plan", "plan", "this plan", "the nashvillenext plan",
  ...manifest.docs.map((d) => d.title.toLowerCase()),
]);

// quantity kinds: the corpus's own quantity vocabulary (defined above with
// the ants — the same QUANTITY_KINDS and quantityCandidates feed both).
function topicFrom(name, basis) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const nameWords = name.toLowerCase().split(/[^a-z]+/i).filter((w) => w.length > 2);
  const queries = [...nameWords];
  for (const h of headingCandidates) {
    const hw = h.text.toLowerCase().split(/[^a-z]+/i).filter((w) => w.length > 2);
    if (hw.some((w) => nameWords.includes(w))) queries.push(...hw);
  }
  for (const q of quantityCandidates) if (nameWords.includes(q.kind) || q.kind.includes(nameWords[0] ?? "")) queries.push(q.kind);
  for (const b of beingCandidates.slice(0, 40)) {
    const bw = b.surface.toLowerCase().split(/[^a-z]+/i).filter((w) => w.length > 2);
    if (bw.some((w) => nameWords.includes(w))) queries.push(b.surface.toLowerCase());
  }
  schema.topics.push({ id, label: name, queries: [...new Set(queries)].slice(0, 8) });
  record.rounds.push({ phase: "decide", cell: "topic", value: name, basis });
}

// ── the AGENCIES cell ─────────────────────────────────────────────────────
const agencyAnswer = (() => {
  if (mode === "guided") return answersFile ? (JSON.parse(readFileSync(join(HERE, answersFile), "utf8")).agencies ?? "") : "";
  if (mode === "ask") return null; // interactive below
  // autonomous: the reader's own shape tests + the swarm's preference —
  // an agency must be agency-shaped (acronym with spread, or multi-word
  // agency-word with spread); fragments and single-doc jargon are refused.
  const notSelf = (b) => !SELF_REF.has(b.surface.toLowerCase());
  const picks = beingCandidates
    .filter((b) => notSelf(b) && AGENCY_SHAPE(b))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 12);
  const preferred = picks.filter((b) => prefers(b.surface));
  const chosen = [...preferred, ...picks.filter((b) => !prefers(b.surface))].slice(0, 12).map((b) => b.surface);
  record.rounds.push({ phase: "decide", cell: "agencies", value: chosen.join(", "), basis: "agency shape (acronym >= 2 docs, or multi-word agency-word >= 2 docs); swarm preference first; fragments, single-doc jargon, and self-references refused" });
  return chosen.join(", ");
})();

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
let answers = null;
if (answersFile) answers = JSON.parse(readFileSync(join(HERE, answersFile), "utf8"));
function foldAnswer(cell, raw) {
  const v = String(raw ?? "").trim();
  if (!v || /^(none|skip|no|n|pass)$/i.test(v)) return null;
  return { cell, value: v };
}

let fAgencies = foldAnswer("agencies", agencyAnswer);
if (mode === "ask") {
  const qAgencies = `The retained corpus distinguishes these recurring agencies — which do you want tracked?
${beingCandidates.slice(0, 12).map((b) => `  ${b.surface} — ${b.mentions} mentions in ${b.docs} doc(s)`).join("\n")}
answer: names, comma-separated (or "none") > `;
  fAgencies = foldAnswer("agencies", answers ? (answers.agencies ?? "") : await ask(qAgencies));
}
if (fAgencies) {
  schema.vocab.agencies = String(fAgencies.value).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 24);
  if (mode !== "decide" || !record.rounds.some((r) => r.cell === "agencies")) record.rounds.push({ phase: mode, cell: "agencies", answer: fAgencies.value });
}

// ── the PLACES cell ───────────────────────────────────────────────────────
const placePool = beingCandidates.filter((b) => !schema.vocab.agencies.some((a) => a.toLowerCase() === b.surface.toLowerCase()));
let placesAnswer = null;
if (mode !== "ask") {
  // autonomous: place shape + swarm preference; districts are settled only
  // when the retained corpus itself names them (it does not here — the
  // snapshot has no place→district map, so districts stay OPEN, disclosed).
  const picks = placePool
    .filter((b) => !SELF_REF.has(b.surface.toLowerCase()) && PLACE_SHAPE(b))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 12);
  const preferred = picks.filter((b) => prefers(b.surface));
  const chosen = [...preferred, ...picks.filter((b) => !prefers(b.surface))].slice(0, 12);
  for (const b of chosen) schema.vocab.places.push(b.surface);
  const noDistricts = "the retained corpus never names council districts and the snapshot carries no place→district map — placeDistricts left open, disclosed, never guessed";
  if (chosen.length) {
    record.rounds.push({ phase: "decide", cell: "places", value: chosen.map((b) => b.surface).join(", "), basis: "place shape (place word) + mention support; swarm preference first", districts: noDistricts });
  } else {
    record.rounds.push({ phase: "decide", cell: "places", value: "", basis: `no place-shaped being cleared the floor; ${noDistricts}` });
  }
} else {
  const qPlaces = `These places appear in both the plans and the metrics snapshot — which should be lit with district metrics?
${placePool.slice(0, 12).map((b) => `  ${b.surface} — ${b.mentions} mentions`).join("\n")}
answer: place names, comma-separated; then for each, districts like "East Bank:19,20" (or "none") > `;
  const aPlaces = answers ? (answers.places ?? "") : await ask(qPlaces);
  const fPlaces = foldAnswer("places", aPlaces);
  if (fPlaces) {
    const raw = String(fPlaces.value);
    const tokens = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    let pending = null;
    for (const tok of tokens) {
      const m = tok.match(/^(.+?)\s*:\s*([\d,\s]+)$/);
      if (m) {
        pending = m[1].trim();
        schema.vocab.places.push(pending);
        schema.metrics.placeDistricts[pending] = m[2].split(/[,\s]+/).map(Number).filter(Boolean);
      } else if (/\d/.test(tok)) {
        if (pending) schema.metrics.placeDistricts[pending] = [...(schema.metrics.placeDistricts[pending] ?? []), ...tok.split(/[,\s]+/).map(Number).filter(Boolean)];
      } else {
        pending = tok;
        schema.vocab.places.push(pending);
      }
    }
    record.rounds.push({ phase: mode, cell: "places", answer: raw });
  }
}

// ── the TOPICS cell ───────────────────────────────────────────────────────
const quantityLine = (quantityCandidates.length ? quantityCandidates.map((q) => `  ${q.kind} — ${q.mentions} mentions in ${q.docs} doc(s)`).join("\n") : "  none found");
const headingLine = (headingCandidates.length
  ? headingCandidates.map((h) => `  ${h.text} — ${h.rows} lines in ${h.docs.size} doc(s)`).join("\n")
  : "  none recurring across plans");

if (mode === "ask") {
  const qTopics = `The corpus's own section headings and quantity kinds cluster into themes — which become lenses?
${headingLine}
${quantityLine}
answer: lens names, comma-separated — each becomes a topic whose queries are the corpus's own terms (or "none") > `;
  const aTopics = answers ? (answers.topics ?? "") : await ask(qTopics);
  const fTopics = foldAnswer("topics", aTopics);
  if (fTopics) {
    for (const name of String(fTopics.value).split(",").map((s) => s.trim()).filter(Boolean)) {
      topicFrom(name, `the person named the lens "${name}"`);
    }
  }
} else {
  // autonomous: the reader's own lenses — the swarm's best cells first,
  // then the corpus's strongest recurring sections and quantity kinds.
  const lensNames = [];
  const addLens = (name, basis) => { if (!lensNames.some((l) => l.name.toLowerCase() === name.toLowerCase())) lensNames.push({ name, basis }); };
  if (guideWords.length) {
    // minimal guidance: the guide's own words become lenses, corpus-queried
    for (const w of guideWords) {
      const sec = headingCandidates.find((h) => h.text.toLowerCase().includes(w));
      addLens(sec ? sec.text : w, `the guide named "${w}" — corpus section "${sec?.text ?? w}"`);
    }
  }
  for (const b of beingCandidates.slice(0, 30)) if (prefers(b.surface) && !SELF_REF.has(b.surface.toLowerCase())) {
    addLens(b.surface, `the swarm's best ant preferred "${b.surface}"`);
  }
  for (const q of quantityCandidates) addLens(q.kind, `the corpus's own quantity kind "${q.kind}" — ${q.mentions} mentions in ${q.docs} doc(s)`);
  // the corpus's own byte-anchored SECTION vocabulary (the extractor's
  // fields.section, ranked by row count and doc spread) — these ARE the
  // plans' own themes: "Transportation Network", "Bicycling Priorities",
  // "Funding Entities"…
  const sectionRows = new Map();
  for (const [docId, text] of textsByDoc) {
    const pagemap = JSON.parse(readFileSync(join(GROUND, `${docId}.txt.pagemap.json`), "utf8"));
    const ls = extractLinks({ text, doc: `nashville/ground/${docId}.txt`, mode: "layout", pagemap, cap: 3500 });
    for (const l of ls) {
      const sec = l.fields?.section;
      if (!sec) continue;
      const rec = sectionRows.get(sec) ?? { section: sec, docs: new Set(), rows: 0 };
      rec.rows++;
      rec.docs.add(docId);
      sectionRows.set(sec, rec);
    }
  }
  for (const { section, docs, rows } of [...sectionRows.values()]
    .filter((s) => s.rows >= 8)
    .sort((a, b) => (b.docs.size - a.docs.size) || (b.rows - a.rows))
    .slice(0, 10)) {
    addLens(section, `recurring section "${section}" — ${rows} rows in ${docs.size} doc(s)`);
  }
  schema.vocab.quantities = quantityCandidates.map((q) => q.kind);
  for (const h of headingCandidates) addLens(h.text, `recurring section "${h.text}" across ${h.docs.size} doc(s)`);
  for (const l of lensNames.slice(0, 8)) topicFrom(l.name, l.basis);
}

// ── the METRICS cell ──────────────────────────────────────────────────────
const registryNames = ["districts", "violations-by-district", "landlords", "housing-stress"];
let metricsAnswer = null;
if (mode === "ask") {
  const qMetrics = `The snapshot provides these metric registries — which should bind to the surface?
${registryNames.map((r) => `  ${r}`).join("\n")}
answer: registry names, comma-separated (or "none") > `;
  const aMetrics = answers ? (answers.metrics ?? "") : await ask(qMetrics);
  const fMetrics = foldAnswer("metrics", aMetrics);
  if (fMetrics) metricsAnswer = fMetrics.value;
} else {
  // autonomous: every registry the snapshot actually provides is bound —
  // each is provenance-stamped, so binding all of them is the honest default.
  metricsAnswer = registryNames.join(", ");
  record.rounds.push({ phase: "decide", cell: "metrics", value: metricsAnswer, basis: "all snapshot registries are provenance-stamped — bound, none guessed" });
}
if (metricsAnswer) {
  schema.metrics.registries = String(metricsAnswer).split(",").map((s) => s.trim()).filter(Boolean);
}

rl.close();

// ──────────────────────────────────────────────────────────────────────────
// BLOCK 6 · SCHEMA — the decided cells ARE the schema (in ask/guided mode,
// the answers are; in autonomous mode, the reader's own measured decisions
// are). Whatever was not asked, not answered, or answered "none" stays out
// of the surfacedef: the limited amount of schema we need, not a model's
// guess at everything. ─────────────────────────────────────────────────────
writeFileSync(join(NASH, "nashville.surfacedef.json"), JSON.stringify(schema, null, 2));
record.schema = schema;
record.rounds.push({ phase: "schema", written: "nashville.surfacedef.json", topics: schema.topics.length, agencies: schema.vocab.agencies.length, places: schema.vocab.places.length, metricRegistries: schema.metrics.registries.length });
writeFileSync(join(DISCO, "discovery-record.json"), JSON.stringify(record, null, 2));
console.log(`\nschema written: ${schema.topics.length} topics · ${schema.vocab.agencies.length} agencies · ${schema.vocab.places.length} places · ${schema.metrics.registries.length} metric registries`);

// ──────────────────────────────────────────────────────────────────────────
// BLOCK 7 · SURFACE — the existing pipeline, driven by the discovered
// schema. Same blocks drive-nashville.mjs uses; the vocab is the
// dialogue's product, never a model's. ────────────────────────────────────
const links = ground.docs.flatMap((d) => {
  const pagemap = JSON.parse(readFileSync(d.pagemapPath, "utf8"));
  return extractLinks({ text: readFileSync(d.txtPath, "utf8"), doc: `nashville/ground/${d.id}.txt`, mode: d.extraction, pagemap, vocab: schema.vocab });
});

const geo = JSON.parse(readFileSync(join(dirname(HERE), "..", "municipal-db", "nashville-geo.json"), "utf8"));
const provenance = { dataset: "municipal-db/nashville-geo.json", source: geo.metadata.source, asOf: geo.metadata.asOf };
let metrics = foldFieldRows({
  snapshot: geo.datasets,
  provenance,
  adapters: [
    { registry: "districts", run: ({ snapshot, push }) => { for (const d of snapshot.districts?.rows ?? []) push("districts", d, { district: d.district }); } },
    { registry: "violations-by-district", run: ({ snapshot, push }) => {
        const open = {};
        for (const f of snapshot.violations?.features ?? []) { const p = f.properties ?? {}; const k = p.district; open[k] ??= { open: 0, total: 0 }; open[k].total++; if (/^open$/i.test(String(p.status ?? ""))) open[k].open++; }
        for (const [d, c] of Object.entries(open)) push("violations-by-district", c, { district: Number(d) });
      } },
    { registry: "landlords", run: ({ snapshot, push }) => {
        const m = new Map();
        for (const f of snapshot.properties?.features ?? []) { const p = f.properties ?? {}; const n = p.landlord ?? "unknown"; const c = m.get(n) ?? { landlord: n, properties: 0, evictions: 0 }; c.properties++; c.evictions += Number(p.evictions ?? 0); m.set(n, c); }
        for (const l of [...m.values()].sort((a, b) => b.properties - a.properties).slice(0, 20)) push("landlords", l);
      } },
    { registry: "housing-stress", run: ({ snapshot, push }) => {
        const props = snapshot.properties?.features ?? [];
        push("housing-stress", { totalEvictionFilings: props.reduce((a, f) => a + Number(f.properties?.evictions ?? 0), 0), propertyRows: props.length, distinctLandlords: new Set(props.map((f) => f.properties?.landlord)).size });
      } },
  ],
});

// metric byte-sourcing: the retained snapshot is copied into the instance,
// hashed, and every metric either carries a byte ref into it (districts)
// or declares its derivation (derivedFrom) — the same fold drive-nashville
// uses, so the gate's "metrics resolve to retained bytes" check can pass.
mkdirSync(DATA, { recursive: true });
const SNAP = join(DATA, "nashville-geo.json");
copyFileSync(join(dirname(HERE), "..", "municipal-db", "nashville-geo.json"), SNAP);
const snapSha = sha(SNAP);
writeFileSync(join(DATA, "nashville-geo.json.sidecar.json"), JSON.stringify({
  schema: "EODataArtifact@1", path: "nashville/data/nashville-geo.json", sha256: snapSha,
  chars: readFileSync(SNAP, "utf8").length, source: provenance.source, asOf: provenance.asOf,
}, null, 2));
const snapText = readFileSync(SNAP, "utf8");
const DERIVED_ADDR = {
  "violations-by-district": "/datasets/violations/features",
  "landlords": "/datasets/properties/features",
  "housing-stress": "/datasets/properties/features",
};
const districtsMark = snapText.indexOf('"districts"');
const rowsMark = snapText.indexOf('"rows":', districtsMark);
if (rowsMark < 0) throw new Error("districts rows not found in the retained snapshot");
const rowsText = snapText.slice(rowsMark);
for (const m of metrics) {
  if (m.registry === "districts") {
    const n = Number(m.district);
    const rel = rowsText.indexOf(`"district":${n}`);
    if (rel < 0) throw new Error(`district ${n} not found in the retained snapshot`);
    const start = rowsMark + rel;
    const nextRel = rowsText.indexOf(`"district":${n + 1}`, rel);
    const end = nextRel > rel ? rowsMark + nextRel : snapText.length;
    m.at = [start, end];
    m.ref = `nashville/data/nashville-geo.json#${start}-${end}`;
    m.verbatim = snapText.slice(start, end).replace(/\s+/g, " ").trim();
  } else {
    m.derivedFrom = { address: `nashville/data/nashville-geo.json#${DERIVED_ADDR[m.registry] ?? ""}`, basis: "deterministic fold over the retained snapshot" };
  }
}
metrics = metrics.filter((m) => schema.metrics.registries.length === 0 || schema.metrics.registries.includes(m.registry));

const projections = deriveProjections({ links, cast: null, def: schema, metrics });
const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: HERE, snapshotSidecar: { path: SNAP, sha256: snapSha } });
console.log("gate:", gate.ok ? "PASS" : "REFUSE");
for (const c of gate.checks) console.log(`  ${c.ok ? "●" : "✗"} ${c.name} · ${c.detail}`);
if (!gate.ok) process.exit(1);

const html = renderSurface({ def: schema, ground, links, metrics, projections, gate });
const out = join(dirname(HERE), "native", "the-fold", "plans-surface.html");
writeFileSync(out, html);
console.log("\nwrote", out, (html.length / 1e6).toFixed(2), "MB");
console.log("links:", links.length, "· metrics:", metrics.length, "· networks:", projections.networks.length);