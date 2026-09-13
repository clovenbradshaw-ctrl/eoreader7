// connector-witness.test.mjs — the module's own pure-logic cases, plus a
// LIVE adversarial control against the real house model (gemma2:2b via
// Ollama), skipped rather than failed when no Ollama is reachable (the
// same posture this repo's other live-model tests already hold).
//
// The live control is not a fixture: every specimen below is real text —
// four already came from a real digest run this session produced
// (live_priors' wikipedia-lang/el/socrates-related, pulled 2026-09-08) —
// with the ground truth stated BEFORE the ask, per this project's own
// standing rule (never tune, never rationalize after the fact).
import test from "node:test";
import assert from "node:assert/strict";
import {
  decoyTokenFor,
  buildConnectorMessages,
  foldConnectorVerdict,
  witnessConnector,
} from "./connector-witness.js";

test("decoyTokenFor: a real other token, never the label, never invented", () => {
  const s = "Bertrand Russell considered that philosophy lies between science and theology.";
  const d = decoyTokenFor(s, "considered");
  assert.ok(d && s.includes(d));
  assert.notEqual(d.toLowerCase(), "considered");
});

test("decoyTokenFor: honest null when nothing else is offered", () => {
  assert.equal(decoyTokenFor("είναι", "είναι"), null);
});

test("decoyTokenFor: works on a non-Latin script (no ASCII assumption)", () => {
  const s = "Μπέρτραντ Ράσελ θεώρησε πως η φιλοσοφία βρίσκεται μεταξύ της επιστήμης.";
  const d = decoyTokenFor(s, "θεώρησε");
  assert.ok(d);
  assert.ok(/\p{L}/u.test(d));
});

test("buildConnectorMessages: marks the span with guillemets, not asterisks", () => {
  const msgs = buildConnectorMessages("The cat sat on the mat.", "sat");
  assert.equal(msgs[1].content, "The cat «sat» on the mat.");
  assert.ok(!msgs.some((m) => m.content.includes("*")));
});

test("foldConnectorVerdict: refuses a shape it did not ask for", () => {
  assert.deepEqual(foldConnectorVerdict("not json"), { refused: "unreadable" });
  assert.deepEqual(foldConnectorVerdict({ functionsAsVerb: "maybe" }), { refused: "unreadable" });
  assert.deepEqual(foldConnectorVerdict({ functionsAsVerb: "yes" }), { verdict: "yes" });
});

test("witnessConnector: refuses when the label is not literally in the sentence (no guessed address)", async () => {
  const r = await witnessConnector({ label: "flew" }, "The cat sat on the mat.", { ask: async () => ({ functionsAsVerb: "yes" }) });
  assert.equal(r.settled, false);
  assert.equal(r.givers.refused, "no-sentence-context");
});

test("witnessConnector: an unarmed no is trusted directly, no decoy spent", async () => {
  let calls = 0;
  const ask = async () => { calls++; return { functionsAsVerb: "no" }; };
  const r = await witnessConnector({ label: "the" }, "The cat sat on the mat.", { ask });
  assert.equal(r.settled, true);
  assert.equal(r.thraxClass, "not-verb");
  assert.equal(calls, 1);
});

test("witnessConnector: an indiscriminate yes (real=yes, decoy=yes) is refused, not trusted", async () => {
  const ask = async () => ({ functionsAsVerb: "yes" });
  const r = await witnessConnector({ label: "sat", end1: "cat", end2: "mat" }, "The cat sat on the mat.", { ask, decoyFor: () => "cat" });
  assert.equal(r.settled, false);
  assert.equal(r.givers.refused, "indiscriminate");
});

test("witnessConnector: a discriminating yes (real=yes, decoy=no) settles verb", async () => {
  const ask = async (msgs) => ({ functionsAsVerb: msgs[1].content.includes("«sat»") ? "yes" : "no" });
  const r = await witnessConnector({ label: "sat", end1: "cat", end2: "mat" }, "The cat sat on the mat.", { ask, decoyFor: () => "cat" });
  assert.equal(r.settled, true);
  assert.equal(r.thraxClass, "verb");
  assert.equal(r.givers.armed, true);
});

test("witnessConnector: no decoy available is a disclosed gap, never a guessed verdict", async () => {
  const ask = async () => ({ functionsAsVerb: "yes" });
  const r = await witnessConnector({ label: "είναι" }, "είναι", { ask });
  assert.equal(r.settled, false);
  assert.equal(r.givers.refused, "no-decoy-available");
});

// ── the live adversarial control ─────────────────────────────────────────
// Ground truth, declared BEFORE any ask runs (II.23's own discipline —
// nothing below was adjusted after seeing the model's answers).
//
// English POSITIVE (from a treebank-gated real digest, this session,
// the-fold's own hypergraph.js reading rails/README.md): genuine verbs
// the POS-vocabulary gate already confirmed independently.
// English NEGATIVE: a genuine English sentence with a preposition/article
// mislabeled as the candidate connector — exactly the shape a
// position-based extractor produces without a gate.
// Greek POSITIVE/NEGATIVE: pulled from live_priors' real
// wikipedia-lang/el/socrates-related digest, this session, BEFORE this
// organ existed — the 59-junk-edges specimen the whole build is answering.
// Every specimen below is real verbatim text pulled from live_priors'
// actual digest output this session (English/Greek/Turkish — the three
// languages in the sample that yielded enough material to test against;
// Hebrew and Korean did not: scriptCoverage's own already-diagnosed
// caseless-script gap left them at 2 and 6 total propositions, most of
// which are English citation-apparatus bleed-through rather than the
// article's own text — untestable for THIS mechanism, a different limit,
// not something this organ's own miss count below should absorb).
// Ground truth is declared here, before the live run, per this project's
// own standing rule (never adjust a control after seeing the answer).
// Turkish is deliberately a DIFFERENT failure shape from Greek's bare
// function words — agglutinative case/postposition suffixes riding on
// content stems ("tarafından" = "by", "hakim" = "dominant" (adj), "kadar"
// = "until") — a genuinely different kind of non-verb, not just another
// instance of the same one, per P71's generality gate.
const SPECIMENS = [
  // English — rails-readme + the "de-path" source that is actually real
  // English prose mislabeled by the corpus's own fetch script (Winnie-the-
  // Pooh, digested/CORPUS-INTEGRITY-FINDING.md's own disclosed finding) —
  // real clean verbs from real clean prose.
  { lang: "en", sentence: "Ruby on Rails is released under the [MIT License](https://opensource.org/licenses/MIT).", label: "is released", truth: "verb" },
  { lang: "en", sentence: "Incoming requests are routed by Action Dispatch to an appropriate controller.", label: "routed", truth: "verb" },
  { lang: "en", sentence: "Winnie-the-Pooh sat down at the foot of the tree, put his head between his paws and began to think.", label: "sat", truth: "verb" },
  { lang: "en", sentence: "Christopher Robin rushes into its arms.", label: "rushes", truth: "verb" },
  { lang: "en", sentence: "So when Christopher Robin goes to the Zoo, he goes to where the Polar Bears are.", label: "goes", truth: "verb" },
  { lang: "en", sentence: "Discussion in the Mission Operations Control Room (MOCR) dealing with the Apollo 13 crewmen during their final day in space.", label: "with", truth: "not-verb" },
  { lang: "en", sentence: "Most Rails models are backed by a database.", label: "by", truth: "not-verb" },
  { lang: "en", sentence: "Winnie-the-Pooh sat down at the foot of the tree, put his head between his paws and began to think.", label: "of", truth: "not-verb" },
  // Greek — wikipedia-lang/el/socrates-related, the 59-junk-edges specimen this organ answers.
  { lang: "el", sentence: "Ο Μπέρτραντ Ράσελ θεώρησε πως η φιλοσοφία βρίσκεται μεταξύ της Επιστήμηεπιστήμης, που αποτελεί βέβαιη γνώση, και της Θεολογίαθεολογίας, που αποτελεί δόγμα, διατυπώνοντας παράλληλα τη θέση πως η φιλοσοφία είναι μια αστείρευτη δεξαμενή γνώσεων.", label: "θεώρησε", truth: "verb" },
  { lang: "el", sentence: "Αυτά τα στάδια είναι εκείνα της Παρατηρήσεως.", label: "είναι", truth: "verb" },
  { lang: "el", sentence: "Αισθητική ονομάζεται ο τομέας που ασχολείται με τη μελέτη και αντίληψη της ομορφιάς, της Τέχνης, της αναψυχής, θεμάτων γούστου και αισθημάτων, γενικώς με τον ορισμό του ωραίου, του αρμονικού και των αντιστρόφων τους.", label: "ο", truth: "not-verb" },
  { lang: "el", sentence: "Δεν θα ήταν λάθος να πούμε ότι φιλοσοφία είναι σκέψη πάνω στην ίδια τη σκέψη και τις δυνατότητές της.", label: "φιλοσοφία", truth: "not-verb" },
  { lang: "el", sentence: "Η φιλοσοφία μάς ανοίγει νέους δρόμους και αναζητά απαντήσεις σε ερωτήματα που πιθανώς ξεπερνούν τις ανθρώπινες γνωστικές δυνατότητες, βοηθώντας στη διερεύνηση των ορίων της ανθρώπινης σκέψης, ακόμα και όταν δεν φτάνει σε κάποιο αποτέλεσμα ο επαγωγικός της προβληματισμός.", label: "και", truth: "not-verb" },
  // Turkish — wikipedia-lang/tr/felsefe, agglutinative case/postposition suffixes standing in for a verb.
  { lang: "tr", sentence: "yüzyılda Milet'te yaşamış Thales'e kadar uzanır.", label: "yaşamış", truth: "verb" },
  { lang: "tr", sentence: "Bu öğretiler erken budist metinler tarafından muhafaza edilmiştir.", label: "tarafından", truth: "not-verb" },
  { lang: "tr", sentence: "Batı felsefesi tarihi; Greko-RomenYunan-Roma kültürünün hakim olduğu Antik Çağ felsefesi.", label: "hakim", truth: "not-verb" },
  { lang: "tr", sentence: "Bu filozoflar aynı zamanda bir şairdir ve aslen NahuatlNahuatl dilindeki eserlerinin bir kısmı, çeşitli Aztek el yazmaları tarafından muhafaza edilmiş, günümüze kadar ulaşmıştır.", label: "kadar", truth: "not-verb" },
];

/** Exact one-sided binomial P(X >= k | n, p=0.5) — the same posture this
 * project holds every pass/fail null to (P172: a stated rate, computed as
 * arithmetic, never approximated, never a hand-picked N-of-M threshold). */
function exactBinomialTailAtHalf(k, n) {
  let choose = 1n, sum = 0n;
  const total = 1n << BigInt(n); // 2^n
  for (let i = 0; i <= n; i++) {
    if (i >= k) sum += choose;
    choose = (choose * BigInt(n - i)) / BigInt(i + 1);
  }
  return Number(sum) / Number(total);
}

const OLLAMA = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const MODEL = process.env.WITNESS_MODEL ?? "gemma2:2b";

async function ollamaReachable() {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

async function askOllama(messages) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, messages, stream: false, options: { temperature: 0 },
      format: { type: "object", properties: { functionsAsVerb: { type: "string", enum: ["yes", "no"] } }, required: ["functionsAsVerb"] },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const body = await res.json();
  return body.message?.content ?? "";
}

test("LIVE — the connector witness against gemma2:2b, real bytes, three languages, exact significance (not a hand-picked bar)", async (t) => {
  if (!(await ollamaReachable())) { t.skip("no Ollama reachable at " + OLLAMA); return; }
  // State the configuration beside the number (this project's own standing
  // rule) — one run, one model, temperature 0, no retry.
  console.log(`  configuration: model=${MODEL} temperature=0 specimens=${SPECIMENS.length} (en=${SPECIMENS.filter(s=>s.lang==="en").length} el=${SPECIMENS.filter(s=>s.lang==="el").length} tr=${SPECIMENS.filter(s=>s.lang==="tr").length}), single run`);
  const results = [];
  for (const spec of SPECIMENS) {
    const r = await witnessConnector({ label: spec.label }, spec.sentence, { ask: askOllama });
    results.push({ ...spec, got: r.settled ? r.thraxClass : `unsettled(${r.givers.refused})` });
  }
  for (const r of results) console.log(`  [${r.lang}] "${r.label}" truth=${r.truth} got=${r.got}${r.got !== r.truth ? "  <-- MISS" : ""}`);
  const settled = results.filter((r) => !r.got.startsWith("unsettled"));
  const correct = results.filter((r) => r.got === r.truth).length;
  // Exact one-sided binomial tail against chance (p=0.5), over every
  // specimen this organ actually settled — never approximated, never a
  // fixed N-of-M bar chosen to make this pass. This is the number to
  // trust, not a pass/fail line invented after the fact.
  const p = exactBinomialTailAtHalf(correct, results.length);
  console.log(`  ${correct}/${results.length} correct (${settled.length}/${results.length} settled) — P(this good by chance) = ${p.toFixed(5)}`);
  // The only thing asserted mechanically: the organ must actually SETTLE
  // most specimens (an always-refusing gate silently admits everything,
  // which is the exact failure this exists to fix) and the exact test must
  // clear a conventional 0.05, computed, not assumed.
  assert.ok(settled.length >= results.length * 0.7, `too many unsettled: ${settled.length}/${results.length}`);
  assert.ok(p < 0.05, `not significantly better than chance: P=${p.toFixed(5)} on ${correct}/${results.length}`);
});
