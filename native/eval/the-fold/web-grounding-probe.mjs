// eval/the-fold/web-grounding-probe.mjs — does the REAL pipeline ground an
// open-world answer in fetched web content, or confabulate it?
//
// Asks facts the attached corpus does NOT contain, with web consent on
// (`web: true`), through the same POST /v1/ask door the e2e uses. Then checks,
// MECHANICALLY (no model judges a model):
//   1. grounded  — the answer states the true atom (exact token/substring),
//      verified against the expected value below.
//   2. searched  — the disclosed thinking names a web research move
//      ("Researched the web", "web_search", "gore", "gather", a URL).
//   3. cited     — the answer carries a citation/address to a real source
//      (a `#byte-byte` address, a URL, a `web-search:` ref, or the thinking
//      names the pages admitted).
//   4. honesty  — when the fact is genuinely not found, the answer SAYS it is
//      not in the material (a typed gap), never a confident guess.
//
//   node eval/the-fold/web-grounding-probe.mjs [--model gemma2:2b]
//   env: ER7 (proxy), FACTS=n (limit to first n facts)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ER7 = (process.env.ER7 ?? "http://127.0.0.1:11436").replace(/\/+$/, "");
const MODEL = (process.env.ER7_MODEL ?? process.env.MODEL ?? "gemma2:2b").replace(/^er7:/, "");

// Open-world facts: none of these are anywhere in the attached corpus
// (gold/titanic/saturn/wright/reef). The expected atoms are the mechanical
// ground — exact-token/substring checks, never a model.
const FACTS = [
  { id: "F1", q: "What is the capital of Australia?", expect: "Canberra" },
  { id: "F2", q: "Who is the current Prime Minister of Canada?", expect: "Trudeau" },
  { id: "F3", q: "What is the highest mountain in the Solar System?", expect: "Olympus Mons" },
  { id: "F4", q: "Which country hosted the 2016 Summer Olympics?", expect: "Brazil" },
  { id: "F5", q: "What is the official language of Suriname?", expect: "Dutch" },
  { id: "F6", q: "Who discovered penicillin?", expect: "Fleming" },
  { id: "F7", q: "What is the currency of Japan?", expect: "yen" },
  { id: "F8", q: "In what year did the Soviet Union dissolve?", expect: "1991" },
  { id: "F9", q: "What is the tallest animal on Earth?", expect: "giraffe" },
  { id: "F10", q: "Which ocean separates Africa from Australia?", expect: "Indian" },
];

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const hit = (text, atom) => norm(text).includes(norm(atom));

const SEARCH_MARKS = /(researched the web|web[_ ]?search|web_search|gore|gather|duckduckgo|wikipedia\.org|admitted .* page|fetched)/i;
const CITATION_MARK = /#\d+[-–]\d+|https?:\/\/|web-search:|\b(?:refs?|citations?|sources?):/i;
const ABSENT_MARK = /\b(not in (the|my|these|your) (material|sources|documents|text)|not (found|present|mentioned) (in|within)|no passage|the (material|sources|documents) do(es)? not|isn'?t (in|in the|mentioned)|nothing (here|in|about)|cannot find|can'?t find)\b/i;

async function ask(task) {
  const res = await fetch(`${ER7}/v1/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-er7-session": `webprobe-${Date.now()}-${task.id}` },
    body: JSON.stringify({ task: task.q, model: MODEL, webConsent: true, discloseThinking: true, mode: "chat" }),
    signal: AbortSignal.timeout(600000),
  });
  if (!res.ok) throw new Error(`/v1/ask ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function main() {
  const n = Number(process.env.FACTS ?? FACTS.length);
  const rows = [];
  for (const f of FACTS.slice(0, n)) {
    let r;
    try { r = await ask(f); } catch (e) { rows.push({ ...f, status: "error", error: e.message }); continue; }
    const answer = String(r.answer ?? "");
    const thinking = String(r.thinking ?? "");
    const searchText = [thinking, JSON.stringify(r.document ?? ""), JSON.stringify(r.race ?? "")].join("\n");
    const grounded = hit(answer, f.expect);
    const searched = SEARCH_MARKS.test(searchText);
    const cited = CITATION_MARK.test(searchText) || CITATION_MARK.test(answer);
    // Honest when grounded yet the pipeline shows NO web/search admission:
    const honestAbsent = !grounded && ABSENT_MARK.test(answer);
    const row = {
      id: f.id, q: f.q, expect: f.expect, status: "ok",
      answer: answer.slice(0, 400),
      grounded, searched, cited, honestAbsent,
      answerShape: r.answerShape ?? null,
      usage: r.usage ?? null,
      thinking: thinking.slice(0, 600),
      document: r.document ?? null,
      race: r.race ?? null,
      error: null,
    };
    rows.push(row);
    console.log(`[${f.id}] ${row.grounded ? "GROUNDED ✓" : row.honestAbsent ? "honest-absent ✓" : "NOT-GROUNDED ✗"} ${row.searched ? "searched ✓" : "no-search ✗"} ${row.cited ? "cited ✓" : "no-cite ✗"} — "${f.q}" → "${answer.slice(0, 80).replace(/\n/g, " ")}"`);
    if (row.searched && row.thinking) console.log(`    thinking: ${row.thinking.split("\n").slice(0, 3).join(" | ")}`);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  mkdirSync(join(HERE, "results"), { recursive: true });
  const path = join(HERE, "results", `web-grounding-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), er7: ER7, model: MODEL, rows }, null, 2));
  const ok = rows.filter((r) => r.status === "ok");
  const g = ok.filter((r) => r.grounded).length;
  const s = ok.filter((r) => r.searched).length;
  const c = ok.filter((r) => r.cited).length;
  const ha = ok.filter((r) => r.honestAbsent).length;
  console.log(`\n${ok.length} facts · grounded ${g}/${ok.length} · searched ${s}/${ok.length} · cited ${c}/${ok.length} · honest-absent ${ha}/${ok.length}`);
  console.log(`wrote ${path}`);
}

await main();