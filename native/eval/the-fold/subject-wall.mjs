// subject-wall.mjs — floor 2 for floor 5: does walling the extractor's
// subject span with RECEIVED classes make the ledger's ends real, and is
// the gain from WHICH tokens or merely from cutting shorter?
//
// Three arms on the same material and the same reader:
//   legacy  — the pre-wall DR4 walk (subjectWalls: false), byte-identical
//             to what the production reader shipped before 2026-09-02
//   walls   — the received walls: SUBJECT_PRONOUNS, CLAUSE_OPENERS as a
//             trailing trim, NEGATION_WORDS as a trailing trim, the
//             vocabulary's own verbs through a coordinator
//   random  — THE CONTROL (II.23, object-boundary.mjs's own precedent):
//             the same walls with each received class replaced by the same
//             NUMBER of tokens drawn at random from the material's own
//             vocabulary (seeded). If cutting is what helps, this arm helps
//             as much; if the classes are what help, it does not.
//
// Measured per arm: bound arrangements; debris classes on end1 (lone
// function word; led by a function word; over eight tokens; a name glued to
// a common noun on its left); the REFERENT RATE — how many bound claims'
// subject resolved to an earned referent face (hypergraph's own
// `endpoints.subject === "referent"`), which is what floor 5 needs, since a
// note whose end is debris can never be corroborated by anything.
//
// Materials: a 120KB slice of the real Gutenberg Dracula (narrative prose,
// the material the debris was found on) and the committed Battle of
// Borodino page (encyclopedic prose). Declared: seed 7 for the control.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { lcg } = await import(`${NATIVE}/kernel/continuation.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const relations = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));
const SEED = 7;

const FN = new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS, ...P.POSSESSIVE_DETERMINERS, ...P.CLAUSE_OPENERS, ...P.CLAUSE_COORDINATORS, ...P.NEGATION_WORDS, "of", "in", "on", "at", "to", "for", "with", "by", "from", "as", "he", "she", "it", "they", "i", "we", "you", "there", "then", "when", "where", "while"]);
const debrisClass = (s) => {
  const w = s.trim().split(/\s+/);
  const first = w[0].toLowerCase().replace(/^\W+/, "");
  if (w.length === 1 && FN.has(first)) return "lone function word";
  if (FN.has(first) && !/^(the|a|an|his|her|their|my|its|some|our|your)$/i.test(first)) return "led by a function word";
  if (w.length > 8) return "over eight tokens";
  if (w.length >= 2 && /^[a-z]/.test(w[w.length - 2]) && /^\p{Lu}/u.test(w[w.length - 1]) && !/^(the|a|an|his|her|their|my|its|some|dear|poor|old|young|little)$/i.test(w[w.length - 2])) return "common noun glued to a name";
  return "ok";
};

/** An extractRelations whose closed classes are replaced by random vocabulary tokens of the same sizes. */
function randomised(vocabWords) {
  const rng = lcg(SEED);
  const pick = (n) => { const out = new Set(); while (out.size < n && out.size < vocabWords.length) out.add(vocabWords[Math.floor(rng() * vocabWords.length)]); return out; };
  const subjectPronouns = pick(P.SUBJECT_PRONOUNS.size), clauseOpeners = pick(P.CLAUSE_OPENERS.size), negationWords = pick(P.NEGATION_WORDS.size);
  // the two prior-derived walls are randomised at their own sizes too (the
  // reader passes verbWall/adpositions in `opts`; they are replaced here)
  const sized = (set) => pick(set?.size ?? 0);
  return (text, opts) => relations.extractRelations(text, { ...opts, nounPhraseSubjects: true, subjectWalls: true, negationWords, subjectPronouns, clauseOpeners, verbWall: sized(opts.verbWall), adpositions: sized(opts.adpositions) });
}

function armReader(arm, vocabWords) {
  const extract = arm === "random" ? randomised(vocabWords) : (text, opts) => relations.extractRelations(text, { ...opts, subjectWalls: arm === "walls" });
  return makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab: relations.discoverRelationVocab, extractRelations: extract, tokenize,
    posPriorFor: () => posPrior,
    determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
    negationWords: P.NEGATION_WORDS,
    blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
    resolvePronouns, nounPhraseSubjects: true,
  });
}

function measure(name, text) {
  const chunks = chunkSource(`${name}.txt`, text);
  const vocabWords = [...new Set(text.toLowerCase().match(/\p{L}{3,}/gu) ?? [])];
  const rows = {};
  for (const arm of ["legacy", "walls", "random"]) {
    const rel = armReader(arm, vocabWords)(chunks, { pool: chunks });
    const tally = { ok: 0 }; let bound = 0, referent = 0, form = 0; const examples = {};
    for (const c of chunks) for (const k of (rel.read(c.text)?.claims ?? [])) {
      if (k.verdict !== "bound") continue;
      bound += 1;
      const cls = debrisClass(k.end1); tally[cls] = (tally[cls] ?? 0) + 1;
      if (cls !== "ok" && (examples[cls] ??= []).length < 4) examples[cls].push(k.end1);
      if (k.endpoints?.subject === "referent") referent += 1;
      if (k.endpoints?.subject === "form") form += 1;
    }
    rows[arm] = { bound, referent, form, tally, examples };
  }
  return rows;
}

const say = (s) => console.log(s);
say(`# Subject walls — floor 2 for floor 5 (${new Date().toISOString().slice(0, 10)})`);
say(`Control seed ${SEED}; every received class randomised at its own size from the material's own words (${P.SUBJECT_PRONOUNS.size} pronouns, ${P.CLAUSE_OPENERS.size} openers, ${P.NEGATION_WORDS.size} negations, and the POS prior's verb and adposition forms).`);
const out = {};
// The book is the sibling `live_priors` clone's Gutenberg Dracula (object-
// boundary.mjs's own resolution), `BOOK=` to point elsewhere. The 2026-09-05
// audit found this path pinned to another machine's home directory
// (`/home/user/live_priors/…`) — the doc's run was unreproducible from any
// other checkout by construction, and the crash was an ENOENT stack, not a
// statement. Absent, the driver REFUSES with a typed gap (P95/S65).
const BOOK = process.env.BOOK ?? `${NATIVE}/../../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt`;
if (!existsSync(BOOK)) {
  console.error(`REFUSED (fixture_absent): the Dracula slice is read from ${BOOK}, which this checkout lacks — set BOOK= to the Gutenberg pg345 text. A fact about the checkout, not the material; results/subject-wall.json is reproducible only where the book exists.`);
  process.exit(2);
}
const materials = [
  ["dracula-200-320KB", readFileSync(BOOK, "utf8").replace(/\r\n/g, "\n").slice(200000, 320000)],
  ["battle-of-borodino", (() => { const f = extractReadable(readFileSync(`${FIX}/wikipedia-battle-of-borodino.html`, "utf8")); return typeof f === "string" ? f : f.text; })()],
];
for (const [name, text] of materials) {
  const t0 = Date.now();
  const rows = measure(name, text);
  out[name] = rows;
  say(`\n## ${name} (${text.length} chars, ${Date.now() - t0}ms)`);
  say("| arm | bound | subject = referent | subject = form | debris (any class) | lone fn word | led by fn word | >8 tokens | noun glued to name |");
  say("|---|---|---|---|---|---|---|---|---|");
  for (const arm of ["legacy", "walls", "random"]) {
    const r = rows[arm]; const t = r.tally; const debris = r.bound - (t.ok ?? 0);
    say(`| ${arm} | ${r.bound} | ${r.referent} (${(100 * r.referent / r.bound).toFixed(0)}%) | ${r.form} | ${debris} (${(100 * debris / r.bound).toFixed(0)}%) | ${t["lone function word"] ?? 0} | ${t["led by a function word"] ?? 0} | ${t["over eight tokens"] ?? 0} | ${t["common noun glued to a name"] ?? 0} |`);
  }
  for (const arm of ["legacy", "walls"]) for (const [cls, ex] of Object.entries(rows[arm].examples)) say(`- ${arm} · ${cls}: ${ex.map((s) => JSON.stringify(s)).join(", ")}`);
}
writeFileSync(new URL("./results/subject-wall.json", import.meta.url), JSON.stringify({ seed: SEED, results: out }, null, 2));
say("\nRaw numbers: results/subject-wall.json");
