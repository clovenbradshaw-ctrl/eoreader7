#!/usr/bin/env node
// eval/witness-batch-eval.mjs — 25 real, well-known, single-answer factoid
// claims, run through the ACTUAL witness tier (testimony.js) against REAL
// fetched web material via this instrument's own explore-server (P13's one
// egress) and a real local model. No fixtures, no mocked pages: the point
// of this eval is exactly what the 1960 World Series incident exposed —
// real prose is messier than a hand-built fixture, and the mechanism has to
// survive that, not a clean toy.
//
// Direct continuation of the same session's redirect (2026-08-19, user
// direction): "have it always steer there [Wikipedia] and then go to
// primary sources" and, on the hypergraph's slot-competition matcher
// repeatedly picking a real-but-wrong-year edge from real Wikipedia prose:
// "yes[, stop chasing that bug], and then test it on 25 similar answerable
// facts [against the witness tier instead]." hypergraph.js's structural
// matcher stays scoped to what it is cheaply good at (a full-sentence
// restatement, free, no model call); this eval validates the tier that
// actually does the fact-hunting — one short passage, one narrow yes/no
// question, twice, verdict derived mechanically from the pair.
//
// THE SHAPE OF EVERY SPECIMEN: a real question with one unambiguous public
// answer, paired with a FALSE sentence naming the single most plausible
// wrong answer (a genuine runner-up, opponent, or contemporary — never an
// absurd strawman) — the exact shape a confused small model actually
// produces, and the exact shape the sibling-swap arm is built to catch.
// `correctPattern` is declared BEFORE any specimen runs, from public record,
// never adjusted after seeing a result.
//
// Run: node eval/witness-batch-eval.mjs [--model=gemma2:2b] [--limit=N]
//      node eval/witness-batch-eval.mjs --self-test   (offline, no network)
//
// MEASURED RESULTS (gemma2:2b, three successive live runs, same 25
// specimens, same day):
//   run 1 (siblingSwap unfixed):                          2/25 correct, 23/25 refused:no-testimony
//   run 2 (+ newline/caption-marker/zero-score filtering): 2/25 correct, 22/25 refused, 1/25 wrong-verdict-shape
//   run 3 (+ because-as-hint, + temperature:0):            5/25 correct, 20/25 refused
// ZERO wrong corrections in any of the three runs — the safety property
// (never assert a contradiction naming the wrong entity) held throughout;
// every fix moved RECALL, never precision. Three real bugs found and fixed
// along the way, each from an actual raw model/page read, not a fixture:
//   (1) namesIn candidates spanning a raw newline (table/infobox cells
//       glued by plain-text extraction) or matching a Wikipedia image
//       caption's own title text (which legitimately repeats the claim's
//       topic words without asserting the claim) outscored the real answer.
//   (2) the witness's own `real.because`, when it answers "no", frequently
//       already NAMES the correct filler — siblingSwap was re-deriving a
//       candidate from scratch instead of trying that name first.
//   (3) no fixed temperature: the identical prompt against the identical
//       page flipped its own yes/no answer between two runs.
//
// DOMINANT REMAINING FAILURE MODE, disclosed rather than chased further
// this pass: `witnessSlice`'s anchor-sentence selection scores purely on
// claim-token overlap, with no signal for whether a "sentence" is real
// prose at all — the 1980-us-election specimen anchored on a flattened
// polling-table row ("Poll source Date(s) administered Ronald Reagan (R)
// Jimmy Carter (D) John Anderson (I) Other Undecided Margin...") because it
// token-matches the claim heavily, while the page's actual prose sentence
// naming the winner sits outside the anchor window entirely. This is a
// different, harder problem than sibling selection — it needs a structural
// prose-vs-table signal in witnessSlice's own anchor scoring, not another
// candidate filter — named here as the next concrete step, not attempted.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { proofQuery, PROOF_PAGES_CONSULTED } from "../proof.js";
import {
  WITNESS_SCHEMA,
  buildWitnessMessages,
  foldTestimony,
  readTestimony,
  siblingSwap,
  witnessSlice,
} from "../../eoreader7/native/organs/index.js";

const EXPLORE = "http://localhost:8812";
const OLLAMA = "http://localhost:11434";

function parseArgs(argv) {
  const out = { model: "gemma2:2b", limit: null, out: "eval/results/witness-batch-eval.json", selfTest: false };
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === "selfTest") { out.selfTest = true; continue; }
    out[key] = m[2] ?? true;
  }
  if (out.limit) out.limit = Number(out.limit);
  return out;
}

// ── the 25 specimens — real facts, declared before any run ────────────────
//
// A `hostHint` (Wikipedia's own slug) rides each specimen: the user's
// direction was "always steer there [Wikipedia] and then go to primary
// sources" — this eval's query building honors that by trying the direct
// Wikipedia URL FIRST (a pointer, not a search guess — the same category
// widget.js's own routeMessage already draws between an explicit address
// and search material), and falling back to an ordinary web search only if
// that fetch fails. "Primary sources" (box scores, official election
// returns, primary registries) are named as follow-on work in this file's
// own summary, not attempted here — this pass validates the witness
// mechanism's correctness against Wikipedia-grade secondary material, the
// same class of page the live incident actually fetched.

const SPECIMENS = [
  { id: "1960-world-series", wiki: "1960_World_Series", falseSentence: "The New York Yankees won the 1960 World Series.", correctPattern: /Pittsburgh Pirates|Pirates/i },
  { id: "1969-world-series", wiki: "1969_World_Series", falseSentence: "The Baltimore Orioles won the 1969 World Series.", correctPattern: /New York Mets|Mets/i },
  { id: "2004-world-series", wiki: "2004_World_Series", falseSentence: "The New York Yankees won the 2004 World Series.", correctPattern: /Boston Red Sox|Red Sox/i },
  { id: "super-bowl-1", wiki: "Super_Bowl_I", falseSentence: "The Kansas City Chiefs won Super Bowl I.", correctPattern: /Green Bay Packers|Packers/i },
  { id: "super-bowl-3", wiki: "Super_Bowl_III", falseSentence: "The Baltimore Colts won Super Bowl III.", correctPattern: /New York Jets|Jets/i },
  { id: "1980-us-election", wiki: "1980_United_States_presidential_election", falseSentence: "Jimmy Carter won the 1980 United States presidential election.", correctPattern: /Ronald Reagan|Reagan/i },
  { id: "2000-us-election", wiki: "2000_United_States_presidential_election", falseSentence: "Al Gore won the 2000 United States presidential election.", correctPattern: /George W\.? Bush|Bush/i },
  { id: "2004-us-election", wiki: "2004_United_States_presidential_election", falseSentence: "John Kerry won the 2004 United States presidential election.", correctPattern: /George W\.? Bush|Bush/i },
  { id: "2016-us-election", wiki: "2016_United_States_presidential_election", falseSentence: "Hillary Clinton won the 2016 United States presidential election.", correctPattern: /Donald Trump|Trump/i },
  { id: "1966-world-cup", wiki: "1966_FIFA_World_Cup", falseSentence: "West Germany won the 1966 FIFA World Cup.", correctPattern: /\bEngland\b/i },
  { id: "1998-world-cup", wiki: "1998_FIFA_World_Cup", falseSentence: "Brazil won the 1998 FIFA World Cup.", correctPattern: /France/i },
  { id: "2014-world-cup", wiki: "2014_FIFA_World_Cup", falseSentence: "Argentina won the 2014 FIFA World Cup.", correctPattern: /Germany/i },
  { id: "1986-world-cup", wiki: "1986_FIFA_World_Cup", falseSentence: "West Germany won the 1986 FIFA World Cup.", correctPattern: /Argentina/i },
  { id: "romeo-and-juliet", wiki: "Romeo_and_Juliet", falseSentence: "Christopher Marlowe wrote Romeo and Juliet.", correctPattern: /Shakespeare/i },
  { id: "pride-and-prejudice", wiki: "Pride_and_Prejudice", falseSentence: "Charlotte Brontë wrote Pride and Prejudice.", correctPattern: /Jane Austen|Austen/i },
  { id: "penicillin", wiki: "Penicillin", falseSentence: "Louis Pasteur discovered penicillin.", correctPattern: /Alexander Fleming|Fleming/i },
  { id: "mona-lisa", wiki: "Mona_Lisa", falseSentence: "Michelangelo painted the Mona Lisa.", correctPattern: /Leonardo da Vinci|da Vinci/i },
  { id: "moon-landing", wiki: "Apollo_11", falseSentence: "Buzz Aldrin was the first person to walk on the Moon.", correctPattern: /Neil Armstrong|Armstrong/i },
  { id: "microsoft-founder", wiki: "Microsoft", falseSentence: "Steve Jobs founded Microsoft.", correctPattern: /Bill Gates|Gates/i },
  { id: "apple-founder", wiki: "Apple_Inc\\.", falseSentence: "Bill Gates founded Apple.", correctPattern: /Steve Jobs|Jobs|Wozniak/i },
  { id: "nobel-peace-2009", wiki: "2009_Nobel_Peace_Prize", falseSentence: "Al Gore won the Nobel Peace Prize in 2009.", correctPattern: /Barack Obama|Obama/i },
  { id: "declaration-author", wiki: "United_States_Declaration_of_Independence", falseSentence: "Benjamin Franklin wrote the Declaration of Independence.", correctPattern: /Thomas Jefferson|Jefferson/i },
  { id: "first-president", wiki: "George_Washington", falseSentence: "John Adams was the first President of the United States.", correctPattern: /George Washington|Washington/i },
  { id: "beethoven-ninth", wiki: "Symphony_No\\._9_\\(Beethoven\\)", falseSentence: "Wolfgang Amadeus Mozart composed the Ninth Symphony premiered in 1824.", correctPattern: /Beethoven/i },
  { id: "lincoln-vp", wiki: "Abraham_Lincoln", falseSentence: "John C. Breckinridge served as Abraham Lincoln's vice president.", correctPattern: /Hannibal Hamlin|Hamlin/i },
];

// ── the crossing (P13): search-or-pointer, fetch, read the saved text face ─

async function fetchWikipedia(slug) {
  const url = `https://en.wikipedia.org/wiki/${slug}`;
  const f = await (await fetch(`${EXPLORE}/api/web/fetch`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }),
  })).json();
  if (f.gap || !f.entry?.textPath) return null;
  const basename = String(f.entry.textPath).split("/").pop();
  const res = await fetch(`${EXPLORE}/web/pages/${basename}`);
  if (!res.ok) return null;
  const text = await res.text();
  return text.trim() ? { url: f.entry.finalUrl ?? url, host: "en.wikipedia.org", text } : null;
}

async function fetchSearchFallback(query, exclude) {
  const search = await (await fetch(`${EXPLORE}/api/web/search`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }),
  })).json();
  if (search.gap) return [];
  const picks = (search.results ?? []).filter((r) => r.url !== exclude).slice(0, PROOF_PAGES_CONSULTED);
  const pages = [];
  for (const r of picks) {
    try {
      const f = await (await fetch(`${EXPLORE}/api/web/fetch`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: r.url }),
      })).json();
      if (f.gap || !f.entry?.textPath) continue;
      const basename = String(f.entry.textPath).split("/").pop();
      const res = await fetch(`${EXPLORE}/web/pages/${basename}`);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trim()) pages.push({ url: f.entry.finalUrl ?? r.url, host: new URL(r.url).host, text });
    } catch { /* one page failing is not the search failing */ }
  }
  return pages;
}

async function askWitness(model, sentence, slice) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      // temperature: 0 — this is a classification call, not a generative
      // one, and measured live (2026-08-19) the identical prompt flipped
      // its own yes/no answer between two runs under default sampling.
      model, stream: false, format: WITNESS_SCHEMA, options: { num_predict: 200, temperature: 0 },
      messages: buildWitnessMessages(sentence, slice),
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const body = await res.json();
  return readTestimony(body?.message?.content ?? "");
}

async function runSpecimen(spec, model) {
  const target = { kind: "name", text: spec.falseSentence, sentence: spec.falseSentence };
  // Wikipedia first (the user's own direction), an ordinary search only as
  // fallback — never the reverse.
  let pages = [];
  try {
    const direct = await fetchWikipedia(spec.wiki);
    if (direct) pages.push(direct);
  } catch { /* fall through to search */ }
  if (!pages.length) {
    try {
      pages = await fetchSearchFallback(proofQuery({ text: "", sentence: spec.falseSentence }), null);
    } catch { /* recorded below as no-page */ }
  }
  if (!pages.length) return { id: spec.id, outcome: "no-page" };

  let page = null, slice = null;
  for (const p of pages) {
    const s = witnessSlice(target, p.text);
    if (s) { page = p; slice = s; break; }
  }
  if (!slice) return { id: spec.id, outcome: "no-anchor", pagesFetched: pages.map((p) => p.host) };

  const real = await askWitness(model, spec.falseSentence, slice);
  const swap = real ? siblingSwap(spec.falseSentence, slice, { hint: real.because }) : null;
  const arm = swap ? await askWitness(model, swap.swapped, slice) : null;
  const testimony = foldTestimony({
    real, arm, armed: Boolean(swap), host: page.host, url: page.url, slice,
    claim: spec.falseSentence, swapped: swap?.swapped ?? "",
  });

  if (testimony.refused) return { id: spec.id, outcome: `refused:${testimony.refused}`, host: page.host, swap: swap ? { from: swap.from, to: swap.to } : null };
  const correct = testimony.verdict === "contradicts" && spec.correctPattern.test(testimony.because ?? "");
  return {
    id: spec.id,
    outcome: correct ? "correct" : testimony.verdict === "contradicts" ? "contradicted-wrong-name" : "verdict-states",
    verdict: testimony.verdict,
    because: testimony.because,
    host: page.host,
    armed: testimony.armed,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  const specimens = args.limit ? SPECIMENS.slice(0, args.limit) : SPECIMENS;
  console.log(`witness-batch-eval: ${specimens.length} specimen(s), model=${args.model}\n`);

  const results = [];
  for (const [i, spec] of specimens.entries()) {
    const t0 = Date.now();
    let r;
    try {
      r = await runSpecimen(spec, args.model);
    } catch (e) {
      r = { id: spec.id, outcome: "error", detail: e.message };
    }
    r.ms = Date.now() - t0;
    results.push(r);
    console.log(`[${i + 1}/${specimens.length}] ${spec.id}: ${r.outcome}${r.because ? ` — "${r.because.slice(0, 80)}"` : ""} (${r.ms}ms)`);
    await writeFile(args.out, JSON.stringify({ args, results }, null, 2));
  }

  const byOutcome = {};
  for (const r of results) byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;
  console.log("\n── summary ──");
  for (const [k, v] of Object.entries(byOutcome)) console.log(`  ${k}: ${v}/${results.length}`);
  console.log(`\nfull results written to ${args.out}`);
}

// ── self-test: the mechanical wiring, offline ──────────────────────────
async function selfTest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`self-test failed: ${msg}`); };
  assert(SPECIMENS.length === 25, `expected 25 specimens, got ${SPECIMENS.length}`);
  assert(new Set(SPECIMENS.map((s) => s.id)).size === 25, "specimen ids must be unique");
  for (const s of SPECIMENS) {
    assert(s.wiki && s.falseSentence && s.correctPattern instanceof RegExp, `specimen ${s.id} is missing a required field`);
    assert(!s.correctPattern.test(s.falseSentence), `${s.id}: the false sentence must not already satisfy its own correctPattern`);
  }
  const page = "The Pittsburgh Pirates won the 1960 World Series, defeating the New York Yankees in seven games.";
  const target = { text: SPECIMENS[0].falseSentence, sentence: SPECIMENS[0].falseSentence };
  const slice = witnessSlice(target, page);
  assert(slice, "witnessSlice must anchor on the canned page");
  const swap = siblingSwap(SPECIMENS[0].falseSentence, slice);
  assert(swap && /Pirates/.test(swap.to), "siblingSwap must draw the Pirates as the sibling from this page");
  console.log("self-test: all checks passed (no network required).");
  console.log(`  ${SPECIMENS.length} specimens declared, each with a unique id and a correctPattern that does not already match its own false sentence`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main().catch((err) => { console.error(err); process.exit(1); });

export { SPECIMENS, runSpecimen };
