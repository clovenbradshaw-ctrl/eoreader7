// hashid-structural-witness.mjs — can a non-local model reason about structure
// it has never been allowed to read? (2026-09-22)
//
// The idea, stated plainly: a real relation graph is extracted LOCALLY (the
// engine's own reader, not a hand-rolled stand-in). Every node is replaced by
// a content-addressed hashId before anything leaves the box — the remote
// model receives only opaque identifiers and directed edges between them,
// never a word of the source text. It is asked, in prose (never JSON — the
// model is a mouth that proposes a hypothesis, never a schema-emitter), which
// identifier looks structurally central. Locally, mechanically, we already
// know the true answer (max degree in the real graph) and can check the
// model's hash-blind guess against it — one witness in the parliament,
// verified, never trusted.
//
// Two independent checks, both mechanical:
//   1. BLINDNESS — does the exact prompt sent to the remote provider contain
//      any real word from the source text? If yes, the experiment is void.
//   2. ACCURACY — does the model's named "most central" hashId match the
//      locally-computed max-degree node?
//
// Run: node native/eval/the-fold/hashid-structural-witness.mjs

import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { engineRelationsFor } from "../../the-fold/reader-bundle.js";
import { makeOnlineRegistry, toOpenAIBody, fromOpenAIResponse } from "../../kernel/online-mouths.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// A real passage — real entities, real relations, extracted by the actual
// reader, never hand-built. Two failed passages first (both inspected
// directly, not guessed): compound subjects ("the Moon and the Sun ...")
// and near-duplicate short clauses collapsed 8 sentences into 1 real edge —
// the reader's GFP ends are whole phrase/clause spans, not normalized
// entities, and it does not reliably split a coordinated subject. A passage
// with two distinct proper-noun subjects, no coordination, and varied
// natural sentences produced 7 real edges with real degree variance
// (Ada Lovelace as end1 four times, Charles Babbage three) — that is what
// is used here, and the graph is exactly what the reader actually returns,
// not a shape engineered by repeating one phrase.
const SOURCE_TEXT = `Ada Lovelace wrote notes on the Analytical Engine. Ada Lovelace worked with Charles Babbage. Charles Babbage designed the Analytical Engine. Ada Lovelace published her notes in 1843. Charles Babbage never finished building the Analytical Engine. Ada Lovelace is remembered as an early programmer. Charles Babbage is remembered as an inventor.`;

/** Content-addressed, never the node's own text — 8 hex chars is plenty for a
 *  handful of nodes and short enough to read back out of prose easily. */
export function hashNode(text) {
  return crypto.createHash("sha256").update(String(text).trim().toLowerCase()).digest("hex").slice(0, 8);
}

/** How many edges touch this node, either end. */
export function degreeOf(edges, node) {
  return edges.filter((e) => e.end1 === node || e.end2 === node).length;
}

/** Real edges -> an opaque skeleton: hashId pairs only, direction kept,
 *  relation labels and source text dropped entirely. Also returns the
 *  hash->realNode map (kept LOCAL, never sent) and each hash's true degree. */
export function buildSkeleton(edges) {
  const nodes = new Set();
  for (const e of edges) { nodes.add(e.end1); nodes.add(e.end2); }
  const hashOf = new Map([...nodes].map((n) => [n, hashNode(n)]));
  const pairs = edges.map((e) => [hashOf.get(e.end1), hashOf.get(e.end2)]);
  const degree = new Map([...nodes].map((n) => [hashOf.get(n), degreeOf(edges, n)]));
  return { pairs, hashOf, degree, realOf: new Map([...hashOf.entries()].map(([k, v]) => [v, k])) };
}

/** The blindness check: scan the EXACT bytes sent to the remote provider for
 *  any real node word. True content-blindness means this is always false. */
export function mentionsAnyRealWord(promptText, realNodes) {
  const lower = promptText.toLowerCase();
  return [...realNodes].filter((n) => lower.includes(String(n).toLowerCase()));
}

/** Which hashId(s) the model's own prose names as central — found by literal
 *  substring search, since an 8-hex-char id is otherwise meaningless and
 *  won't collide with ordinary English. */
function hashesMentionedIn(text, allHashes) {
  const lower = text.toLowerCase();
  return allHashes.filter((h) => lower.includes(h));
}

function promptFor(pairs) {
  const lines = pairs.map(([a, b]) => `${a} -> ${b}`).join("\n");
  return [
    "You are looking at a directed graph. Every node is an opaque identifier — you have no other information about what any node represents, and none is given. Here are the directed connections:",
    "",
    lines,
    "",
    "Based only on this connection pattern (which identifiers connect to which, and how many connections touch each one), which identifier looks the most structurally central — the one with the most connections, or the one most other identifiers seem to route through? Name that one identifier explicitly, and in one or two plain sentences say why the pattern makes it look central. Do not guess at what the identifiers might mean; you cannot know that from this information.",
  ].join("\n");
}

export async function main() {
  const edges = (engineRelationsFor([SOURCE_TEXT]).edges ?? []).filter((e) => e.end1 && e.end2 && e.end1 !== e.end2);
  if (!edges.length) { console.log("the reader found no edges in the source passage — nothing to build a skeleton from"); return; }

  const { pairs, hashOf, degree, realOf } = buildSkeleton(edges);
  const trueTop = [...degree.entries()].sort((a, b) => b[1] - a[1])[0];
  const allHashes = [...realOf.keys()];

  console.log(`=== real graph (local only, never sent) ===`);
  for (const [real, hash] of hashOf) console.log(`  ${hash}  =  "${real}"  (degree ${degree.get(hash)})`);
  console.log(`\nlocally-computed ground truth: ${trueTop[0]} = "${realOf.get(trueTop[0])}" (degree ${trueTop[1]})`);

  const prompt = promptFor(pairs);
  const leaked = mentionsAnyRealWord(prompt, hashOf.keys());
  console.log(`\n=== blindness check ===`);
  console.log(leaked.length ? `FAILED — the prompt leaked: ${leaked.join(", ")}` : "held — the outgoing prompt contains none of the real node words");

  // Retry across candidates on a real failure — mirrors proxy.mjs's own
  // tryOnline: a 429 exhausts the provider, anything else stands it down,
  // and the next candidate in level order takes over. Measured on the first
  // run: llm7 rejected a genuinely keyless call with HTTP 401 despite its
  // own README's "30 RPM keyless" claim — one provider's word is not the
  // system's; this is exactly why the registry never stops at the first.
  const reg = makeOnlineRegistry();
  let provider, model, key, answer, started;
  const tried = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const pick = reg.pick({ exclude: tried });
    if (!pick) { console.log(`\nno online provider is usable after trying [${tried.join(", ")}] — cannot run the remote half`); return; }
    ({ provider, model, key } = pick);
    tried.push(provider.name);
    console.log(`\n=== sending the opaque skeleton to ${provider.name}/${model} (level ${provider.level}${provider.keyless ? ", keyless" : ""}) ===`);
    const body = toOpenAIBody({ messages: [{ role: "user", content: prompt }], options: { temperature: 0, num_predict: 200 } }, model);
    started = Date.now();
    let res;
    try {
      res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) { console.log(`  ${provider.name} network failure: ${e.message} — trying the next candidate`); reg.down(provider.name, e.message); continue; }
    if (res.status === 429) { const s = reg.exhausted(provider.name, { retryAfterS: res.headers.get("retry-after") }); console.log(`  ${provider.name} exhausted (${s}s) — trying the next candidate`); continue; }
    if (!res.ok) { const body = await res.text().catch(() => ""); console.log(`  ${provider.name} answered HTTP ${res.status} — ${body.slice(0, 200)} — trying the next candidate`); reg.down(provider.name, `HTTP ${res.status}`); continue; }
    const j = await res.json();
    const out = fromOpenAIResponse(j, { model, route: "chat", startedAt: started });
    answer = out.message.content;
    reg.observe(provider.name, { ms: Date.now() - started, ok: true });
    break;
  }
  if (!answer) { console.log("every candidate failed — no answer to check"); return; }
  console.log(`\n=== the model's answer (${Date.now() - started}ms, ${tried.length} candidate(s) tried) ===\n${answer}`);

  const named = hashesMentionedIn(answer, allHashes);
  console.log(`\n=== accuracy check ===`);
  console.log(`hashId(s) the model actually named: ${named.length ? named.join(", ") : "(none — it did not name a specific identifier)"}`);
  const matched = named.includes(trueTop[0]);
  console.log(matched
    ? `MATCH — the model named ${trueTop[0]} ("${realOf.get(trueTop[0])}"), which is the real max-degree node`
    : `NO MATCH — ground truth is ${trueTop[0]} ("${realOf.get(trueTop[0])}", degree ${trueTop[1]}); the model named ${named.join(", ") || "nothing specific"}`);

  return { edges: edges.length, nodes: hashOf.size, trueTop, provider: provider.name, model, blind: leaked.length === 0, named, matched };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((r) => { if (r) console.log(`\n=== summary ===\n${JSON.stringify(r)}`); }).catch((e) => { console.error(e); process.exit(1); });
}
