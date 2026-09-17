import test from "node:test";
import assert from "node:assert/strict";
import { claimKindsOf, FORMS, REGISTERS, OUTPUT_CLAIMS_SCHEMA, claimKindTriggerGap, OUTPUT_CLAIMS_LANGUAGE } from "./output-claims.js";
import { splitSentences } from "../adapters/text/spans.js";

const src = "source.txt";

// ── THE ARCHITECTONIC: one derived form, two registers ─────────────────────
// The four gathered kinds were an illusion: causal + conditional are ONE
// form (the hypothetical, ground/consequence); temporal is the form of inner
// sense (the sequence), never a kind; utterance is the testimony register, a
// relation between persons. Every entry carries `form` (derived) + `image`
// (the material's trigger word) + language — the bytes certify the image,
// never the form.

test("the hypothetical form is one: causal and conditional collapse into it, side typed", () => {
  const { forms } = claimKindsOf("Napoleon crossed the Niemen, so that the war began. The army retreated because of the cold.", { splitSentences, source: src });
  assert.equal(forms.length, 2, "both hypothetical sentences earned");
  const bySide = Object.fromEntries(forms.map((f) => [f.side, f]));
  assert.equal(bySide.consequent.image, "so that", "the consequence side carries its image");
  assert.equal(bySide.ground.image, "because", "the ground side carries its image");
  assert.equal(bySide.consequent.form, "hypothetical");
  assert.equal(bySide.consequent.language, "en");
  assert.equal(bySide.consequent.ref, src);
  assert.ok(bySide.consequent.span.start >= 0 && bySide.consequent.span.end > bySide.consequent.span.start, "span reads back as its own bytes");
});

test("if/unless and counterfactuals earn the same hypothetical form", () => {
  const { forms } = claimKindsOf("Had the French not crossed the river, the war would have been different.", { splitSentences, source: src });
  assert.ok(forms.length >= 1, "the counterfactual earns the hypothetical");
  assert.ok(forms.every((f) => f.form === "hypothetical"));
  assert.ok(forms.some((f) => f.side === "ground"), "the counterfactual's had…would is a ground image");
});

test("the sequence is a register, not a kind: first/then/afterward, with positions", () => {
  const { forms, sequence } = claimKindsOf("First the army marched, then they camped, afterward the battle began.", { splitSentences, source: src });
  assert.equal(forms.length, 0, "no logical form here — only the order");
  assert.ok(sequence.length >= 1, "the sequence register earns the order");
  assert.equal(sequence[0].form, "sequence");
  assert.ok(/first/i.test(sequence[0].position), `the position names the ordering word (got "${sequence[0].position}")`);
  assert.ok(sequence[0].image, "the sequence carries its image (the ordering word)");
});

test("the testimony register requires quoted words and binds the speaker", () => {
  const { forms, testimony } = claimKindsOf('Prince Andrew said: "A man\'s dignity is his own." "I know nothing of them," replied Pierre.', { splitSentences, source: src });
  assert.equal(forms.length, 0, "testimony is not a logical form");
  assert.equal(testimony.length, 2);
  assert.ok(testimony[0].quoted, "the first carries its quoted words");
  assert.match(testimony[0].quoted, /dignity/);
  assert.equal(testimony[1].speaker, "Pierre", "the second binds its speaker");
  assert.equal(testimony[0].form, "testimony");
});

test("a sentence with no image earns nothing — silence is a fact about the material", () => {
  const { forms, sequence, testimony } = claimKindsOf("The moon rose over the field at night.", { splitSentences, source: src });
  assert.equal(forms.length, 0);
  assert.equal(sequence.length, 0);
  assert.equal(testimony.length, 0);
});

// ── OMNILINGUAL (S39): the same core, specialized by the language's own ────
// images. A language with no registered image set is a typed gap, never a
// silent English match.

test("HEBREW: the WLC Tanakh's own connectives earn the form and the registers under lang/heb", () => {
  // Real conventions measured from 2Sam: כי (because), לכן (therefore),
  // אז (then), אם (if), אמר (said). The testimony needs the quoted words —
  // real dialogue, as the Tanakh writes it.
  const heb = "וַיֹּאמֶר דָּוִד: «כִּי מֵת שָׁאוּל» אִם שָׁאוּל מֵת, אָז יִמְלֹךְ דָּוִד.";
  // no splitSentences for Hebrew — the English splitter mangles it; the
  // organ reads the sentence whole (the same S39 honest boundary: a splitter
  // for another language is the adapter's to supply, never a silent English
  // one forced onto the material).
  const { forms, sequence, testimony, gap } = claimKindsOf(heb, { source: "2Sam.txt", language: "heb" });
  assert.equal(gap, null, "Hebrew has a registered image set");
  const sides = forms.map((f) => f.side);
  assert.ok(sides.includes("ground"), `by כי/אם — the hypothetical, ground side (got ${sides.join(",")})`);
  assert.ok(sequence.some((s) => s.image === "אָז" || s.image === "אז"), `by אז — the sequence`);
  assert.ok(testimony.some((t) => t.image === "וַיֹּאמֶר" || t.image === "אמר"), `by אמר with «» quotes — testimony`);
  assert.equal(forms[0].language, "heb");
});

test("GREEK: Homer's own connectives earn the form and the registers under lang/grc", () => {
  // Real conventions measured from the Iliad: εἰ (if), ἐπεί (since),
  // πρῶτον (first), ἔφη (said) — the testimony carries quoted words.
  const grc = "ἔφη ὁ Ἀχιλλεύς· «εἰ δὲ Ἀγαμέμνων ἄγοι, πρῶτον ἂν μάχην ἐποίησε.» ἐπεὶ δ' ἦλθον, οὖν ἔμειναν.";
  const { forms, sequence, testimony, gap } = claimKindsOf(grc, { source: "homer-iliad.txt", language: "grc" });
  assert.equal(gap, null, "Greek has a registered image set");
  assert.ok(forms.length >= 1, `by εἰ/ἐπεί — the hypothetical (got ${forms.map((f) => f.image).join(",")})`);
  assert.ok(forms.some((f) => f.side === "consequent"), `by οὖν — consequent side`);
  assert.ok(sequence.some((s) => s.image === "πρῶτον" || s.image === "πρωτον"), `by πρῶτον — the sequence`);
  assert.ok(testimony.some((t) => t.image === "ἔφη" || t.image === "εφη"), `by ἔφη with «» quotes — testimony`);
});

test("LATIN: the corpus's own connectives earn the form and the registers under lang/la", () => {
  const la = 'Dixit Caesar: «si hostes transissent, bellum coepisset.» Primum milites processerunt, deinde pugna incepit.';
  const { forms, sequence, testimony, gap } = claimKindsOf(la, { source: "latin.txt", language: "la" });
  assert.equal(gap, null, "Latin has a registered image set");
  assert.ok(testimony.some((t) => t.image === "Dixit" || t.image === "dixit"), `by Dixit with «» quotes — testimony`);
  assert.ok(forms.some((f) => f.side === "ground"), `by si — hypothetical, ground side`);
  assert.ok(sequence.length >= 1, `by primum/deinde — the sequence`);
});

test("an UNREGISTERED language is a typed gap, never a silent English match", () => {
  const { forms, gap } = claimKindsOf("Because the moon rose, then it was night.", { splitSentences, source: src, language: "xx" });
  assert.equal(forms.length, 0, "no silent English match on an unregistered language");
  assert.ok(gap, "a typed gap is returned");
  assert.equal(gap.type, "no_claim_image_prior");
  assert.equal(claimKindTriggerGap("grc"), null, "a registered language resolves");
  assert.equal(OUTPUT_CLAIMS_LANGUAGE, "en", "the default language is declared");
});

test("the schema is declared and the derived table is named", () => {
  assert.equal(OUTPUT_CLAIMS_SCHEMA, "OutputClaims@2");
  assert.deepEqual(FORMS, ["hypothetical"], "one derived logical form — causal and conditional were one all along");
  assert.deepEqual(REGISTERS, ["sequence", "testimony"], "the sequence (inner sense) and the testimony (a practical register)");
});