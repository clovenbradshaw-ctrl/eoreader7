import test from "node:test";
import assert from "node:assert/strict";
import { claimKindsOf, KINDS, OUTPUT_CLAIMS_SCHEMA, claimKindTriggerGap, OUTPUT_CLAIMS_LANGUAGE } from "./output-claims.js";
import { splitSentences } from "../adapters/text/spans.js";

const src = "source.txt";

test("causal claims are earned from the material's own because/so-that connectives", () => {
  const { kinds } = claimKindsOf("Napoleon crossed the Niemen, so that the war began. The army retreated because of the cold.", { splitSentences, source: src });
  const causal = kinds.filter((k) => k.kind === "causal");
  assert.equal(causal.length, 2, "both causal sentences earned");
  assert.ok(causal[0].trigger === "so that" || causal[0].trigger === "because");
  assert.equal(causal[0].ref, src);
  assert.ok(causal[0].span.start >= 0 && causal[0].span.end > causal[0].span.start, "span reads back as its own bytes");
});

test("temporal claims carry their position (first/then/afterward)", () => {
  const { kinds } = claimKindsOf("First the army marched, then they camped, afterward the battle began.", { splitSentences, source: src });
  const temporal = kinds.filter((k) => k.kind === "temporal");
  assert.ok(temporal.length >= 1, "the connective earns a temporal kind");
  assert.ok(/first/i.test(temporal[0].position), `the position names the ordering word (got "${temporal[0].position}")`);
});

test("utterance claims require quoted words and bind the speaker", () => {
  const { kinds } = claimKindsOf('Prince Andrew said: "A man\'s dignity is his own." "I know nothing of them," replied Pierre.', { splitSentences, source: src });
  const utterances = kinds.filter((k) => k.kind === "utterance");
  assert.equal(utterances.length, 2);
  assert.ok(utterances[0].quoted, "the first carries its quoted words");
  assert.match(utterances[0].quoted, /dignity/);
  assert.equal(utterances[1].speaker, "Pierre", "the second utterance binds its speaker");
});

test("conditional claims are earned from if/unless/would-have", () => {
  const { kinds } = claimKindsOf("Had the French not crossed the river, the war would have been different.", { splitSentences, source: src });
  const conditional = kinds.filter((k) => k.kind === "conditional");
  assert.equal(conditional.length, 1);
});

test("a sentence with no trigger earns nothing — silence is a fact about the material", () => {
  const { kinds } = claimKindsOf("The moon rose over the field at night.", { splitSentences, source: src });
  assert.equal(kinds.length, 0);
});

// ── OMNILINGUAL (S39): the same core, specialized by the language's own ────
// conventions. A language with no registered trigger set is a typed gap,
// never a silent English match.

test("HEBREW: the WLC Tanakh's own connectives earn the four kinds under lang/heb", () => {
  // Real conventions measured from 2Sam: כי (because), לכן (therefore),
  // אז (then), אם (if), אמר (said). The utterance needs the quoted words —
  // real dialogue, as the Tanakh writes it.
  const heb = "וַיֹּאמֶר דָּוִד: «כִּי מֵת שָׁאוּל» אִם שָׁאוּל מֵת, אָז יִמְלֹךְ דָּוִד.";
  // no splitSentences for Hebrew — the English splitter mangles it; the
  // organ reads the sentence whole (the same S39 honest boundary: a splitter
  // for another language is the adapter's to supply, never a silent English
  // one forced onto the material).
  const { kinds, gap } = claimKindsOf(heb, { source: "2Sam.txt", language: "heb" });
  assert.equal(gap, null, "Hebrew has a registered trigger set");
  const types = kinds.map((k) => k.kind);
  assert.ok(types.includes("causal"), `by כי — causal (got ${types.join(",")})`);
  assert.ok(types.includes("conditional"), `by אם — conditional`);
  assert.ok(types.some((k) => k === "temporal"), `by אז — temporal`);
  assert.ok(types.includes("utterance"), `by אמר with «» quotes — utterance`);
});

test("GREEK: Homer's own connectives earn the kinds under lang/grc", () => {
  // Real conventions measured from the Iliad: εἰ (if), ἐπεί (since),
  // πρῶτον (first), ἔφη (said) — the utterance carries quoted words.
  const grc = "ἔφη ὁ Ἀχιλλεύς· «εἰ δὲ Ἀγαμέμνων ἄγοι, πρῶτον ἂν μάχην ἐποίησε.» ἐπεὶ δ' ἦλθον, οὖν ἔμειναν.";
  const { kinds, gap } = claimKindsOf(grc, { source: "homer-iliad.txt", language: "grc" });
  assert.equal(gap, null, "Greek has a registered trigger set");
  const types = kinds.map((k) => k.kind);
  assert.ok(types.includes("conditional"), `by εἰ — conditional (got ${types.join(",")})`);
  assert.ok(types.includes("causal"), `by ἐπεὶ/οὖν — causal`);
  assert.ok(types.some((k) => k === "temporal"), `by πρῶτον — temporal`);
  assert.ok(types.includes("utterance"), `by ἔφη with «» quotes — utterance`);
});

test("LATIN: the corpus's own connectives earn the kinds under lang/la", () => {
  const la = 'Dixit Caesar: «si hostes transissent, bellum coepisset.» Primum milites processerunt, deinde pugna incepit.';
  const { kinds, gap } = claimKindsOf(la, { source: "latin.txt", language: "la" });
  assert.equal(gap, null, "Latin has a registered trigger set");
  const types = kinds.map((k) => k.kind);
  assert.ok(types.includes("utterance"), `by Dixit with «» quotes — utterance`);
  assert.ok(types.includes("conditional"), `by si — conditional`);
  assert.ok(types.some((k) => k === "temporal"), `by primum/deinde — temporal`);
});

test("an UNREGISTERED language is a typed gap, never a silent English match", () => {
  const { kinds, gap } = claimKindsOf("Because the moon rose, then it was night.", { splitSentences, source: src, language: "xx" });
  assert.equal(kinds.length, 0, "no silent English match on an unregistered language");
  assert.ok(gap, "a typed gap is returned");
  assert.equal(gap.type, "no_claim_trigger_prior_for_language");
  assert.equal(claimKindTriggerGap("grc"), null, "a registered language resolves");
  assert.equal(OUTPUT_CLAIMS_LANGUAGE, "en", "the default language is declared");
});

test("the schema is declared and every kind is named", () => {
  assert.equal(OUTPUT_CLAIMS_SCHEMA, "OutputClaims@1");
  assert.deepEqual(KINDS, ["causal", "temporal", "utterance", "conditional"]);
});