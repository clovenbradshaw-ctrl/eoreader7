// mouth-common.mjs — shared machinery for the mouth-feeding evals
// (mouth-minimal-feed.mjs, mouth-model-swap.mjs, mouth-long-chat.mjs).
// One implementation of the mechanical scoring, the paired sign test, and
// the single Ollama call, so the three evals measure the same thing and
// cannot drift apart. Pure (no engine import) apart from the production
// prompt constants it re-exports from the-fold's holon.js.

const OLLAMA = process.env.FOLD_OLLAMA_URL ?? "http://localhost:11434";

// The production prompts under test come from the real source — never a copy.
const { FLAT_EXECUTE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } = await import("../../../../../the-fold/holon.js");

export { FLAT_EXECUTE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT };

// ── mechanical scoring ──────────────────────────────────────────────────────
export const fold = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const words = (t) => fold(t).split(/[^a-z0-9]+/).filter(Boolean);
const STOP = new Set("a an the of to for in on and or but at by from with about what is who was how which where when i you it its are were be been being this that these those there".split(" "));

const APPARATUS_RE = /(as an ai|the prompt|the question asks|based on the information|based on what was|i['’]?d be happy to|let me know if|great question|sure!?$|of course[,!. ]|according to my knowledge|to the best of my knowledge)/i;
const FRAMING_RE = /^(the answer is|the answer to|in response to|in answer to|yes,? )/i;
const BOUNCE_RE = /\?\s*$/;

/** The fold's own voice, scored mechanically: apparatus narration, a meta
 * framing, a bounced-back question, verbosity, or a question-echo are each
 * a violation. Returns {violations, overlap, words}. */
export function stylization(question, answer) {
  const a = String(answer ?? "").trim();
  const aw = words(a);
  const qw = new Set(words(question).filter((w) => w.length > 2 && !STOP.has(w)));
  const violations = [];
  if (APPARATUS_RE.test(a)) violations.push("apparatus");
  if (FRAMING_RE.test(a)) violations.push("framing");
  if (BOUNCE_RE.test(a)) violations.push("bounce");
  if (aw.length > 60) violations.push("verbose");
  const overlap = qw.size ? [...qw].filter((w) => aw.includes(w)).length / qw.size : 0;
  if (overlap > 0.5) violations.push("restate");
  return { violations, overlap: Number(overlap.toFixed(2)), words: aw.length };
}

/** Expected-fact containment (folded, any of several acceptable forms). */
export function accurate(question, answer) {
  const a = fold(String(answer ?? ""));
  return question.expect.some((e) => a.includes(fold(e).trim()));
}

/** Exact binomial sign test on paired binary outcomes (McNemar's question):
 * b = trials where A failed and B succeeded, c = the reverse. Two-sided tail
 * of Binomial(b+c, 0.5) at the smaller disagreement count. */
export function signTest(aOutcomes, bOutcomes) {
  let b = 0, c = 0;
  for (let i = 0; i < aOutcomes.length; i++) {
    if (aOutcomes[i] === bOutcomes[i]) continue;
    if (bOutcomes[i]) b += 1; else c += 1;
  }
  if (b + c === 0) return { b, c, n: 0, p: 1, better: "tie", d: 0 };
  const k = Math.min(b, c);
  const n = b + c;
  const lnfact = (x) => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; };
  let p = 0;
  for (let i = 0; i <= k; i++) p += Math.exp(lnfact(n) - lnfact(i) - lnfact(n - i) - n * Math.log(2));
  p = Math.min(1, 2 * p);
  const better = b === c ? "tie" : b > c ? "B" : "A";
  return { b, c, n, p: Number(p.toFixed(4)), better, d: b - c };
}

export const sign = (p) => (p < 0.001 ? "***" : p < 0.01 ? "**" : p < 0.05 ? "*" : "");

export const pct = (arr, key) => `${Math.round((arr.filter((x) => x[key]).length / arr.length) * 100)}%`;

/** One Ollama /api/chat call, temperature declared by the caller (0 for
 * deterministic, >0 for sampling trials). */
export async function call(model, messages, { temperature = 0, maxTokens = 256 } = {}) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature, num_predict: maxTokens } }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  return data.message?.content ?? "";
}

/** A fold-less run of ONE turn: answers a question under a feeding arm.
 * Used by every eval below so "how the mouth is fed" is the only variable. */
export function feedArm(arm, q, { summary = null, history = [], windowN = 0 } = {}) {
  const messages = [];
  if (arm === "bare") {
    messages.push({ role: "user", content: q });
  } else if (arm === "exemplar") {
    messages.push({ role: "system", content: "Answer the question plainly and directly, in your own words, the way you'd tell a person. One or two sentences. No heading, no list, no restating the question.\n\nQuestion: What is the capital of Canada?\nAnswer: Ottawa." });
    messages.push({ role: "user", content: q });
  } else if (arm === "currentFlat") {
    messages.push({ role: "system", content: FLAT_EXECUTE_SYSTEM_PROMPT });
    messages.push({ role: "user", content: q });
  } else if (arm === "currentChat") {
    messages.push({ role: "system", content: CHAT_SYSTEM_PROMPT });
    messages.push({ role: "user", content: q });
  } else if (arm === "fold") {
    // THE FOLD'S OWN LONG-CHAT SHAPE (holon.js flat-chat assembly, 2026-09-15):
    // system = the conversation prompt + the running one-line summary
    // ("The conversation so far: …") + the recent verbatim window
    // (RECENCY_WINDOW = 4, the fold's own present); the question is the final
    // user turn. Same assembly the browser sends — never a second guess at
    // what "eoreader folding" means.
    const system = `${CHAT_SYSTEM_PROMPT}${summary ? `\n\nThe conversation so far: ${summary}` : ""}`;
    messages.push({ role: "system", content: system });
    for (const h of history.slice(-Math.max(0, windowN))) messages.push({ role: h.role, content: h.content });
    messages.push({ role: "user", content: q });
  }
  return messages;
}