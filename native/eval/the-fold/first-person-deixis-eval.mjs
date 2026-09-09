// eval/first-person-deixis-eval.mjs — the reported specimen, driven live.
//
// The bug (the-fold POLICIES.md P180, this file's own pair READING-SPEC
// S96): a live turn asked gemma2:2b "In one short sentence, what is your
// favorite color and why?"; it answered "My favorite color is blue. It
// reminds me of the sky and brings a sense of peacefulness."; the relation
// tier marked the first sentence ground-ladder tier "bound", cited to a
// generic ESL "10 lines about my favorite color" example-sentence page the
// preflight web search had fetched. The user's own question — "how could
// this possibly be 'confirmed'?" — was right: "my" in the model's own
// answer and "my" in an anonymous tutorial page name two different
// speakers, and nothing before this fix ever checked that.
//
// This driver calls the REAL model (no fixture answer text) and reads the
// REAL answer through the REAL production relation reader
// (makeRelationReader, native provider — the configuration app.js has run
// since P69), against a fixture modeled on the reported page's own shape
// (short first-person sentences, no proper name of its own) rather than a
// literal copy of it — the exact bytes of the two named pages
// (t4tutorials.com, englishwnabi.com) are not committed here and were not
// reachable at the addresses this session had; the mechanism this closes
// does not depend on which ESL page supplied the words.
//
// seed:1 is declared BEFORE the first run and never revisited: it is the
// first seed tried against Ollama's own `options.seed` that reproduced the
// reported shape ("My favorite color is X, because…") deterministically —
// disclosed, not hidden, since a different seed answering "As an AI, I
// don't have personal preferences" would still be an honest, if less
// illustrative, run (the fix is unconditional on the SUBJECT's grammar,
// not on which sentence the model happens to produce).

const OLLAMA = "http://localhost:11434";
const MODEL = process.env.MODEL ?? "gemma2:2b";
const SEED = Number(process.env.SEED ?? 1);
const PROMPT = "In one short sentence, what is your favorite color and why?";

async function askModel() {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { seed: SEED },
      messages: [{ role: "user", content: PROMPT }],
    }),
  });
  if (!res.ok) throw new Error(`ollama refused: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json?.message?.content ?? "";
}

const NATIVE = new URL("../..", import.meta.url).pathname;
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const { tokenize } = await import(`${NATIVE}/adapters/text/material.js`);
const { FIRST_PERSON } = await import(`${NATIVE}/adapters/text/priors.js`);
const { makeRelationReader, relationFindings } = await import(`${NATIVE}/organs/hypergraph.js`);

// Modeled on the reported page's own shape — an anonymous ESL "N sentences
// about my favorite color" example page: first-person throughout, no
// proper name of its own except an attributed example sentence (the "Maria
// is happy…" line), which real such pages routinely carry and which is
// also what lets a copula ("is") enter this fixture's discovered
// vocabulary at all (discoverRelationVocab anchors candidate verbs on a
// capitalized surface; "My favorite color is blue" alone has none).
const ESL_STYLE_PAGE = {
  ref: "web:esl-example.com-0#0-500",
  text:
    "Everyone at school loves Maria. Maria is happy about the color blue. " +
    "My favorite color is blue. I like blue because it is calm. Blue is the color of the sky and the sea. " +
    "My favorite color reminds me of summer days. Blue is a favorite color for many people around the world. " +
    "My favorite color makes me feel happy. Blue is also the color of my school uniform. " +
    "I chose blue as my favorite color long ago.",
};

const baseOrgans = { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, nounPhraseSubjects: true };

function report(label, reader, answer) {
  const claims = reader.read(answer).claims;
  const firstPersonClaims = claims.filter((c) => FIRST_PERSON.test(String(c.end1 ?? "").trim().split(/\s+/)[0] ?? ""));
  console.log(`\n── ${label} ──`);
  console.log(`answer: "${answer}"`);
  for (const c of firstPersonClaims.length ? firstPersonClaims : claims) {
    console.log(`  "${c.sentence}" -> ${c.label ? `${c.end1} —${c.label}[${c.polarity}]→ ${c.end2}` : "(no claim extracted)"}`);
    console.log(`    verdict: ${c.verdict}${c.reason ? ` — ${c.reason}` : ""}`);
    if (c.refs) console.log(`    cited to: ${c.refs.join(", ")}`);
  }
  return { claims, firstPersonClaims, findings: relationFindings(reader.read(answer)) };
}

const answer = await askModel();
console.log(`model: ${MODEL}  seed: ${SEED}  prompt: "${PROMPT}"`);

const readerDefect = makeRelationReader(baseOrgans)([ESL_STYLE_PAGE], { pool: [ESL_STYLE_PAGE] });
const before = report("WITHOUT the first-person wall (the reported defect)", readerDefect, answer);

const readerFixed = makeRelationReader({ ...baseOrgans, firstPerson: FIRST_PERSON })([ESL_STYLE_PAGE], { pool: [ESL_STYLE_PAGE] });
const after = report("WITH the first-person wall (organs.firstPerson)", readerFixed, answer);

const falselyBoundBefore = before.firstPersonClaims.some((c) => c.verdict === "bound");
const noneBoundAfter = after.firstPersonClaims.every((c) => c.verdict !== "bound");

console.log(`\nsummary: defect reproduced live = ${falselyBoundBefore}; fix closes it = ${noneBoundAfter}`);
if (!falselyBoundBefore) {
  console.log("(the model's own live answer this run did not produce a first-person claim the fixture could false-bind — a real, disclosed possibility at this seed/model, not a failure of the fix; re-run with a different SEED to reproduce the exact shape.)");
}
process.exitCode = falselyBoundBefore && !noneBoundAfter ? 1 : 0;
