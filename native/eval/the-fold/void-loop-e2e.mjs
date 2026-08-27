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
import { stageFromReadings, admissionOf } from "../void-hl.js";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OLLAMA = "http://localhost:11434";
const LOCAL_MODEL = process.argv[2] ?? "onnx-community/Qwen2.5-0.5B-Instruct";
let MODEL = LOCAL_MODEL;

// ── the model: local, on CPU ────────────────────────────────────────────────
//
// `@huggingface/transformers` runs ONNX weights in this process — no
// server, no GPU, no egress past the one-time weight fetch. Measured here:
// ~27s to load Qwen2.5-0.5B-Instruct at q4, ~6s per read on CPU. An Ollama
// server is used instead if one is already up, since a machine that has
// one has a better model on it.
let _gen = null;
async function openModel() {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) { MODEL = process.argv[2] ?? "gemma2:2b"; return { kind: "ollama", name: MODEL }; }
  } catch { /* no server, use the in-process one */ }
  try {
    process.env.HF_HOME ??= "/tmp/hfcache";
    const { pipeline } = await import("@huggingface/transformers");
    _gen = await pipeline("text-generation", LOCAL_MODEL, { dtype: "q4", device: "cpu" });
    return { kind: "local-cpu", name: LOCAL_MODEL };
  } catch (e) { return { kind: "none", detail: String(e?.message ?? e).slice(0, 120) }; }
}

async function askModel(prompt) {
  if (_gen) {
    const out = await _gen([{ role: "user", content: prompt }], { max_new_tokens: 96, do_sample: false });
    return out[0].generated_text.at(-1)?.content ?? "";
  }
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false, format: "json",
      options: { temperature: 0, num_predict: 96 }, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).message?.content ?? "";
}
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
      // CON declares the relation PROPERLY: an id HL reasons over, the
      // surfaces only a rule-based reader ever needs, and the fact that it
      // is functional — with a giver, because HL refuses a declaration
      // without one and that refusal is the feature.
      //
      // `vicePresidentOf` is functional in the VP -> president direction
      // (a vice president serves under one president) and NOT in the other
      // (Lincoln had two). The direction that is functional is the one
      // that excludes a real vice president of somebody else.
      relation: {
        id: "vicePresidentOf",
        surfaces: ["vice president", "running mate"],
        functional: { giver: "the office's own structure: a vice president serves under exactly one president at a time" },
      },
      composition: "successive terms partition the extent",
      cardinality: "unknown",
      admission: "the candidate's own source states the relation, bound to this anchor, and its span lies within the extent",
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
      relation: {
        id: "vicePresidentOf",
        surfaces: ["vice president", "running mate"],
        functional: { giver: "the office's own structure: a vice president serves under exactly one president at a time" },
      },
      composition: "successive terms partition the extent",
      cardinality: "unknown",
      admission: "the candidate's own source states the relation, bound to this anchor, and its span lies within the extent",
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
  return { title: j.title ?? title, extract: j.extract ?? "", description: j.description ?? "", type: j.type ?? null };
});

// ── the crude generator (see the header: its junk is the point) ──────────────

// A capitalised run of two or more words. Everything this misses and
// everything junk it admits is disclosed rather than filtered by a
// hand-typed stop list — the admission tier is what is being tested.
const NAME_RE = /\b([A-Z][a-z]{2,}(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]{2,})+)\b/g;

const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** CON's cell, as the set of surfaces that state it. String or list. */
const surfacesOf = (relation) =>
  Array.isArray(relation) ? relation : relation?.surfaces ?? [relation];
const relationRe = (relation) => new RegExp(surfacesOf(relation).map(esc).join("|"), "i");

const sentencesAbout = (text, relation) =>
  String(text).split(/(?<=[.!?])\s+/).filter((s) => relationRe(relation).test(s));

/** Every sentence within `radius` of one that states the relation. */
function windowAround(text, relation, radius) {
  const S = String(text).split(/(?<=[.!?])\s+/);
  const re = relationRe(relation);
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

// ── TWO READERS, ONE INTERFACE — and neither returns a verdict ──────────────
//
// A reader turns a source into a READING: did this source state the
// relation, whom did it bind the candidate to, over what span, and where
// did that come from. HL judges; a reader never does.
//
// The MODEL reader is the real one. Reading is the half that cannot be
// enumerated, and this driver grew four rules proving it in one afternoon
// — a relation stated as "running mate", a span belonging to a different
// office two clauses over, a kind that is a faction, and a sentence
// boundary falling inside "Franklin D.". Each was right for the case that
// prompted it. The model call is one grammar-held question per candidate
// and its answer is data, checked downstream like anything else.

// The prompt is not a first draft. Measured on the four real specimens,
// one change at a time, each fixing an error class the previous shape
// produced (full table in the results doc):
//
//   schema with <angle-bracket> placeholders -> echoed the placeholder and
//     answered `false` on a text that plainly stated the relation. 0/4.
//   worked examples with concrete values     -> 2/4.
//   + "under must be a DIFFERENT person" and a both-offices example
//     -> 3/4 anchors, including the one R2 needs.
//   + INS asked as INDIVIDUATION rather than kind -> 4/4. "Is a War
//     Democrat a person?" is honestly YES — a faction is made of people —
//     and the slot does not admit a KIND of person, it admits ONE NAMED
//     INDIVIDUAL. The engine's own individuation vocabulary, asked as a
//     question.
const READER_PROMPT = (name, relation, text) =>
`You are reading one text and answering about one candidate.
"under" must be a DIFFERENT person from the one asked about — nobody serves under themselves.
Someone can hold two offices at different times; answer only about the ${surfacesOf(relation)[0]}.

Example.
TEXT: Aaron Burr was an American politician who served as the third vice president under President Thomas Jefferson from 1801 to 1805.
QUESTION: Is Aaron Burr one specific named individual, rather than a group, party, faction, category or event? Did the text say Aaron Burr was a vice president, and under which president?
ANSWER: {"is_one_named_individual": true, "role": true, "under": "Thomas Jefferson", "from": 1801, "to": 1805}

Example.
TEXT: The Whig Party was an American political party active in the 1830s and 1840s.
QUESTION: Is The Whig Party one specific named individual, rather than a group, party, faction, category or event? Did the text say The Whig Party was a vice president, and under which president?
ANSWER: {"is_one_named_individual": false, "role": false, "under": null, "from": null, "to": null}

Example.
TEXT: Millard Fillmore was the 13th president of the United States, serving from 1850 to 1853. He was the 12th vice president, serving under Zachary Taylor from 1849 until Taylor's death.
QUESTION: Is Millard Fillmore one specific named individual, rather than a group, party, faction, category or event? Did the text say Millard Fillmore was a vice president, and under which president?
ANSWER: {"is_one_named_individual": true, "role": true, "under": "Zachary Taylor", "from": 1849, "to": 1850}

Now answer the same way. Reply with the JSON object only.
TEXT: ${text}
QUESTION: Is ${name} one specific named individual, rather than a group, party, faction, category or event? Did the text say ${name} was a ${surfacesOf(relation)[0]}, and under which president?
ANSWER:`;

async function modelReading(candidate, { relation, page }) {
  const raw = await askModel(READER_PROMPT(candidate.value, relation, String(page).slice(0, 900)));
  const m = String(raw).match(/\{[\s\S]*?\}/);
  if (!m) return { error: `no JSON in ${String(raw).slice(0, 60)}` };
  let j; try { j = JSON.parse(m[0]); } catch (e) { return { error: String(e?.message ?? e) }; }

  // INS, as a declared cell rather than a guess about kinds.
  if (j.is_one_named_individual !== true) {
    return { candidate: candidate.value, statesRelation: false, anchor: null, span: null,
             source: `model:${MODEL}`, note: "not one named individual — the slot admits an individual, not a category" };
  }
  // P31'S COMPANY LAW, USED AS A CHECK ON THE MODEL RATHER THAN AS THE
  // READER. The model's span is accepted only where the source states it
  // in the same breath as the relation. Measured, and it is the whole
  // reason the good result is reachable: Andrew Johnson's page carries
  // "1865 to 1869" — his PRESIDENCY — and his vice-presidency sentence
  // carries no span at all, so the claimed span is DROPPED and he lands
  // admitted-but-unplaced, which is exactly what the material supports.
  // `Number(null)` is 0 and `Number.isFinite(0)` is true, so a null year
  // became year zero — measured live as `span 0-0` and `span 1860-0`, a
  // span that would have been filled into the space and corrupted the
  // coverage arithmetic outright. It survived only because the company
  // check below happened to drop it.
  const num = (v) => (v == null || v === "" ? NaN : Number(v));
  const claimed = Number.isFinite(num(j.from)) && Number.isFinite(num(j.to))
    ? { from: num(j.from), to: num(j.to) } : null;

  const stating = sentencesAbout(page, relation).join(" ");
  const company = yearSpansIn(stating).map((x) => `${x.from}-${x.to}`);
  const corroborated = claimed && company.includes(`${claimed.from}-${claimed.to}`);

  // THE RELATION IS CHECKED THE SAME WAY THE SPAN IS. Measured: the model
  // said Herbert Hoover was Roosevelt's vice president against a page that
  // never states the relation at all. A model's claim is never ground —
  // the source has to carry it. `surfaces` earns its place here, as the
  // check on a model rather than as a reader.
  const sourceStatesIt = stating.length > 0;

  return {
    candidate: candidate.value,
    statesRelation: j.role === true && sourceStatesIt,
    anchor: typeof j.under === "string" && j.under.trim() ? j.under.trim() : null,
    span: corroborated ? claimed : null,
    source: `model:${MODEL}`,
    note: j.role === true && !sourceStatesIt
      ? "the model claimed the relation; the source never states it"
      : claimed && !corroborated ? `span ${claimed.from}-${claimed.to} dropped — not stated with the relation` : null,
  };
}

// THE FALLBACK, and the last enumerated rule this driver will ever add.
// It exists so the harness runs with no model, and every place it is wrong
// is the argument for the reader above. Its one binding rule: a name run
// after "under" / "during" / "of", because those are the words this
// relation binds through. It scans the JOINED relation text rather than
// split sentences, which is what survives "Franklin D." — an abbreviation
// gate by another name, and exactly the kind of thing nobody can finish
// writing.
const BINDS_TO = /\b(?:under|during|of)\s+(?:President\s+)?([A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*)*)/;

function structuralReading(candidate, { relation, page }) {
  const re = relationRe(relation);
  const stating = String(page).split(/(?<=[.!?])\s+/).filter((x) => re.test(x)).join(" ");
  if (!stating) {
    return { candidate: candidate.value, statesRelation: false, anchor: null, span: null, source: "structural-reader" };
  }
  const bound = BINDS_TO.exec(stating);
  return {
    candidate: candidate.value,
    statesRelation: true,
    anchor: bound ? bound[1].trim() : null,
    span: yearSpansIn(stating)[0] ?? null,
    source: "structural-reader",
  };
}

// ── the model, at the encounter rung only ────────────────────────────────────

async function modelCandidates(question, already) {
  const prompt =
    `${question}\nName only people not already listed. Already listed: ${already.join(", ") || "none"}.\n` +
    `Reply with the JSON object only, like {"names": ["Full Name"]}. If you know of none: {"names": []}.`;
  try {
    const raw = await askModel(prompt);
    const m = String(raw).match(/\{[\s\S]*?\}/);
    const parsed = m ? JSON.parse(m[0]) : {};
    return { names: (parsed.names ?? []).filter((n) => typeof n === "string" && n.trim()).slice(0, 6) };
  } catch (e) { return { error: String(e?.message ?? e) }; }
}

/** One reading per candidate, from whichever reader is available. A reader
 * never returns a verdict — HL does. */
async function readCandidates(candidates, { relation, withModel, readings }) {
  const out = [];
  for (const c of candidates) {
    const s = await pageSummary(c.value);
    const page = `${s.description ?? ""}. ${s.extract ?? ""}`.trim();
    let reading;
    if (!s.extract) {
      reading = { candidate: c.value, statesRelation: false, anchor: null, span: null, source: "no-page", note: "no page" };
    } else if (withModel) {
      const m = await modelReading(c, { relation, page });
      reading = m.error
        ? { ...structuralReading(c, { relation, page }), note: `model failed (${m.error}) — structural reader` }
        : m;
    } else {
      reading = structuralReading(c, { relation, page });
    }
    reading.refs = [s.title ?? c.value];
    readings.set(c.value, reading);
    out.push({ ...c, span: reading.span ?? null });
  }
  return out;
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
  const relSurfaces = surfacesOf(relation);
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
      if (!withModel) return { skipped: "no model reachable" };
      const r = await modelCandidates(spec.question, seen);
      if (r.error) return { skipped: `model error: ${r.error}` };
      return r.names.map((n) => ({ value: n, witness: "self:model" }));
    },
  };

  const readings = new Map();
  const declarations = relation.functional
    ? [{ kind: "functional", rel: relation.id, giver: relation.functional.giver }] : [];

  // ADMISSION IS HL'S, NOT A RULE'S. The stage is rebuilt from every
  // reading gathered so far and asked once per candidate; a reader's
  // output is evidence, never a verdict.
  const admission = (c) => {
    const built = stageFromReadings({
      anchor: spec.fields.anchor, relation: relation.id,
      readings: [...readings.values()], declarations,
    });
    if (!built.ok) return { verdict: null, because: `stage refused: ${built.refusal.detail}` };
    const a = admissionOf(built.stage, {
      relation: relation.id, candidate: c.value, anchor: spec.fields.anchor, display: built.display,
    });
    const note = readings.get(c.value)?.note;
    return {
      verdict: a.verdict,
      because: `${a.hl}${note ? ` · ${note}` : ""} — ${a.because}`,
      refs: readings.get(c.value)?.refs ?? [],
    };
  };

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
      if (f.standing === "covered" || f.standing === "unplaced") break;
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

    const readied = await readCandidates(offered, { relation, withModel, readings });
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
        // `covered_but_unplaced` names the cell and deliberately carries no
        // suggestion — there is nothing to reshape TO, only something to
        // report. A finding is not always a revision.
        if (t.field !== "extent" || !t.suggested) continue;
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

    if (fold.standing === "covered" || fold.standing === "unplaced") break;
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

const backend = await openModel();
const withModel = backend.kind !== "none";
say(`void-loop e2e · reader: ${withModel ? `${backend.kind} (${backend.name})` : `NONE (${backend.detail}) — structural fallback only, and every place it is wrong is the argument for the model`}`);
const results = [];
for (const spec of SPECIMENS) results.push(await runSpecimen(spec, { withModel }));

rule("summary");
for (const r of results) {
  say(`  ${r.question}`);
  say(`    rungs: ${r.rungs.map((x) => `${x.stance}${x.skipped ? "(skipped)" : `→${x.testimony?.length ?? 0}`}`).join(" ")}`);
  say(`    reshapes: ${r.reshapes.length ? r.reshapes.map((x) => `${x.type}→${x.to.from}-${x.to.to}`).join(", ") : "none"}`);
  say(`    ${r.closed?.by ? `committed by ${r.closed.by}: ${r.closed.fillers.join(" + ")}` : `not committed: ${r.closed?.refused}`}`);
}
writeFileSync(join(CACHE, "..", "void-loop-e2e-results.json"), JSON.stringify({ reader: backend, results }, null, 2));
say(`\nresults → /tmp/void-loop-e2e-results.json`);
