// eot-rich.test.mjs — THE FALSIFICATION TIER for two laws:
//
//   "the cube is a taxonomically complete grammar: every category any
//    language marks has an address in it" (kernel/universal-grammar.js)
//
//   "a sentence can go into the rich EOT and come back out without losing
//    meaning; what is lost is only order, and order is kept as provenance"
//    (kernel/eot-rich.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CELL_OF_GRAMMAR } from "./cube.js";
import { taxonomyGaps, addressOfFeature, addressOfRelation, addressOfUpos, cellCoverage, UD_FEATURES, FORM_FEATURES } from "./universal-grammar.js";
import { parseConllu, toEot, surfaceBytes, annotationFromMeaning, goldRows, measureOrder, linearize, kendallTau } from "./eot-rich.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "..", "eval", "fixtures");

// ── the taxonomy ────────────────────────────────────────────────────────────

test("TAXONOMICALLY COMPLETE: the whole UD v2 inventory has a cube address", () => {
  assert.deepEqual(taxonomyGaps(), [], "an item in the universal inventory has no place in the cube");
});

test("a measured entry is never overridden by a declared one", () => {
  for (const [dim, values] of Object.entries(CELL_OF_GRAMMAR)) {
    for (const [v, [op, grain]] of Object.entries(values)) {
      const a = addressOfFeature(dim, v);
      assert.equal(a.cell, `${op}·${grain}`, `${dim}=${v} moved away from its measured cell`);
      assert.equal(a.basis, "measured");
    }
  }
});

test("a surface feature describes form and never takes a meaning cell", () => {
  for (const dim of FORM_FEATURES) {
    const a = addressOfFeature(dim, "Yes");
    assert.equal(a.form, true, `${dim} was given a meaning cell`);
    assert.equal(a.cell, undefined);
  }
});

test("every declared placement carries its reason — nothing passes as more than it is", () => {
  for (const [dim, values] of Object.entries(UD_FEATURES)) {
    for (const v of values) {
      const a = addressOfFeature(dim, v);
      if (a.basis === "declared") assert.ok(a.reason, `${dim}=${v} is declared with no reason`);
    }
  }
});

test("a layered feature keeps its layer and its dimension's cell", () => {
  const plain = addressOfFeature("Number", "Plur");
  const psor = addressOfFeature("Number[psor]", "Plur");
  assert.equal(psor.cell, plain.cell);
  assert.equal(psor.layer, "psor");
});

test("a relation subtype takes its universal relation's cell and keeps the subtype", () => {
  const a = addressOfRelation("nmod:poss");
  assert.equal(a.cell, addressOfRelation("nmod").cell);
  assert.equal(a.subtype, "poss");
  assert.equal(addressOfRelation("not-a-relation"), null, "an unknown relation must be a gap, never a default");
  assert.equal(addressOfUpos("NOT"), null);
});

test("the taxonomy reaches most of the cube, and says which cells no grammar reaches", () => {
  const cov = cellCoverage();
  assert.equal(cov.length, 27);
  const reached = cov.filter((c) => c.count).length;
  assert.ok(reached >= 24, `only ${reached} of 27 cells are reached`);
});

// ── the record and the round trip, on a hand fixture ────────────────────────

// "the house of the king fell" — an analytic, English-shaped sentence, with
// the relation carried by a separate word ("of").
const ANALYTIC = `# sent_id = t1
# text = the house of the king fell
1	the	the	DET	_	Definite=Def|PronType=Art	2	det	_	_
2	house	house	NOUN	_	Number=Sing	6	nsubj	_	_
3	of	of	ADP	_	_	5	case	_	_
4	the	the	DET	_	Definite=Def|PronType=Art	5	det	_	_
5	king	king	NOUN	_	Number=Sing	2	nmod	_	_
6	fell	fall	VERB	_	Mood=Ind|Tense=Past|VerbForm=Fin	0	root	_	_
7	.	.	PUNCT	_	_	6	punct	_	_
`;
// "domus regis cecidit" — the same relation carried by an ending.
const SYNTHETIC = `# sent_id = t2
# text = domus regis cecidit
1	domus	domus	NOUN	_	Case=Nom|Gender=Fem|Number=Sing	3	nsubj	_	_
2	regis	rex	NOUN	_	Case=Gen|Gender=Masc|Number=Sing	1	nmod	_	_
3	cecidit	cado	VERB	_	Aspect=Perf|Mood=Ind|Tense=Past|VerbForm=Fin|Voice=Act	0	root	_	_
`;

test("L1: the surface layer re-serializes to the exact input bytes", () => {
  for (const src of [ANALYTIC, SYNTHETIC]) {
    const [s] = parseConllu(src);
    assert.equal(surfaceBytes(toEot(s)), s.lines.join("\n"));
  }
});

test("L2: the full annotation is rebuilt from the meaning layer alone", () => {
  for (const src of [ANALYTIC, SYNTHETIC]) {
    const [s] = parseConllu(src);
    const rec = toEot(s);
    const built = new Map(annotationFromMeaning(rec).map((r) => [r.key, r]));
    for (const g of goldRows(s, rec)) assert.deepEqual(built.get(g.key), g, `lost ${g.lemma}`);
  }
});

test("function words are absorbed: the meaning layer holds content words only", () => {
  const [s] = parseConllu(ANALYTIC);
  const rec = toEot(s);
  assert.deepEqual(rec.meaning.nodes.map((n) => n.lemma).sort(), ["fall", "house", "king"]);
  assert.equal(rec.meaning.markers.length, 3, "the, of, the");
});

// Holds for the genitive only — see the KNOWN GAP below. Kept as the one
// case where the claim is currently true, not as evidence it is general.
test("ONE RELATION, TWO PROJECTIONS: 'of' and the genitive land in the same cell", () => {
  const eng = toEot(parseConllu(ANALYTIC)[0]);
  const lat = toEot(parseConllu(SYNTHETIC)[0]);
  const of = eng.meaning.markers.find((m) => m.lemma === "of");
  const gen = lat.meaning.nodes.find((n) => n.lemma === "rex").feats.find((f) => f.dim === "Case");
  assert.equal(of.cell, gen.cell, `an analytic marker (${of.cell}) and a case ending (${gen.cell}) for one relation disagree`);
});

test("KNOWN GAP: an absorbed adposition is typed by its syntactic label, not by the relation it expresses", {
  todo: "only the genitive agrees today. 'in', 'to' and 'with' all take CON·Pattern from the label `case`, while Case=Loc, Dat and Com land elsewhere. Typing a marker by what it means needs a parallel treebank: the same sentence in a language that spends a preposition and one that spends an ending.",
}, async () => {
  const { addressOfRelation, addressOfFeature } = await import("./universal-grammar.js");
  const marker = addressOfRelation("case").cell;
  for (const c of ["Loc", "Dat", "Com"]) assert.equal(marker, addressOfFeature("Case", c).cell, `Case=${c}`);
});

test("the meaning layer carries no word order: identities are opaque", () => {
  const [s] = parseConllu(ANALYTIC);
  const rec = toEot(s);
  for (const n of rec.meaning.nodes) {
    assert.ok(/^n[0-9a-z]+$/.test(n.key));
    assert.equal(n.id, undefined, "a token index leaked into the meaning layer");
  }
});

test("a multi-valued feature is addressed value by value and kept verbatim", () => {
  const src = `# sent_id = t3\n1\tx\tx\tNOUN\t_\tGender=Fem,Masc\t0\troot\t_\t_\n`;
  const rec = toEot(parseConllu(src)[0]);
  const f = rec.meaning.nodes[0].feats[0];
  assert.equal(rec.gaps.length, 0);
  assert.equal(f.value, "Fem,Masc");
  assert.deepEqual(f.underspecified, ["Fem", "Masc"]);
});

test("an unplaced value is a loud gap on entry, never silently dropped", () => {
  const src = `# sent_id = t4\n1\tx\tx\tNOUN\t_\tCase=Zzz\t0\troot\t_\t_\n`;
  const rec = toEot(parseConllu(src)[0]);
  assert.deepEqual(rec.gaps.map((g) => g.item), ["Case=Zzz"]);
  assert.equal(rec.meaning.nodes[0].feats[0].gap, true);
});

test("L3: order is regenerated from measured parameters, and is exact when the parameters are", () => {
  const [s] = parseConllu(SYNTHETIC);
  const rec = toEot(s);
  const rows = annotationFromMeaning(rec);
  const produced = linearize(rows, measureOrder([s]));
  const gold = s.tokens.map((t) => rec.surface.keyOfId[t.id]);
  assert.equal(kendallTau(produced, gold), 1);
});

// ── every treebank on disk ──────────────────────────────────────────────────

const TREEBANKS = fs.existsSync(FIXTURES) ? fs.readdirSync(FIXTURES).filter((d) => d.startsWith("ud-")) : [];

test("EVERY TREEBANK WE HOLD enters with no gap and rebuilds its full annotation", { skip: !TREEBANKS.length }, () => {
  for (const d of TREEBANKS) {
    for (const f of fs.readdirSync(path.join(FIXTURES, d)).filter((x) => x.endsWith(".conllu"))) {
      const sents = parseConllu(fs.readFileSync(path.join(FIXTURES, d, f), "utf8")).slice(0, 150);
      for (const s of sents) {
        const rec = toEot(s, { source: `${d}/${f}` });
        assert.deepEqual(rec.gaps, [], `${d}/${f} ${s.sentId}: ${rec.gaps.map((g) => g.item).join(", ")}`);
        assert.equal(surfaceBytes(rec), s.lines.join("\n"));
        const built = new Map(annotationFromMeaning(rec).map((r) => [r.key, r]));
        for (const g of goldRows(s, rec)) assert.deepEqual(built.get(g.key), g, `${d} ${s.sentId}: lost ${g.lemma}`);
      }
    }
  }
});

test("the measured order of a treebank recovers its language's known basic order", { skip: !TREEBANKS.includes("ud-arabic-padt") }, () => {
  const read = (d) => fs.readdirSync(path.join(FIXTURES, d)).filter((x) => x.endsWith(".conllu")).flatMap((f) => parseConllu(fs.readFileSync(path.join(FIXTURES, d, f), "utf8")));
  const basic = (d) => {
    const p = measureOrder(read(d));
    const at = (rel) => { const e = p[`${rel}|NOUN`] ?? p[rel]; return e.before >= 0.5 ? e.meanLeft : e.meanRight; };
    return [["S", at("nsubj")], ["V", 0], ["O", at("obj")]].sort((a, b) => a[1] - b[1]).map((x) => x[0]).join("");
  };
  assert.equal(basic("ud-arabic-padt"), "VSO");
  if (TREEBANKS.includes("ud-latin-perseus")) assert.equal(basic("ud-latin-perseus"), "SOV");
});
