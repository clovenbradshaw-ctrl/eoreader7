// eval/void-loop-e2e.mjs — the DEF/EVA/REC loop end to end, over REAL
// material, on the specimen it was built for and its kin.
//
//   node eval/void-loop-e2e.mjs [model]
//
// A re-runnable driver, not a committed regression test (P19/P27's own
// posture for this repo's evals). `void-loop.test.mjs` is the conformance
// suite; this is the thing that tells you whether the loop survives real
// bytes, which is a different question and the only one that settles it.
//
// WHAT IS REAL HERE, and what is not:
//   REAL — every passage is fetched live from Wikipedia (cached under
//          /tmp between runs so a re-run does not hammer the API); the
//          admission test actually reads the candidate's own page; the
//          grid is the real one bound to the real cube; every act lands
//          through the real composition law.
//   REAL — the model, when one is reachable at OLLAMA. It fills the
//          `encounter` rung and nothing else.
//   NOT  — nothing. When no model is reachable the encounter rung is a
//          TYPED SKIP recorded in the report, never a silent pass and
//          never a canned stand-in. (`proxy-runner.mjs`'s own posture
//          when this repo's sandbox had no Ollama: disclosed as exactly
//          that.)
//
// THE GENERATOR IS DELIBERATELY CRUDE, AND THAT IS THE MEASUREMENT.
// Candidate names come from a plain capitalised-run scan over real page
// text — the same junk-prone move `void-brief.js`'s header refuses to
// make in production ("the slot query returns «Though he», «Congress»,
// «22nd Amendment»"). It is used here ON PURPOSE: the loop's whole claim
// is that ADMISSION does the work, so a generator that offers junk is
// the only honest way to test the claim. Junk that reaches testimony is
// a failure of this design; junk that is refused with a reason is it
// working.

import * as operators from "../../eoreader7/native/kernel/cube.js";
import * as taskLog from "../../eoreader7/native/kernel/task-log.js";
import { makeGrid } from "../grid.js";
import { declareVoid, yearSpansIn } from "../void-shape.js";
import { openLoop, proposeFrom, admit, foldLoop, descend, closeLoop, reshapeTriggers, reshape, currentRung } from "../void-loop.js";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OLLAMA = "http://localhost:11434";
const MODEL = process.argv[2] ?? "gemma2:2b";
const CACHE = "/tmp/void-loop-e2e-cache";
const UA = "the-fold-void-loop-eval/1.0 (https://github.com/clovenbradshaw-ctrl/the-fold)";

// ── the specimens ────────────────────────────────────────────────────────────
//
// Each declares its void across all nine operators, as a caller would.
// The extents are DECLARED NARROWLY ON PURPOSE where a narrow reading is
// the natural first one — that is the condition under which a finding
// gets to reshape the space, which is half of what this driver exists to
// show.

const SPECIMENS = [
  {
    question: "who was Lincoln's vice president?",
    page: "Abraham Lincoln",
    fields: {
      slot: "vice president of Abraham Lincoln",
      anchor: "Abraham Lincoln",
      admits: "person",
      extent: { from: 1861, to: 1865 },
      dimension: "years",
      relation: "vice president",
      composition: "successive terms partition the extent",
      cardinality: "unknown",
      admission: "the candidate's own page states the relation, and its term span lies within the extent",
      reopensOn: "an uncovered stretch of the extent",
    },
  },
  {
    question: "who were Franklin D. Roosevelt's vice presidents?",
    page: "Franklin D. Roosevelt",
    fields: {
      slot: "vice president of Franklin D. Roosevelt",
      anchor: "Franklin D. Roosevelt",
      admits: "person",
      // The FIRST TERM alone — a narrow reading the material will
      // contradict twice over, reshaping the space each time.
      extent: { from: 1933, to: 1937 },
      dimension: "years",
      relation: "vice president",
      composition: "successive terms partition the extent",
      cardinality: "unknown",
      admission: "the candidate's own page states the relation, and its term span lies within the extent",
      reopensOn: "an uncovered stretch of the extent",
    },
  },
];

// ── real bytes, cached ───────────────────────────────────────────────────────

mkdirSync(CACHE, { recursive: true });
const slug = (s) => String(s).replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80);

async function cached(key, fn) {
  const path = join(CACHE, `${slug(key)}.json`);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  const value = await fn();
  writeFileSync(path, JSON.stringify(value));
  return value;
}

const pageText = (title) => cached(`page-${title}`, async () => {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "query", prop: "extracts", explaintext: "1", format: "json", titles: title })) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "user-agent": UA } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const page = Object.values((await res.json()).query.pages)[0];
  return { title: page.title, text: page.extract ?? "" };
});

const pageSummary = (title) => cached(`summary-${title}`, async () => {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`, { headers: { "user-agent": UA } });
  if (!res.ok) return { error: `HTTP ${res.status}`, extract: "" };
  const j = await res.json();
  return { title: j.title ?? title, extract: j.extract ?? "", type: j.type ?? null };
});

// ── the crude generator (see the header: its junk is the point) ──────────────

// A capitalised run of two or more words. Everything this misses and
// everything junk it admits is disclosed rather than filtered by a
// hand-typed stop list — the admission tier is what is being tested.
const NAME_RE = /\b([A-Z][a-z]{2,}(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]{2,})+)\b/g;

const sentencesAbout = (text, relation) =>
  String(text).split(/(?<=[.!?])\s+/).filter((s) => new RegExp(relation, "i").test(s));

/** Every sentence within `radius` of one that states the relation. */
function windowAround(text, relation, radius) {
  const S = String(text).split(/(?<=[.!?])\s+/);
  const re = new RegExp(relation, "i");
  const keep = new Set();
  S.forEach((s, i) => {
    if (!re.test(s)) return;
    for (let j = Math.max(0, i - radius); j <= Math.min(S.length - 1, i + radius); j += 1) keep.add(j);
  });
  return [...keep].sort((a, b) => a - b).map((i) => S[i]).join(" ");
}

function namesIn(text, { exclude = [] } = {}) {
  const out = new Map();
  for (const m of String(text).matchAll(NAME_RE)) {
    const n = m[1].trim();
    if (exclude.some((e) => n.includes(e) || e.includes(n))) continue;
    out.set(n, (out.get(n) ?? 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

// ── the admission test, executed for real ────────────────────────────────────
//
// This IS the declared admission of every specimen above: read the
// candidate's OWN page, require it to state the relation, and take its
// span from its own words. Nothing here consults the question, the
// anchor page, or a model — a filler is admitted by what its own source
// says about it, which is the only thing that makes junk refusable.

async function realAdmission(candidate, { declaration }) {
  const relation = declaration.cells.find((c) => c.op === "CON").declared;
  const s = await pageSummary(candidate.value);
  const text = s.extract ?? "";
  if (!text) return { verdict: "refused", because: `no page for «${candidate.value}»`, refs: [] };
  if (!new RegExp(relation, "i").test(text)) {
    return { verdict: "refused", because: `«${candidate.value}»'s own page never states «${relation}»`, refs: [s.title] };
  }
  // The relation is stated. Its span is whatever that page states.
  const spans = yearSpansIn(text);
  if (!spans.length) return { verdict: null, because: `«${candidate.value}» states the relation but no span — nothing settles where it sits`, refs: [s.title] };
  return { verdict: "holds", because: text.split(/(?<=[.!?])\s+/)[0].slice(0, 180), refs: [s.title], span: spans[0] };
}

// The span an admitted candidate turns out to have is read off the page,
// not guessed at proposal time — so proposals carry no span and `admit`
// learns it. void-loop.js takes the span from the CANDIDATE, so the
// driver folds the page's answer back onto it before admitting.
async function withSpans(candidates, declaration, reads) {
  const out = [];
  for (const c of candidates) {
    const read = await realAdmission(c, { declaration });
    reads.set(c.value, read);
    out.push({ ...c, span: read.span ?? null });
  }
  return out;
}

// ── the model, at the encounter rung only ────────────────────────────────────

async function modelReachable() {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

async function modelCandidates(question, already) {
  const prompt =
    `${question}\nName only people not already listed. Already listed: ${already.join(", ") || "none"}.\n` +
    `Answer as JSON only: {"names": ["Full Name", ...]}. If you know of none, answer {"names": []}.`;
  try {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, stream: false, format: "json",
        options: { temperature: 0, num_predict: 200 },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const body = await res.json();
    const parsed = JSON.parse(body.message?.content ?? "{}");
    return { names: (parsed.names ?? []).filter((n) => typeof n === "string" && n.trim()).slice(0, 6) };
  } catch (e) { return { error: String(e?.message ?? e) }; }
}

// ── the run ──────────────────────────────────────────────────────────────────

const say = (...a) => console.log(...a);
const rule = (t) => say(`\n${"─".repeat(74)}\n${t}\n${"─".repeat(74)}`);

async function runSpecimen(spec, { withModel }) {
  rule(`${spec.question}`);
  const grid = makeGrid({ operators, taskLog });
  let log = grid.createLog();
  const declaration = declareVoid(spec.fields, { cellOf: operators.cellOf });

  const opened = openLoop(declaration, { grid, log, broken: "rotation" });
  if (!opened.ok) { say(`  REFUSED TO OPEN — ${opened.refusal.type}: ${opened.refusal.detail}`); return { question: spec.question, opened: false, refusal: opened.refusal }; }
  let loop = opened.loop;
  log = opened.log;
  say(`  void declared: ${declaration.slot} · extent ${spec.fields.extent.from}-${spec.fields.extent.to}`);
  say(`  opening act: ${opened.line}`);

  const page = await pageText(spec.page);
  const relation = spec.fields.relation;
  const anchorWords = spec.fields.anchor.split(/\s+/);
  const record = { question: spec.question, rungs: [], reshapes: [], closed: null, acts: 0 };

  const GENERATORS = {
    // What the material itself states, where it states the relation.
    extraction: () => namesIn(sentencesAbout(page.text, relation).join(" "), { exclude: anchorWords })
      .slice(0, 8).map((n) => ({ value: n.name, witness: `en.wikipedia.org/${slug(spec.page)}` })),
    // What binds to the anchor AROUND where it states the relation — the
    // sentence before and after each relation sentence. A wider reach
    // into the same source without leaving it, which is what
    // "cultivation" means one tier out from "what it literally says".
    //
    // The first cut of this generator ranked names by frequency over the
    // WHOLE page and was measured to be useless: on FDR it returned
    // «New Deal», «New York», «World War», «Pearl Harbor» — the page's
    // most-repeated capitalised runs are places and concepts, and every
    // one was correctly refused by the admission tier while the actual
    // vice presidents were never offered at all. Proximity to the
    // relation is a real binding measure; raw frequency is not one.
    cultivation: () => namesIn(windowAround(page.text, relation, 1), { exclude: anchorWords })
      .slice(0, 12).map((n) => ({ value: n.name, witness: `en.wikipedia.org/${slug(spec.page)}` })),
    // A filler nothing named — supplied, not read.
    encounter: async (seen) => {
      if (!withModel) return { skipped: "no model reachable at " + OLLAMA };
      const r = await modelCandidates(spec.question, seen);
      if (r.error) return { skipped: `model error: ${r.error}` };
      return r.names.map((n) => ({ value: n, witness: "self:model" }));
    },
  };

  const reads = new Map();
  const admission = (c) => reads.get(c.value) ?? { verdict: null, because: "not read" };

  for (let guard = 0; guard < 10; guard += 1) {
    // A reshape re-opens candidates the CONCEDED extent had refused, and
    // the loop will not let a posture be declared spent while its own
    // candidates are untested. So outstanding wishes are re-evaluated
    // against the new ground first — no re-fetch, the same real read.
    const outstanding = loop.candidates.filter((c) => c.standing === "wish");
    if (outstanding.length) {
      say(`\n  RE-ADMIT against the new ground — ${outstanding.map((c) => c.value).join(", ")}`);
      const re = admit(loop, { grid, log, admission });
      if (!re.ok) { say(`  re-admission refused: ${re.refusal.type}`); break; }
      ({ log, loop } = re);
      for (const c of loop.candidates.filter((c) => outstanding.some((o) => o.value === c.value))) {
        const mark = c.standing === "testimony" ? "✓" : c.standing === "refused" ? "✗" : "?";
        say(`    ${mark} ${c.value}${c.span ? ` [${c.span.from}-${c.span.to}]` : ""} — ${String(c.because ?? "").slice(0, 110)}`);
      }
      const f = foldLoop(loop);
      say(`  fold: ${f.standing} · ${f.coverage.reason}`);
      if (f.standing === "covered") break;
      if (f.standing === "posture_spent") {
        const d = descend(loop, { grid, log, trigger: `${currentRung(loop)?.stance} left ${f.coverage.voids.map((v) => `${v.from}-${v.to}`).join(", ")} uncovered` });
        if (!d.ok) { say(`  cannot descend: ${d.refusal.type}`); break; }
        say(`  → re-zero (REC ${d.id}): ${d.from} → ${d.to ?? "ladder spent"}`);
        ({ log, loop } = d);
      }
      continue;
    }

    const rung = currentRung(loop);
    if (!rung) break;
    const seen = loop.candidates.map((c) => c.value);
    let offered = await GENERATORS[rung.stance](seen);

    if (offered?.skipped) {
      say(`\n  ${rung.stance.toUpperCase()} — SKIPPED: ${offered.skipped}`);
      record.rungs.push({ stance: rung.stance, skipped: offered.skipped });
      const d = descend(loop, { grid, log, trigger: `${rung.stance} unavailable: ${offered.skipped}` });
      if (!d.ok) break;
      ({ log, loop } = d);
      continue;
    }
    offered = offered.filter((c) => !seen.includes(c.value));
    say(`\n  ${rung.stance.toUpperCase()} — ${offered.length} candidate(s) offered: ${offered.map((c) => c.value).join(", ") || "none"}`);

    if (!offered.length) {
      const d = descend(loop, { grid, log, trigger: `${rung.stance} offered nothing new` });
      if (!d.ok) { say(`  cannot descend: ${d.refusal.type}`); break; }
      say(`  → re-zero (REC ${d.id}): ${rung.stance} → ${d.to ?? "ladder spent"}`);
      record.rungs.push({ stance: rung.stance, offered: 0 });
      ({ log, loop } = d);
      continue;
    }

    const readied = await withSpans(offered, loop.declaration, reads);
    const p = proposeFrom(loop, { grid, log, stance: rung.stance, candidates: readied });
    if (!p.ok) { say(`  proposal refused: ${p.refusal.type} — ${p.refusal.detail}`); break; }
    ({ log, loop } = p);
    for (const r of p.refusals) say(`    · not proposed — ${r.candidate}: ${r.type}`);

    const a = admit(loop, { grid, log, admission });
    if (!a.ok) { say(`  admission refused: ${a.refusal.type}`); break; }
    ({ log, loop } = a);

    for (const c of loop.candidates.filter((c) => c.stance === rung.stance)) {
      const mark = c.standing === "testimony" ? "✓" : c.standing === "refused" ? "✗" : "?";
      const span = c.span ? ` [${c.span.from}-${c.span.to}]` : "";
      say(`    ${mark} ${c.value}${span} — ${String(c.because ?? "").slice(0, 110)}`);
    }

    let fold = foldLoop(loop);
    say(`  fold: ${fold.standing} · ${fold.coverage.reason}`);
    record.rungs.push({
      stance: rung.stance,
      offered: offered.length,
      testimony: fold.testimony.map((c) => c.value),
      refused: fold.refused.length,
      standing: fold.standing,
    });

    // ── REC over the DECLARATION: the findings reshape the space ─────────
    const triggers = reshapeTriggers(loop);
    if (triggers.length) {
      for (const t of triggers) {
        say(`\n  ⟳ FINDING RESHAPES THE VOID — ${t.type} (revise cell: ${t.field})`);
        say(`    ${t.detail}`);
        if (t.field !== "extent") continue;
        const revised = declareVoid({ ...spec.fields, extent: t.suggested }, { cellOf: operators.cellOf });
        const r = reshape(loop, { grid, log, trigger: t.detail, revised });
        if (!r.ok) { say(`    reshape refused: ${r.refusal.type}`); continue; }
        say(`    → REC ${r.id} supersedes the opening act · extent ${t.suggested.from}-${t.suggested.to}` +
            (r.reopened.length ? ` · re-opened: ${r.reopened.join(", ")}` : ""));
        record.reshapes.push({ type: t.type, field: t.field, to: t.suggested, reopened: [...r.reopened] });
        ({ log, loop } = r);
      }
      fold = foldLoop(loop);
      say(`  fold after reshape: ${fold.standing} · ${fold.coverage.reason}`);
    }

    if (fold.standing === "covered") break;
    if (fold.standing === "posture_spent") {
      const d = descend(loop, { grid, log, trigger: `${rung.stance} left ${fold.coverage.voids.map((v) => `${v.from}-${v.to}`).join(", ")} uncovered` });
      if (!d.ok) { say(`  cannot descend: ${d.refusal.type}`); break; }
      say(`  → re-zero (REC ${d.id}): ${rung.stance} → ${d.to ?? "ladder spent"}`);
      ({ log, loop } = d);
    }
  }

  // ── the commit ───────────────────────────────────────────────────────
  const fold = foldLoop(loop);
  say(`\n  ANSWER: ${fold.line}`);
  const wrongStance = fold.testimony[0]?.stance;
  if (wrongStance) {
    const bad = closeLoop(loop, { grid, log, stance: wrongStance });
    say(`  closing from «${wrongStance}» (the posture that proposed): ${bad.ok ? "ALLOWED — THE LAW FAILED" : `refused — ${bad.refusal.type}`}`);
  }
  const closed = closeLoop(loop, { grid, log, stance: "closure" });
  if (closed.ok) {
    ({ log, loop } = closed);
    say(`  committed from «closure» by ${loop.closed.by}: ${loop.closed.fillers.join(" + ")}${loop.closed.composed ? " (CON then SYN)" : " (single filler, nothing composed)"}`);
    record.closed = { by: loop.closed.by, fillers: [...loop.closed.fillers], stance: "closure" };
  } else {
    say(`  NOT COMMITTED — ${closed.refusal.type}: ${String(closed.refusal.detail).slice(0, 200)}`);
    record.closed = { refused: closed.refusal.type };
  }

  const ops = log.entries.filter((e) => e.operator).map((e) => e.operator);
  record.acts = ops.length;
  say(`\n  the record: ${ops.length} entries · ${[...new Set(ops)].join(" ")} · ${loop.descents.length} re-zero(s) · ${(loop.reshapes ?? []).length} reshape(s)`);
  return record;
}

const withModel = await modelReachable();
say(`void-loop e2e · model at ${OLLAMA}: ${withModel ? `REACHABLE (${MODEL})` : "UNREACHABLE — the encounter rung will be a typed skip, never a stand-in"}`);
const results = [];
for (const spec of SPECIMENS) results.push(await runSpecimen(spec, { withModel }));

rule("summary");
for (const r of results) {
  say(`  ${r.question}`);
  say(`    rungs: ${r.rungs.map((x) => `${x.stance}${x.skipped ? "(skipped)" : `→${x.testimony?.length ?? 0}`}`).join(" ")}`);
  say(`    reshapes: ${r.reshapes.length ? r.reshapes.map((x) => `${x.type}→${x.to.from}-${x.to.to}`).join(", ") : "none"}`);
  say(`    ${r.closed?.by ? `committed by ${r.closed.by}: ${r.closed.fillers.join(" + ")}` : `not committed: ${r.closed?.refused}`}`);
}
writeFileSync(join(CACHE, "..", "void-loop-e2e-results.json"), JSON.stringify({ model: withModel ? MODEL : null, results }, null, 2));
say(`\nresults → /tmp/void-loop-e2e-results.json`);
