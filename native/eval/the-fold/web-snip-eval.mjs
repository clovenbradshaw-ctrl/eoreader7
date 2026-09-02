// eval/web-snip-eval.mjs — DEF → hunt → EVA → REC, against real fetched web
// pages, using the SAME organs already built for local grounds — not a
// parallel mechanism. Re-runnable eval driver, not a committed regression
// test (P19's/P27's own posture) — `node eval/web-snip-eval.mjs` with
// explore-server.mjs already running on :8812.
//
// The shape, per direct user correction mid-build, twice: (1) DEF the open
// slot, never a guessed filler; EVA computes what the hunt found; a
// disagreement between the DEF's own declared shape and the EVA's finding
// is what triggers REC, conceding the DEF via grid.js's real
// `concedeEvaluation`. (2) DEF/EVA/REC are each already ONE reusable organ
// in this repo — an earlier draft of this script built a SECOND,
// web-specific relation-reading/discovery mechanism (`bestStatement`,
// `discoverFillers`, a `namesIn`-based candidate proxy) instead of reusing
// the one hypergraph.js/capacity-runner.js already has. That draft was
// deleted, not patched — see web-claim.js's header for the full account,
// including the real bug it produced live (false multi-cardinality on a
// single-answer control, "who was the first president", because `namesIn`
// finds any capitalized span, not an alternative filler of one slot).
//
// What EVA actually needs, ground-agnostic: an array of chunks
// (`chunkSource`, this app's one chunker, unchanged) handed to
// `hypergraph.js::makeRelationReader`'s reader. `reader.read(claim)`
// already computes `cardinality: {fillers}` for free (P32's own
// `clusterFillers`) the moment a ground's edges show competing objects for
// one subject+verb; `reader.queryReferents({subject, verb, object})` —
// wired identically into capacity-runner.js's own `runCapacity("relations",
// {query})` branch — is the SAME repo's own already-built, referent-aware
// open-slot discovery (resolves "Lincoln"/"President Lincoln" as one
// subject via cast.js). Pooling multiple fetched pages' chunks into ONE
// reader call is the only genuinely new step: `runCapacity`'s own wrapper
// takes a single (name, text) pair, so this script calls
// `makeRelationReader`'s reader directly rather than through that
// one-source wrapper — everything downstream is the unmodified organ.
//
// Disclosed, not silently implied as production-wired: this script is a
// demonstration harness, not a change to the shipped
// `capacity-runner.js::landAct`, which is fully SYNCHRONOUS today and
// would need a real contract change to accept an async web ground —
// named, unbuilt integration work, the identical posture P36's own header
// already takes for the ordinary chat pipeline.

import * as operators from "../../eoreader7/legacy-eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import * as enginePriors from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import { splitSentences as engineSentences } from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js";
import { tokenize } from "../source.js";
import { makeRelationReader } from "../hypergraph.js";
import { chunkSource } from "../source.js";
import { makeGrid } from "../grid.js";
import { CAPACITIES, findCapacity, unresolvedCapacity } from "../../eoreader7/native/organs/index.js";
import { declaredSlotShape } from "../web-claim.js";
import { rankResults } from "../proof.js";

const EXPLORE = "http://localhost:8812";

// The real relation-reading organ (hypergraph.js's own) — the SAME factory
// app.js builds `relationsFor` from, just with Node-relative engine paths
// instead of the browser's `/engine` mount.
const relationsFor = makeRelationReader({
  splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
});

function freshGrid() {
  const grid = makeGrid({ operators, taskLog });
  grid.withCapacities({ findCapacity, unresolvedCapacity });
  return grid;
}

// The local explore-server connection itself, not DDG, dropped intermittently
// under this eval's own back-to-back specimen load (ECONNRESET, no HTTP
// status at all) — a transient local-loopback flake, not a finding about
// search quality. One retry after a short pause; a second failure is a
// real gap, reported as one.
async function withRetry(fn, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastErr;
}

async function search(query) {
  const res = await withRetry(async () =>
    (await fetch(`${EXPLORE}/api/web/search`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }),
    })).json());
  return res.gap ? { gap: res.gap, results: [] } : { gap: null, results: res.results ?? [] };
}

async function fetchPage(url) {
  const f = await (await fetch(`${EXPLORE}/api/web/fetch`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }),
  })).json();
  if (f.gap || !f.entry?.textPath) return { gap: f.gap ?? { silence: "not-present", detail: "no textPath" } };
  const basename = String(f.entry.textPath).split("/").pop();
  const res = await fetch(`${EXPLORE}/web/pages/${basename}`);
  if (!res.ok) return { gap: { silence: "not-present", detail: `page fetch ${res.status}` } };
  const text = await res.text();
  if (!text.trim()) return { gap: { silence: "not-present", detail: "empty text face" } };
  return { url: f.entry.finalUrl ?? url, host: new URL(f.entry.finalUrl ?? url).host, text, challenge: !!f.entry.challenge };
}

/** Search, rank (proof.js's own rankResults, reused — not re-derived), and
 * fetch up to `maxPages` real pages. Returns `{pages, failed}`. */
async function gatherPages(query, anchorSentence, maxPages = 6) {
  const { gap, results } = await search(query);
  if (gap) return { pages: [], failed: [], gap };
  const ranked = rankResults({ sentence: anchorSentence, tokens: [] }, results);
  const pages = [];
  const failed = [];
  for (const r of ranked.slice(0, maxPages)) {
    const f = await fetchPage(r.url);
    if (f.gap) failed.push({ url: r.url, gap: f.gap });
    else pages.push(f);
  }
  return { pages, failed };
}

const hostsOf = (refs) => [...new Set((refs ?? []).map((r) => String(r).split("#")[0]))];

const textForRef = (chunks, ref) => chunks.find((c) => c.ref === ref)?.text ?? null;

// The question's OWN copula, read off its own words rather than guessed
// from a hand-typed verb list — "was"/"is"/"were"/"are" is a genuinely
// closed grammatical class (English copula forms), and all three of this
// eval's specimens are phrased with one. Left `null` (no filter) when the
// question uses none — `queryAcrossPages` degrades to today's wider,
// disclosed-as-noisier open-verb query rather than refusing outright.
// Retrieval as a function of the question's own words (READING-POLICY),
// applied to which verb a discovery query narrows on.
const COPULA_FORMS = new Set(["was", "is", "were", "are"]);
function copulaOf(question) {
  const tokens = String(question ?? "").toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  return tokens.find((t) => COPULA_FORMS.has(t)) ?? null;
}

// The identical bidirectional fold-substring match hypergraph.js's own
// `queryEdges`/`queryFillers` already use INSIDE one reader ("a query for
// 'Lincoln' will not itself resolve 'President Lincoln' and 'Lincoln' as
// the same referent the way judge() does internally; it folds diacritics/
// case and matches by containment" — hypergraph.js's own disclosed limit,
// stated exactly for this situation). Needed here because clustering now
// happens ACROSS separate per-page readers, where no shared referent index
// exists to do this properly — the same disclosed weaker fallback
// hypergraph.js's own standalone query functions already accept for the
// identical reason, not a new or looser rule invented for this script.
const foldFor = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
const foldMatches = (a, b) => {
  const x = foldFor(a), y = foldFor(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

/**
 * ONE reader per page — NOT pooled across pages. Found live: concatenating
 * several unrelated pages' text into one ground before this fix let
 * cast.js's coreference resolution bleed a pronoun ("he") across a page
 * boundary toward the WRONG antecedent from the PRECEDING page (Andrew
 * Johnson's own page, fetched first, "leaking" into what should have been
 * an isolated read of Hannibal Hamlin's page) — every candidate the query
 * below returned was really about Johnson, not the intended subject. A
 * "ground" in this repo has always meant one coherent document (the same
 * reason a local `evaluate ground <source>` names exactly one loaded
 * source); this respects that boundary and aggregates ACROSS pages at the
 * script level instead — the identical shape `proof.js::foldProof` already
 * uses to combine several independently-assessed pages' verdicts.
 *
 * Runs the SAME real `reader.queryReferents` organ once per page, clusters
 * the results by fold-substring match ACROSS pages (see `foldMatches`
 * above — one page saying "Hannibal Hamlin" and another saying "Hamlin"
 * must merge, and only `queryReferents`'s OWN within-page referent
 * resolution can do this precisely; across independently-built readers
 * this fold is the honest, weaker fallback hypergraph.js's own standalone
 * query functions already disclose), and keeps only clusters corroborated
 * on `minHosts` or more DISTINCT hosts. The cluster's representative text
 * is its LONGEST seen form ("Hannibal Hamlin" over "Hamlin") — more of the
 * source's own words, never a re-typed summary.
 */
function queryAcrossPages(pages, { subject = null, verb = null, object = null }, minHosts = 2) {
  const clusters = []; // [{text, refs: string[], hosts: Set}]
  const chunksByPage = new Map(); // host -> chunks (for later verbatim lookup)
  let pagesWithEdges = 0;

  for (const p of pages) {
    const chunks = chunkSource(p.host, p.text);
    chunksByPage.set(p.host, chunks);
    let reader;
    try {
      reader = relationsFor(chunks);
    } catch {
      continue;
    }
    if (!reader?.examined) continue;
    const found = reader.queryReferents({ subject, verb, object }) ?? [];
    if (found.length) pagesWithEdges++;
    for (const f of found) {
      const value = f.subject ?? f.object;
      if (!foldFor(value)) continue;
      let c = clusters.find((x) => foldMatches(x.text, value));
      if (!c) {
        c = { text: value, refs: [], hosts: new Set() };
        clusters.push(c);
      } else if (value.length > c.text.length) {
        c.text = value; // keep the fuller source-stated form
      }
      c.refs.push(...f.refs);
      for (const h of hostsOf(f.refs)) c.hosts.add(h);
    }
  }

  const fillers = clusters
    .map((c) => ({ text: c.text, refs: [...new Set(c.refs)], hosts: [...c.hosts] }))
    .filter((c) => c.hosts.length >= minHosts)
    .sort((a, b) => b.hosts.length - a.hosts.length);

  return { fillers, pagesWithEdges, chunksByPage };
}

/**
 * The full DEF → hunt → EVA → REC pass for one open-slot question, against
 * real fetched pages, using the real `reader.queryReferents` organ. Prints
 * every step as it lands so the real log is legible, not just its final
 * projection. Exactly one of `subject`/`object` is given — the OPEN slot,
 * `queryReferents`'s own contract.
 */
async function runSlot({ label, question, slotObject, searchQuery, anchorPhrase, subject = null, object = null }) {
  console.log(`\n${"=".repeat(70)}\n${label}\n${"=".repeat(70)}`);
  console.log(`question: ${question}`);

  const grid = freshGrid();
  let log = grid.createLog();

  // ── DEF the open slot ──────────────────────────────────────────────────
  const defParsed = grid.parseAct(`define "${slotObject}" at Link from generate`, { log });
  if (!defParsed.ok) { console.log("DEF refused:", defParsed.refusal); return; }
  const landedDef = grid.land(log, defParsed.event);
  log = landedDef.log;
  const defTaskId = landedDef.ids[0];

  const shape = declaredSlotShape(question, {
    definiteDeterminers: enginePriors.DEFINITE_DETERMINERS,
    inflectionalSuffixes: enginePriors.INFLECTIONAL_SUFFIXES,
    interrogativePronouns: enginePriors.INTERROGATIVE_PRONOUNS,
    mannerReasonPronouns: enginePriors.MANNER_REASON_PRONOUNS,
  });
  console.log(`DEF landed (${defTaskId}): "${slotObject}" — declared shape: ${shape.declared} (marker: ${shape.marker ?? "none"}, head: ${shape.headPhrase ?? "none"})`);
  const shapeAttach = grid.attachResult(log, defTaskId, { declaredShape: shape.declared, marker: shape.marker, headPhrase: shape.headPhrase });
  if (shapeAttach.ok) log = shapeAttach.log;

  // ── hunt ────────────────────────────────────────────────────────────────
  console.log(`hunting: searching "${searchQuery}"...`);
  const { pages, failed, gap } = await gatherPages(searchQuery, anchorPhrase);
  if (gap) console.log(`  search gap: ${JSON.stringify(gap)}`);
  console.log(`  fetched ${pages.length} page(s), ${failed.length} failed`);
  for (const p of pages) console.log(`    - ${p.host} ${p.challenge ? "(challenge)" : ""} ${p.url}`);
  for (const f of failed) console.log(`    x ${f.url} — ${JSON.stringify(f.gap)}`);

  // ── EVA computes — the SAME reader.queryReferents capacity-runner.js's
  // own `runCapacity("relations", {query})` branch already wires, called
  // once per page (a ground is one document) and aggregated across pages
  // at the script level, `foldProof`'s own shape ──────────────────────────
  const evaParsed = grid.parseAct(`evaluate "${slotObject}" at Link from differentiate ground web broken:rotation`, { log });
  if (!evaParsed.ok) { console.log("EVA refused:", evaParsed.refusal); return; }
  const landedEva = grid.land(log, evaParsed.event);
  log = landedEva.log;
  const evaTaskId = landedEva.ids[0];

  const verb = copulaOf(question);
  console.log(`  query verb (from the question's own words): ${verb ?? "(none found — leaving open)"}`);
  const { fillers, pagesWithEdges, chunksByPage } = pages.length
    ? queryAcrossPages(pages, { subject, verb, object })
    : { fillers: [], pagesWithEdges: 0, chunksByPage: new Map() };

  let verdict;
  if (!pages.length) verdict = "not-consulted";
  else if (!fillers.length) verdict = "uncorroborated";
  else if (fillers.length > 1) verdict = "multiple-corroborated";
  else verdict = "single-corroborated";

  console.log(`EVA landed (${evaTaskId}) — computed verdict: ${verdict} (${pagesWithEdges} of ${pages.length} page(s) had a matching edge)`);
  for (const f of fillers) {
    console.log(`  filler "${f.text}" — refs: ${f.refs.join(", ")} (${f.hosts.length} host(s): ${f.hosts.join(", ")})`);
    for (const ref of f.refs.slice(0, 2)) {
      const host = ref.split("#")[0];
      const t = textForRef(chunksByPage.get(host) ?? [], ref);
      if (t) console.log(`      [${ref}] "${t.slice(0, 200)}${t.length > 200 ? "…" : ""}"`);
    }
  }

  const extra = {};
  if (verdict === "single-corroborated" || verdict === "multiple-corroborated") extra.verdict = "holds";
  const evaAttach = grid.attachResult(log, evaTaskId, { claim: slotObject, source: "web", fillers, verdict }, extra);
  if (evaAttach.ok) log = evaAttach.log;

  // ── REC iff the hunt found more fillers than the DEF's own shape said ───
  if (fillers.length > 1) {
    const trigger = `found ${fillers.length} independently corroborated answers for one slot (${fillers.map((f) => `${f.text}, ${f.hosts.length} host(s)`).join("; ")}) — the slot was defined as if it held one`;
    const rec = grid.concedeEvaluation(log, defTaskId, { trigger });
    if (rec.ok) {
      log = rec.log;
      console.log(`REC fired (${rec.id}): concedes ${defTaskId} — "${trigger}"`);
    } else {
      console.log("REC refused (unexpected):", rec.refusal);
    }
  } else {
    console.log("no REC — declared shape and finding agree (or nothing corroborated to disagree with)");
  }

  const folded = grid.foldGrid(log);
  console.log("\nfoldGrid landings:");
  for (const l of folded.landings) console.log(`  ${l.task_id} "${l.object}" -> ${l.status}${l.reason ? ` (${l.reason})` : ""}`);
  console.log(`log entries: ${log.entries.length} (kinds: ${log.entries.map((e) => e.kind).join(",")})`);
  const recEntries = log.entries.filter((e) => e.operator === "REC");
  console.log(`REC entries on this log: ${recEntries.length}`);

  return { log, verdict, fillers, shape, recCount: recEntries.length };
}

async function main() {
  const results = {};

  // Specimen 1 — the user's own worked example: Lincoln's VP has TWO right
  // answers. Object fixed ("vice president"), subject OPEN — found live:
  // real prose almost always states this with the VP's own name as the
  // grammatical subject ("Hamlin was the 15th vice president..."), Lincoln
  // appearing only as a modifier/PP, never as the sentence's own subject —
  // subject:"Lincoln" (tried first) matched nothing about the actual VPs at
  // all. The search already scoped every fetched page to Lincoln
  // specifically, so the edge itself does not need to name him again.
  // Expect: DEF declares "single" (possessive marker on "vice president"),
  // EVA finds 2 corroborated fillers, REC fires against the DEF.
  results.lincoln = await runSlot({
    label: "Specimen 1 — who was Lincoln's vice president?",
    question: "Who was Lincoln's vice president?",
    slotObject: "Lincoln's vice president",
    searchQuery: "Abraham Lincoln vice president",
    anchorPhrase: "Lincoln vice president",
    object: "vice president",
  });

  // Specimen 2 — tonight's own Andrew Johnson ordinal question, against the
  // real web instead of one pasted paragraph. Subject fixed (Andrew
  // Johnson), object open. Expect: cross-office contamination (17th
  // president / 16th VP) should not corrupt a SINGLE answer, since
  // queryReferents clusters by the edge's own bound object, not by nearby
  // capitalized spans.
  results.johnson = await runSlot({
    label: "Specimen 2 — what number president was Andrew Johnson?",
    question: "What number president was Andrew Johnson?",
    slotObject: "Andrew Johnson's presidential number",
    searchQuery: "Andrew Johnson 17th president",
    anchorPhrase: "Andrew Johnson president",
    subject: "Andrew Johnson",
  });

  // Specimen 3 — a genuine single-cardinality control. Object fixed
  // ("first president"), subject open (the "who"). Expect: EVA finds
  // exactly one corroborated filler (George Washington), REC stays silent
  // — the specific bug this session had earlier tonight (REC not staying
  // silent on repeat agreement) must not recur here, and the earlier,
  // now-deleted namesIn-based draft's false positive on this EXACT
  // specimen must not recur either.
  results.washington = await runSlot({
    label: "Specimen 3 — control: who was the first president of the United States?",
    question: "Who was the first president of the United States?",
    slotObject: "the first president of the United States",
    searchQuery: "first president of the United States",
    anchorPhrase: "first president United States",
    object: "first president",
  });

  console.log(`\n${"=".repeat(70)}\nSUMMARY\n${"=".repeat(70)}`);
  for (const [name, r] of Object.entries(results)) {
    if (!r) { console.log(`${name}: DID NOT COMPLETE`); continue; }
    console.log(`${name}: declared=${r.shape.declared}  verdict=${r.verdict}  fillers=${r.fillers.length}  REC-fired=${r.recCount > 0}`);
  }
}

main().catch((err) => {
  console.error("eval failed:", err);
  process.exit(1);
});
