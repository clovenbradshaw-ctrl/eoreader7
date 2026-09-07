// eval/the-fold/conversation.mjs — a READER in conversation with the real turn
// about one novel, for as long as you like.
//
//   node eval/the-fold/conversation.mjs --source prose=/path/novel.txt [--turns 1000]
//        [--model gemma2:2b] [--reader-model gemma2:2b] [--seed 3] [--witness on|off]
//        [--depth 1] [--resolutions 0|1|2|3] [--material auto|passages|snips] [--chunking app|outline] [--retrieval activation|terms] [--resume <dir>]
//
// Not the probe bank (long-stream.mjs asks templated questions scored by
// atoms). This is what a person does over a long conversation about a book:
// reflects on what was just said, asks what a name or a claim meant, follows
// a thread, asks which passage says so, comes back to something said earlier
// and asks how the two fit, opens a fresh thread from the cast, asks why.
//
// THE MOVE IS COMPUTED; THE MOUTH PHRASES IT (the model is just the mouth).
// Each turn a move is drawn (seeded) from what the last answer's own record
// makes available — the names it introduced, whether it cited, whether it
// left claims unsupported, whether there is an earlier exchange to revisit —
// and the reader model writes the question in a reader's voice under a
// guard: a question that does not name its target is retried once and then
// replaced by a mechanical phrasing, and the record says which. Nothing the
// reader says is scored by a model. What is recorded per turn: the move and
// its target, whether the target is a name the book actually contains,
// whether the answer ADDRESSED the target, CITED a passage, or ADMITTED the
// book does not say — the three honest outcomes of a clarification — plus
// everything the long-stream row records about the turn itself.
//
// The rig — corpus declared by content (P88), the model call, witnesses,
// the cast resolver, the learned store, the real turn with its threaded
// ledgers — is long-stream.mjs's, copied verbatim and named as such; the
// two drivers should share a lib once the P145 arm's analysis is closed.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { organs as productOrgans } from "./lib/product-assay.mjs";
import { buildFactBank, makeRng, sentencesOf } from "./lib/long-stream.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const ROOT = new URL("../../../../", import.meta.url).pathname;
const FOLD = `${ROOT}the-fold/`;
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const TURNS = Number(flag("turns", 1000));
const MODEL = flag("model", "gemma2:2b");
const READER_MODEL = flag("reader-model", MODEL);
const DEPTH = Number(flag("depth", 1));
const SEED = Number(flag("seed", 3));
// The discourse at three resolutions (the-fold resolutions.js, P171): 0 = today's one-line stand-in only, 1 = + atmosphere, 2 = + lens, 3 = + paradigm. The arm of the measurement, declared here, printed with the configuration, carried on every row.
const RESOLUTIONS = Number(flag("resolutions", 0));
// What the mouth is handed as material: "auto" = the passages leave at level ≥ 2 (compression), "passages" forces them in (the additive control), "snips" forces them out.
const MATERIAL = String(flag("material", "auto"));
// THE READER'S CONFIGURATION (P88): the app chunks by paragraph (source.js chunkSource, no boundaries — 3,743 chunks on this novel, median 135 chars); the long-stream rig this driver copied chunked prose by outline heading (328 chapter-sized chunks, ~3.5 KB), which is not what the page runs and was most of the raw-passage bloat. "app" is the default; "outline" keeps the rig's unit for the runs already recorded under it.
const CHUNKING = String(flag("chunking", "app"));
// RETRIEVAL: "activation" (the-fold activation-retrieval.js — the question activates referents, hop 0 their sentences, hop 1 what they stand with, cut by dmdWindow; term retrieval only as the disclosed fallback) or "terms" (the turn's own term retrieval over chunks, the old unit).
const RETRIEVAL = String(flag("retrieval", "activation"));
const WITNESS = flag("witness", "on") !== "off";
const RESUME = flag("resume", null);
const sourceArgs = args.flatMap((a, i) => (a === "--source" && args[i + 1] ? [args[i + 1]] : []));
if (!sourceArgs.length) { console.error("usage: --source prose=/path/to/novel.txt is required"); process.exit(2); }
const SOURCES = sourceArgs.map((s) => { const [kind, ...rest] = s.split("="); return { kind, path: rest.join("=") }; });

const O = await productOrgans();
const { runHolonicTask, needsDecomposition } = await import(`${FOLD}holon.js`);
const { makeCastResolver } = await import(`${FOLD}cast.js`);
const { mechanicalFoldLine, RECENCY_WINDOW } = await import(`${FOLD}fold.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { learn, correctionsIn, learnable } = await import(`${FOLD}learned.js`);
const { historyWindow, referentsOf } = await import(`${FOLD}dialogue.js`);
const { namesIn } = await import(`${FOLD}ground-ladder.js`);
const { ANAPHORIC_PRONOUNS } = await import("../../adapters/text/priors.js"); // a received closed class with its giver (lang/en): "She's" is not a being to ask about
const { makeReferentIndex } = await import(`${FOLD}cast.js`);
const { dmdWindow } = await import(`${NATIVE}/kernel/activation.js`);
const { mentionBook, makeActivationRetrieval } = await import(`${FOLD}activation-retrieval.js`);
let math = null;
try { math = await import(`${FOLD}node_modules/mathjs/lib/esm/index.js`); } catch { try { math = await import("mathjs"); } catch { math = null; } }
let nul = null;
try { nul = await import(`${ROOT}eoreader7/legacy-eoreader6.1/nul/index.js`); } catch { nul = null; }
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { lineIndex, outlineOfIndex } = await import(`${ROOT}eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/segments.js`);
const W = await import(`${NATIVE}/organs/index.js`);
const castFor = makeCastResolver({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
// THE REFERENT INDEX (P11): the turn gets one per part over its passages; the reader's moves and the driver's own measures use one over the whole corpus.
const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });

// ── the rig (long-stream.mjs, verbatim) ───────────────────────────────────
const windowed = (text, size) => { const out = []; let i = 0; while (i < text.length) { let j = Math.min(text.length, i + size); const nl = text.lastIndexOf("\n", j); const cm = text.lastIndexOf(",", j); const cut = nl > i + size / 2 ? nl + 1 : cm > i + size / 2 ? cm + 1 : j; out.push(text.slice(i, cut)); i = cut; } return out.join("\n\n"); };
const boundariesOf = (t) => { try { const out = outlineOfIndex(lineIndex(t), { max: 5000 }); if (out.gap || out.headings.length < 2) return null; return out.headings.map((h) => ({ start: h.start, end: h.end })); } catch { return null; } };
const chunks = []; const loaded = []; const sourceText = {};
for (const s of SOURCES) {
  if (!existsSync(s.path)) { console.error(`source missing: ${s.path}`); process.exit(2); }
  let text = readFileSync(s.path, "utf8");
  if (!/\n\s*\n/.test(text)) text = windowed(text, 1500);
  const name = s.path.split("/").pop();
  sourceText[name] = text;
  const cs = O.chunkSource(name, text, { boundaries: CHUNKING === "outline" && s.kind === "prose" ? boundariesOf(text) : null }).map((c) => ({ ...c, source: name, kind: s.kind }));
  chunks.push(...cs);
  loaded.push({ kind: s.kind, name, path: s.path, bytes: text.length, chunks: cs.length, sha256: createHash("sha256").update(text).digest("hex").slice(0, 16) });
}
const corpusIndex = indexFor(chunks);
console.log(`  corpus referents: ${corpusIndex.referents.size} (cast.js makeReferentIndex over ${chunks.length} chunks)`);
// THE ADDRESS BOOK (activation-retrieval.js): every sentence an established referent stands in, by referent — a projection of the index, built once.
const tBook = Date.now();
const book = RETRIEVAL === "activation" ? mentionBook(chunks, corpusIndex, { splitSentences }) : null;
if (book) console.log(`  mention book: ${book.sentences.length} sentences carry a referent, ${book.referents} referents addressed, ${book.gaps.length} gaps (${((Date.now() - tBook) / 1000).toFixed(1)}s)`);
// THE GRAIN OF A SENTENCE IS THE ACT: the corpus reader, built once, hears the acts a candidate sentence states about the active referents (activation-retrieval.js, SENTENCE_CEILING reads per hop at most).
const tReader = Date.now();
const corpusReader = book ? O.relationsFor(chunks, { pool: chunks }) : null;
if (corpusReader) console.log(`  corpus reader built in ${((Date.now() - tReader) / 1000).toFixed(1)}s (vocabulary over ${chunks.length} chunks)`);
const retrieveWith = book ? makeActivationRetrieval({ index: corpusIndex, book, dmdWindow, fallback: O.retrieve, read: (t) => corpusReader.read(t), notes: () => (state?.hlLog && O.hl?.foldWithStanding ? O.hl.foldWithStanding(state.hlLog) : []), transcript: () => state?.transcript ?? [] }) : null;
const usage = { calls: 0, promptTokens: 0, completionTokens: 0, readerCalls: 0 };
async function callWith(model, messages, opts = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const body = { model, stream: false, options: { temperature: opts.temperature ?? 0, num_predict: opts.maxTokens ?? 512 }, messages };
      if (opts.json) body.format = opts.json === true ? "json" : opts.json;
      const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(600000) });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = await res.json();
      usage.calls += 1; usage.promptTokens += data.prompt_eval_count ?? 0; usage.completionTokens += data.eval_count ?? 0;
      return data.message?.content ?? "";
    } catch (err) { if (attempt === 1) throw err; }
  }
}
const call = (messages, opts) => callWith(MODEL, messages, opts);
const witnessAsk = async (s, slice) => W.readTestimony(await call(W.buildWitnessMessages(s, slice), { json: W.WITNESS_SCHEMA, maxTokens: 200 }));
const witnessSelect = async (messages) => { try { return JSON.parse(await call(messages, { json: W.SELECT_SCHEMA, maxTokens: 120 })); } catch { return {}; } };
const witnessSentences = WITNESS ? (sentences, claims, passages, { maxAsks }) => W.witnessSentences(sentences, claims, passages, { ask: witnessAsk, selectAsk: witnessSelect, splitSentences, testimony: W.readTestimony, maxAsks }) : null;

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const DIR = RESUME ?? join(NATIVE, "eval/the-fold/results/conversation", `${stamp}-${MODEL.replace(/[^\w.-]+/g, "_")}-${loaded[0].name.replace(/\.[^.]+$/, "")}`);
mkdirSync(DIR, { recursive: true });
const BLOCKS_PATH = join(DIR, "blocks.jsonl");
const TURNS_PATH = join(DIR, "turns.jsonl"), STATE_PATH = join(DIR, "state.json"), CONFIG_PATH = join(DIR, "config.json"), TRANSCRIPT_PATH = join(DIR, "transcript.md");
const corpusId = createHash("sha256").update(loaded.map((l) => `${l.kind}:${l.name}:${l.sha256}`).join("|")).digest("hex").slice(0, 16);
const rng = makeRng(SEED);
let state;
if (RESUME && existsSync(STATE_PATH)) { state = JSON.parse(readFileSync(STATE_PATH, "utf8")); rng.advanceTo(state.draws ?? 0); console.log(`resuming at turn ${state.turn} from ${DIR}`); }
else {
  const bank = buildFactBank(chunks, { perSource: 120, rng });
  state = { turn: 0, history: [], transcript: [], hlLog: null, gridLog: null, bank, draws: rng.draws, asked: [], seen: [], coverage: [], useMeasuredCut: false };
  writeFileSync(CONFIG_PATH, JSON.stringify({ ran: new Date().toISOString(), model: MODEL, readerModel: READER_MODEL, corpusId, depth: DEPTH, turns: TURNS, seed: SEED, witness: WITNESS, resolutions: RESOLUTIONS, material: MATERIAL, chunking: CHUNKING, retrieval: RETRIEVAL, sources: loaded, recipe: O.recipe }, null, 2));
  writeFileSync(TRANSCRIPT_PATH, `# A conversation about ${loaded[0].name}\n\n${MODEL} answering through the real turn; the reader is ${READER_MODEL} phrasing moves computed from the record. Seed ${SEED}. Corpus ${corpusId}.\n\n`);
}
console.log(`conversation — ${MODEL} answering, ${READER_MODEL} reading, ${TURNS} turns, witness ${WITNESS ? "on" : "off"}, arithmetic ${math ? "computed" : "UNAVAILABLE"}, resolutions ${RESOLUTIONS} (0 one-line stand-in only, 1 + atmosphere, 2 + lens, 3 + paradigm), material ${MATERIAL}, chunking ${CHUNKING}, retrieval ${RETRIEVAL}`);
for (const l of loaded) console.log(`  ${l.kind.padEnd(8)} ${l.name.padEnd(28)} ${String(l.bytes).padStart(9)} bytes ${String(l.chunks).padStart(5)} chunks  ${l.sha256}`);
console.log(`  cast/fact bank ${state.bank.length}; recipe ${O.recipe}; corpus ${corpusId}\n  ${DIR}`);
const LEARNED_PATH = join(NATIVE, "eval/the-fold/results/long-stream", "learned.json");
let learnedStore = [];
try { if (existsSync(LEARNED_PATH)) { const raw = correctionsIn(JSON.parse(readFileSync(LEARNED_PATH, "utf8"))); learnedStore = raw.filter((e) => !learnable(e.claimed, e.corrected)); } } catch { learnedStore = []; }
const saveLearned = () => { const tmp = `${LEARNED_PATH}.tmp`; writeFileSync(tmp, JSON.stringify(learnedStore, null, 1)); renameSync(tmp, LEARNED_PATH); };
const saveState = () => { const tmp = `${STATE_PATH}.tmp`; writeFileSync(tmp, JSON.stringify({ ...state, draws: rng.draws })); renameSync(tmp, STATE_PATH); };

// ── the reader ───────────────────────────────────────────────────────────
const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const trim = (t, n) => { const s = String(t ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };
const inSource = (name) => corpusIndex.resolve(name).size > 0; // a referent the material establishes, not a substring
/** Names the answer introduces (ground-ladder.js::namesIn — the one implementation), dedup, in order; a real reader may ask about a name the book never establishes, so all are kept and each is tagged by the corpus index. */
const pronoun = (n) => ANAPHORIC_PRONOUNS.has(fold(n)) || ANAPHORIC_PRONOUNS.has(String(n).toLowerCase());
const namesOf = (text) => { const seen = new Set(); return namesIn(String(text ?? "")).map((n) => n.replace(/['’]s$/u, "")).filter((n) => { const k = fold(n); if (!n || pronoun(n) || seen.has(k)) return false; seen.add(k); return true; }); };
const quotedIn = (text) => [...String(text ?? "").matchAll(/[“"]([^”"]{12,120})[”"]/g)].map((m) => m[1]);
const admitsAbsence = (a) => /\b(do(es)? not (use|mention|say|name)|not (in|found in|present in) (the|these|this) (source|book|novel|text|passage)|nothing (here|in the (book|text|sources))|no passage|isn'?t mentioned|not mentioned)\b/i.test(a);
const mentions = (a, target) => target ? fold(a).includes(fold(target)) : null;

function chooseMove(last, turn) {
  if (!last) return { move: "open" };
  const names = namesOf(last.answer).filter((n) => !state.asked.includes(fold(n)));
  const quotes = quotedIn(last.answer);
  const options = [];
  const push = (move, w, extra = {}) => { if (w > 0) options.push({ move, w, ...extra }); };
  if (names.length) push("clarify", 0.28, { target: rng.pick(names) });
  if (quotes.length) push("clarify", 0.10, { target: rng.pick(quotes), quoted: true });
  if (sentencesOf(last.answer).length >= 2) push("reflect", 0.18);
  const established = names.filter(inSource); // deepen / why are about a being the material establishes; clarify may ask about a name that resolves to nothing — that is what clarify is for
  if (established.length) push("deepen", 0.14, { target: rng.pick(established) });
  push("verify", 0.08 + (last.unsupported > 0 ? 0.14 : 0) + (last.refs.length === 0 ? 0.06 : 0));
  if (state.transcript.length >= 6) push("revisit", 0.10);
  if (established.length) push("why", 0.08, { target: rng.pick(established) });
  push("open", names.length ? 0.04 : 0.30);
  const total = options.reduce((a, o) => a + o.w, 0);
  let r = rng.next() * total;
  for (const o of options) { r -= o.w; if (r <= 0) return o; }
  return options[options.length - 1];
}
function pickEarlier() {
  const d = rng.pick([5, 10, 20, 40].filter((x) => x < state.transcript.length));
  const e = state.transcript[state.transcript.length - 1 - (d ?? 1)] ?? state.transcript[0];
  return e;
}
const SYSTEM = (name) => `You are a reader of ${name} in the middle of a long conversation with someone who has read it closely and answers from the text. You ask one question at a time, in your own words, about what they just said or about the book. You may first say, in one short sentence, what you took from their last answer. You never answer your own question, never invent events, and keep the whole thing under forty words. Write only your words to them.`;
function instructionFor(m, last, earlier) {
  const said = last ? `They just said: "${trim(last.answer, 700)}"` : "";
  switch (m.move) {
    case "clarify": return m.quoted ? `${said}\nYou are not sure what they meant by "${m.target}". Ask them to explain it, in your own words, quoting those words back.` : `${said}\nYou are not sure who or what "${m.target}" is. Ask them to explain who or what ${m.target} is, naming ${m.target}.`;
    case "reflect": return `${said}\nTell them in one sentence what you took from that, then ask whether that is really what the book says.`;
    case "deepen": return `${said}\nAsk them to say more about ${m.target} — what happens with ${m.target} before or after this. Name ${m.target}.`;
    case "why": return `${said}\nAsk why ${m.target} did that, or why it matters for the story. Name ${m.target}.`;
    case "revisit": return `Earlier you asked: "${trim(earlier.question, 200)}" and they said: "${trim(earlier.answer, 400)}"\n${said}\nAsk how those two fit together, naming ${m.target}.`;
    case "open": return `Ask what the book says about ${m.target}, naming ${m.target}. You have not discussed ${m.target} yet.`;
    default: return "";
  }
}
async function phrase(m, last, earlier, name) {
  if (m.move === "verify") return { question: rng.pick(["Which passage says that? Quote it for me.", "Where in the book is that — can you give me the passage?", "I'd like to see the words themselves. Which passage says so?"]), phrasedBy: "mechanical" };
  const messages = [{ role: "system", content: SYSTEM(name) }, { role: "user", content: instructionFor(m, last, earlier) }];
  for (const temperature of [0.2, 0.5]) {
    let out = "";
    try { out = await callWith(READER_MODEL, messages, { maxTokens: 90, temperature }); usage.readerCalls += 1; } catch { out = ""; }
    const q = out.replace(/\s+/g, " ").replace(/^["“]|["”]$/g, "").trim();
    // The guard on the mouth's phrasing: the question must still name its target — by REFERENT through the corpus index where the target resolves, by surface only where it does not.
    const keepsTarget = (text) => { if (!m.target) return true; const ids = corpusIndex.resolve(m.target); return ids.size ? [...ids].every((id) => referentsOf(text, corpusIndex).ids.has(id)) : mentions(text, m.target); };
    if (q && q.length <= 320 && /\?/.test(q) && keepsTarget(q)) return { question: q, phrasedBy: "model" };
  }
  const fallback = { clarify: `What do you mean by "${m.target}" — who or what is that?`, deepen: `Can you say more about ${m.target}?`, why: `Why does ${m.target} matter here?`, revisit: `Earlier you told me "${trim(earlier?.answer, 120)}". How does that fit with what you just said about ${m.target}?`, reflect: `So, if I follow you: ${trim(last?.answer, 160)} Is that what the book says?`, open: `What does the book say about ${m.target}?` };
  return { question: fallback[m.move] ?? `Can you say more about ${m.target}?`, phrasedBy: "mechanical" };
}

// ── the conversation ─────────────────────────────────────────────────────
const NAME = loaded[0].name;
for (let turn = state.turn + 1; turn <= TURNS; turn++) {
  const last = state.transcript.at(-1) ?? null;
  const m = chooseMove(last, turn);
  let earlier = null;
  if (m.move === "revisit") { earlier = pickEarlier(); m.target = namesOf(earlier.answer)[0] ?? namesOf(last.answer)[0] ?? null; if (!m.target) { m.move = "reflect"; } }
  if (m.move === "open") {
    // A fresh thread is one not opened before: names from the bank not yet asked about (turn 7 of the first run re-opened Razumihin).
    // A thread the reader may open names a being the material ESTABLISHES (the corpus index resolves it) — the fact bank's name atoms include capitalised words that are no one (turn 2 of the first wired run asked about "Lent", a verb).
    const fresh = state.bank.flatMap((f) => (f?.atoms ?? []).filter((a) => a.kind === "name").map((a) => a.value)).filter((n, i, arr) => inSource(n) && arr.indexOf(n) === i && !state.asked.includes(fold(n)));
    m.target = fresh.length ? rng.pick(fresh) : null;
    if (!m.target) { m.move = last ? "reflect" : "open"; if (!last) m.target = "the opening chapter"; }
  }
  const { question, phrasedBy } = await phrase(m, last, earlier, NAME);
  if (m.target) state.asked.push(fold(m.target));

  const t0 = Date.now(); const calls0 = usage.calls, pt0 = usage.promptTokens, ct0 = usage.completionTokens;
  // The history the mouth is handed is MEASURED (dialogue.js::historyWindow via dmdWindow): the shallowest depth at which forgetting the older turns changes nothing the question reaches — RECENCY_WINDOW is the cap, never the count.
  const win = historyWindow(state.history.slice(-RECENCY_WINDOW * 2), question, { dmdWindow, index: corpusIndex });
  const history = win.messages;
  const discourse = mechanicalFoldLine(state.history.slice(-2).map((h) => h.content).join(" "), "");
  let r = null, error = null;
  try {
    r = await runHolonicTask({
      task: question, chunks, call, foldedRefs: [], expect: null,
      makeNameResolver: castFor, makeReferentIndexFor: indexFor, makeRelationReader: O.relationsFor, witnessSentences,
      checkLink: null, planMode: needsDecomposition(question) ? "model" : "flat",
      chatHistory: history, discourse, depth: DEPTH, learnedStore, transcript: state.transcript,
      resolutions: RESOLUTIONS, dmdWindow, conversationIndex: corpusIndex, records: [], material: MATERIAL, retrieveWith, mentionBook: book,
      math, coverageHistory: state.coverage ?? [], nul, useMeasuredCut: false,
      hyperlexicon: O.hl, hyperlexiconLog: state.hlLog, hyperlexiconFrame: O.frame, hyperlexiconRecipe: O.recipe,
      grid: O.grid, gridLog: state.gridLog, runCapacity: O.runCapacity,
    });
  } catch (e) { error = String(e?.stack ?? e?.message ?? e).slice(0, 600); }
  const answer = r ? String(r.output ?? "") : "";
  if (r?.hyperlexiconLog) state.hlLog = r.hyperlexiconLog;
  if (r?.gridLog) state.gridLog = r.gridLog;
  let learnedAdded = 0;
  for (const e of r?.learned ?? []) { const before = learnedStore.length; learnedStore = learn(learnedStore, e); if (learnedStore.length > before) learnedAdded += 1; }
  if (learnedAdded) saveLearned();
  const refs = r?.refs ?? [];
  // The answer's graded claims ride on the transcript so the next turn's self-consistency check has them (dialogue.js::selfContradictions).
  // The answer's bound claims ride on the transcript for the next turn's self-consistency check (keyed there, through that turn's own index).
  const claims = (r?.sections ?? []).flatMap((s) => (s?.relations?.claims ?? []).filter((c) => c && c.verdict === "bound" && (c.end1 ?? c.subject) != null).map((c) => ({ polarity: c.polarity ?? "+", end1: c.end1 ?? c.subject ?? null, label: c.label ?? c.verb ?? null, end2: c.end2 ?? c.object ?? null })));
  // The driver's own measure of "addressed": by REFERENT — the answer's referents (corpus index) cover the target's.
  const targetIds = m.target ? corpusIndex.resolve(m.target) : null;
  // A target the index resolves is scored by identity; a target it does not resolve is UNMEASURED (null), never a substring hit — "I lent you" is not an answer about Lent.
  const addressed = m.target ? (targetIds.size ? [...targetIds].every((id) => referentsOf(answer, corpusIndex).ids.has(id)) : null) : null;
  const absent = admitsAbsence(answer);
  const cited = refs.length > 0;
  const resolved = m.target ? Boolean(addressed && (cited || absent)) : (m.move === "verify" ? cited : m.move === "reflect" ? Boolean(cited || /\b(yes|no|not quite|that'?s right|correct|actually)\b/i.test(answer)) : null);
  const row = {
    turn, at: new Date().toISOString(), move: m.move, target: m.target ?? null, targetInSource: m.target ? inSource(m.target) : null, phrasedBy, question, answer,
    earlierTurn: earlier?.turn ?? null, addressed, cited, admitsAbsence: absent, resolved,
    retrieval: r?.retrieval ? r.retrieval.map((x) => ({ basis: x.basis, grain: x.grain ?? null, active: x.active?.length ?? 0, hop1: x.hop1?.length ?? 0, window: x.window, hop0Count: x.hop0Count, hop1Count: x.hop1Count })) : null,
    resolutions: r?.resolutions ? r.resolutions.map((x) => ({ level: x.level, handed: x.handed ?? null, index: x.index, active: x.active?.ids?.length ?? 0, atmosphere: x.atmosphere, lens: x.lens, paradigm: x.paradigm, windows: x.windows })) : null,
    historyDepth: win.depth, historyBasis: win.basis ?? null,
    turnAddressed: r?.addressed ?? null, expectation: r?.expectation ?? null, selfContradictions: r?.selfContradictions ?? [], position: r?.position ?? null,
    ms: Date.now() - t0, calls: usage.calls - calls0, promptTokens: usage.promptTokens - pt0, completionTokens: usage.completionTokens - ct0,
    refs, unsupported: (r?.unsupported ?? []).length, unbacked: (r?.unbacked ?? []).length, sections: (r?.sections ?? []).length,
    premises: r?.premises ? { checked: r.premises.checked, unverified: r.premises.unverified, contradicted: r.premises.contradicted } : null,
    correction: r?.correction ? { flagged: r.correction.flagged, asked: r.correction.asked, afterFlagged: r.correction.after?.flagged } : null,
    answeredBeforeTheModel: r?.answeredBeforeTheModel ? r.answeredBeforeTheModel.kind : null, recalledTurns: r?.recalledTurns ?? [], learnedAdded, error,
  };
  if (r?.resolutions?.length) appendFileSync(BLOCKS_PATH, JSON.stringify({ turn, question, blocks: r.resolutions.map((x) => x.text) }) + "\n");
  appendFileSync(TURNS_PATH, JSON.stringify(row) + "\n");
  appendFileSync(TRANSCRIPT_PATH, `**Reader** (turn ${turn}, ${m.move}${m.target ? ` · ${m.target}` : ""}${phrasedBy === "mechanical" ? " · mechanical" : ""}): ${question}\n\n**The Fold**: ${answer.trim() || (error ? `_error: ${trim(error, 120)}_` : "_(no answer)_")}\n\n<sub>${refs.length ? `refs ${refs.slice(0, 4).join(", ")}${refs.length > 4 ? "…" : ""}` : "no refs"} · unsupported ${row.unsupported} · ${row.addressed === null ? "" : row.addressed ? "addressed" : "did not address the target"}${absent ? " · admits absence" : ""}${row.premises?.contradicted ? ` · contradicted ${row.premises.contradicted}` : ""}${row.answeredBeforeTheModel ? ` · before the model: ${row.answeredBeforeTheModel}` : ""}${row.position ? ` · position: ${row.position}` : ""}${row.turnAddressed?.some?.((a) => a.reasked) ? " · re-asked" : ""}${row.expectation?.authorship != null ? ` · authorship ${row.expectation.authorship}` : ""}${row.selfContradictions?.length ? ` · self-contradiction ${row.selfContradictions.length}` : ""} · history ${row.historyDepth} · ${row.calls} calls · ${(row.ms / 1000).toFixed(0)}s</sub>\n\n`);
  if (!error) { state.history.push({ role: "user", content: question }, { role: "assistant", content: answer }); state.transcript.push({ turn, question, answer, move: m.move, target: m.target ?? null, refs, claims, unsupported: row.unsupported }); }
  state.turn = turn; saveState();
  console.log(`[${turn}/${TURNS}] ${m.move.padEnd(8)} ${String(Math.round(row.ms / 1000)).padStart(4)}s ${String(row.calls).padStart(2)} calls  ${row.addressed === null ? "  " : row.addressed ? "✓ " : "✗ "}${cited ? "cited " : "      "}${absent ? "absent " : ""}${m.target ? `· ${trim(m.target, 24)} ` : ""}${phrasedBy === "mechanical" ? "(mech) " : ""}${trim(question, 70)}`);
  if (turn % 25 === 0) {
    const rows = readFileSync(TURNS_PATH, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const by = {};
    for (const x of rows) { const b = by[x.move] ??= { n: 0, addressed: 0, resolved: 0, cited: 0, mech: 0 }; b.n++; if (x.addressed) b.addressed++; if (x.resolved) b.resolved++; if (x.cited) b.cited++; if (x.phrasedBy === "mechanical") b.mech++; }
    const line = Object.entries(by).map(([k, b]) => `${k} ${b.n}: addressed ${b.addressed}, resolved ${b.resolved}, cited ${b.cited}${b.mech ? `, mech ${b.mech}` : ""}`).join(" | ");
    const auth = rows.map((x) => x.expectation?.authorship).filter((a) => a != null);
    console.log(`  — after ${turn}: ${line} | unsupported/answer ${(rows.reduce((a, x) => a + x.unsupported, 0) / rows.length).toFixed(2)} | contradicted ${rows.filter((x) => x.premises?.contradicted).length} | before-the-model ${rows.filter((x) => x.answeredBeforeTheModel).length} | re-asked ${rows.filter((x) => x.turnAddressed?.some?.((a) => a.reasked)).length} | positions ${rows.filter((x) => x.position).length} | self-contradictions ${rows.filter((x) => x.selfContradictions?.length).length} | authorship ${auth.length ? (auth.reduce((a, b) => a + b, 0) / auth.length).toFixed(2) : "—"} (${auth.length}) | history depth ${(rows.reduce((a, x) => a + (x.historyDepth ?? 0), 0) / rows.length).toFixed(1)} | ${(rows.reduce((a, x) => a + x.ms, 0) / rows.length / 1000).toFixed(0)}s/turn | resolutions ${RESOLUTIONS}: blocks/turn ${(rows.reduce((a, x) => a + ((x.resolutions ?? []).reduce((b, y) => b + (y.atmosphere ? 1 : 0) + (y.lens ? 1 : 0) + (y.paradigm ? 1 : 0), 0)), 0) / rows.length).toFixed(2)} | prompt tokens/turn ${(rows.reduce((a, x) => a + (x.promptTokens ?? 0), 0) / rows.length).toFixed(0)}, per call ${(rows.reduce((a, x) => a + (x.promptTokens ?? 0), 0) / Math.max(1, rows.reduce((a, x) => a + (x.calls ?? 0), 0))).toFixed(0)} | handed ${JSON.stringify(rows.reduce((a, x) => { for (const y of x.resolutions ?? []) a[y.handed ?? "passages"] = (a[y.handed ?? "passages"] ?? 0) + 1; return a; }, {}))} | retrieval ${JSON.stringify(rows.reduce((a, x) => { for (const y of x.retrieval ?? []) a[y.basis] = (a[y.basis] ?? 0) + 1; return a; }, {}))}, sentences/turn ${(rows.reduce((a, x) => a + (x.retrieval ?? []).reduce((b, y) => b + (y.window ?? 0), 0), 0) / rows.length).toFixed(1)}`);
  }
}
console.log(`done: ${TURNS} turns — ${DIR}`);
