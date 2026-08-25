// eval/surf-fold-local-llm.mjs — a real local model, tested against real
// complex code (eoreader6.1's nul/index.js), fed through the REAL surf
// (packages/host/surfer.js::executePrompt — the mechanical, model-free
// SOURCE→HEADING→CONTENT→WINDOW address ladder) and the REAL fold
// (packages/engine/emergence/tiers.js::createTierStack/foldThrough — the
// recursive-surprise cascade, the exact organs reflex.js already wires for
// the self plane), never the-fold's own simplified source.js::retrieve.
//
// The point: does the local model say anything TRUE about code it was
// mechanically, correctly shown — checked the same way this repo checks
// every other answer (grounding.js::checkGrounding, material-only, zero
// model calls) — and does the fold correctly register a near-restatement
// as LOW surprise the way aperture.test.mjs already proved on chat text.
//
// Run: node eval/surf-fold-local-llm.mjs [model]
// Requires a server speaking Ollama's POST /api/chat wire shape on
// 127.0.0.1:11434 (this session used a real llama-cpp-python + a real
// downloaded GGUF behind a thin protocol shim — disclosed in the run's own
// output, never silently assumed to be Ollama).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createSession, admitChunked } from "../../eoreader6.1/packages/host/corpus.js";
import { executePrompt } from "../../eoreader6.1/packages/host/surfer.js";
import { createTierStack, foldThrough } from "../../eoreader6.1/packages/engine/emergence/tiers.js";
import { tokenize } from "../source.js";
import { checkGrounding } from "../grounding.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODEL = process.argv[2] ?? "qwen2.5-coder-1.5b-instruct (real local GGUF via llama-cpp-python)";

// The SAME declared numbers this repo's own self-plane meter uses
// (reflex.js: window = RECENCY_WINDOW, draws = 200, alpha = 1, seed = 0) —
// giver named, nothing tuned here for this run.
const TIER_WINDOW = 4;
const TIER_DRAWS = 200;
const TIER_ALPHA = 1;
const TIER_SEED = 0;

const countsOf = (tokens) => {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
};

async function askModel(prompt) {
  const r = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], stream: false }),
  });
  const j = await r.json();
  return { text: j.message?.content ?? "", evalTokens: j.eval_count ?? null };
}

// Derived from the material itself — never a hand-typed list of function
// names, matching this repo's own standing rule (giver named, nothing
// hand-picked). Every real top-level export nul/index.js declares.
function identifiersOf(sourceText) {
  const ids = new Set();
  const re = /\bexport\s+(?:const|function)\s+(\w+)/g;
  let m;
  while ((m = re.exec(sourceText))) ids.add(m[1]);
  return ids;
}

// Which of the material's own real identifiers does this question name —
// exact word-boundary match against the derived set, never a guess.
function identifiersIn(question, knownIdentifiers) {
  const words = new Set(question.match(/\b\w+\b/g) ?? []);
  return [...knownIdentifiers].filter((id) => words.has(id));
}

// Does the segment ACTUALLY define this identifier — the referent-identity
// check grounding.js's own word-level containment cannot do, because a
// function's NAME recurring in nearby comments is real vocabulary, not
// evidence its BODY is the thing shown. Mirrors P7.2's "a check on a name
// asks about the referent, not the string," aimed at code instead of prose.
function definesIdentifier(segmentText, name) {
  return new RegExp(`\\bexport\\s+(?:const|function)\\s+${name}\\b`).test(segmentText);
}

function buildPrompt(segment, question, priorTurns, voidIdentifiers) {
  const history = priorTurns.length
    ? `Earlier in this conversation:\n${priorTurns.map((t) => `Q: ${t.question}\nA: ${t.answer}`).join("\n\n")}\n\n`
    : "";
  // P32's own pattern (SEARCHED_VOID_PREFIX): a disclosed FACT the model
  // receives, never a behavioral instruction stacked on top of it — no
  // "you must say you don't know," just what is and isn't true of what
  // follows.
  const voidNote = voidIdentifiers.length
    ? `Note: the real definition of ${voidIdentifiers.map((n) => `\`${n}\``).join(", ")} is not visible in the code shown below.\n\n`
    : "";
  return (
    `You are reviewing real source code. Answer only from the code shown below — ` +
    `if it does not answer the question, say so rather than guessing.\n\n` +
    `${history}${voidNote}` +
    `CODE (${segment.source}, bytes ${segment.byte_start}-${segment.byte_end}, ` +
    `addressed by: ${segment.addressed_by}${segment.heading ? ` — "${segment.heading}"` : ""}):\n` +
    `\`\`\`js\n${segment.text}\n\`\`\`\n\n` +
    `Question: ${question}`
  );
}

const TURNS = [
  "What does the ground function do, and what does it need as input?",
  "How does the difference function decide whether an observation is a real shift or just noise?",
  "What is witness for, and how does it use ground and pattern together?",
  "What is witness used for?", // deliberate near-restatement of turn 3 — tests whether fold registers LOW surprise
  "Which perturbation and statistic pairs does the LICENSED table allow, and why would an unlicensed pair be refused?",
  "Is there a concrete bug or improvement you would suggest in how ground or difference is written?",
];

async function main() {
  const nulPath = join(HERE, "..", "..", "eoreader7", "legacy-eoreader6.1", "nul", "index.js");
  const text = readFileSync(nulPath, "utf8");
  console.log(`material: nul/index.js (${text.length} chars, ${text.split("\n").length} lines) — the same file CLAUDE.md's own "measuring door" section describes as this repo's flagship statistical engine`);
  console.log(`model: ${MODEL}\n`);

  const session = createSession();
  admitChunked(session, { text, sourceId: "nul/index.js" });

  const knownIdentifiers = identifiersOf(text);
  console.log(`derived ${knownIdentifiers.size} real identifiers from the material itself: ${[...knownIdentifiers].join(", ")}\n`);

  const tiers = createTierStack(["discourse", "atmosphere", "lens"], {
    window: TIER_WINDOW,
    draws: TIER_DRAWS,
    seed: TIER_SEED,
  });

  const priorTurns = [];
  const report = [];

  for (const question of TURNS) {
    console.log(`\n== "${question}"`);

    // ── SURF: the real mechanical address ladder, never a naive dump ──
    // A truthy `.gap` is not always a hard refusal: `addressDoc`'s own
    // no-outline fallback still spreads a real snipped `text`/byte range
    // alongside a DISCLOSED `no_structural_boundary_in_reach` label — P4's
    // "a gap is a result," not an empty answer. Only a result with no text
    // at all (empty_prompt, no_source, ambiguous_source, content_not_found)
    // is genuinely unusable.
    const result = executePrompt(session, question);
    const candidate = result.fan ? result.fan[0] : result;
    if (!candidate?.text) {
      console.log(`  surf: REFUSED — ${result.gap ?? candidate?.gap} (${result.reason ?? candidate?.reason})`);
      report.push({ question, surf: "gap", gap: result.gap ?? candidate?.gap });
      continue;
    }
    const segment = candidate;
    console.log(
      `  surf: addressed by ${segment.addressed_by}` +
        `${segment.heading ? ` — "${segment.heading}"` : ""}` +
        ` · bytes ${segment.byte_start}-${segment.byte_end} (${segment.byte_end - segment.byte_start}) ` +
        `${segment.gap ? `· disclosed: ${segment.gap}` : ""}${segment.windowed ? " · windowed" : ""}` +
        `${segment.content_match?.ambiguous ? " · ambiguous tie" : ""}`,
    );

    // ── IDENTIFIER CHECK: does the shown segment actually DEFINE the
    // function(s) this question names — mechanical, zero model calls, run
    // BEFORE the model sees anything (P23's "checked before generation, not
    // only after" discipline, aimed at code identity instead of a fetched
    // page). ──
    const asked = identifiersIn(question, knownIdentifiers);
    const voidIdentifiers = asked.filter((name) => !definesIdentifier(segment.text, name));
    if (voidIdentifiers.length) {
      console.log(`  identifier-check: asked about [${asked.join(", ")}] — NOT defined in shown segment: ${voidIdentifiers.join(", ")} (disclosed to model)`);
    } else if (asked.length) {
      console.log(`  identifier-check: asked about [${asked.join(", ")}] — all defined in shown segment`);
    }

    // ── the model's turn, over ONLY what surf mechanically addressed ──
    const prompt = buildPrompt(segment, question, priorTurns, voidIdentifiers);
    const { text: answer, evalTokens } = await askModel(prompt);
    console.log(`  model (${evalTokens ?? "?"} tokens): ${answer.replace(/\s+/g, " ").trim().slice(0, 400)}`);

    // ── FOLD: the real recursive-surprise cascade over the answer's own words ──
    const arrival = countsOf(tokenize(answer));
    let fold = null;
    if (arrival.size === 0) {
      console.log(`  fold: empty_arrival — nothing tokenizable in the answer`);
    } else {
      const f = foldThrough(tiers, arrival, { alpha: TIER_ALPHA });
      const top = f.results[f.results.length - 1];
      fold = {
        reached: f.reached,
        top: f.top,
        bits: top?.surprise != null ? Number(top.surprise.toFixed(3)) : null,
        rank: top?.rank ?? null,
        censored: top?.censored ?? null,
        gap: top?.gap ? (top.gap.gap ?? top.gap) : null,
      };
      console.log(
        `  fold: reached ${fold.reached} tier(s) (top: ${fold.top}) · ` +
          `${fold.gap ? `gap: ${fold.gap}` : `bits=${fold.bits} rank=${fold.rank} censored=${fold.censored}`}`,
      );
    }

    // ── GROUNDING: does the model's own claim check out against the bytes ──
    // it was mechanically shown — zero model calls, the same organ this
    // repo runs on every other answer.
    const grounding = checkGrounding(answer, [{ text: segment.text, ref: `${segment.source}#${segment.byte_start}-${segment.byte_end}` }], {
      question,
    });
    console.log(
      `  grounding: ${grounding.atomsChecked} atom(s) checked, ${grounding.findings.length} unsupported` +
        (grounding.findings.length ? ` — ${grounding.findings.map((f) => `"${f.text}"`).slice(0, 3).join(", ")}` : ""),
    );

    priorTurns.push({ question, answer });
    report.push({
      question,
      addressed_by: segment.addressed_by,
      disclosedGap: segment.gap ?? null,
      heading: segment.heading,
      bytes: [segment.byte_start, segment.byte_end],
      answerTokens: evalTokens,
      fold,
      groundingFindings: grounding.findings.length,
      atomsChecked: grounding.atomsChecked,
      voidIdentifiers,
    });
  }

  console.log("\n\n== SUMMARY ==");
  for (const r of report) {
    console.log(
      `  "${r.question.slice(0, 60)}${r.question.length > 60 ? "…" : ""}" — ` +
        `surf:${r.surf ?? r.addressed_by} ` +
        `fold:${r.fold ? r.fold.gap ?? `${r.fold.censored ?? r.fold.rank}` : "n/a"} ` +
        `grounding:${r.groundingFindings ?? 0}/${r.atomsChecked ?? 0} unsupported`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
