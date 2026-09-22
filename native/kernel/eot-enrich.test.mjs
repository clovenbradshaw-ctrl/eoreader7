// eot-enrich.test.mjs — THE FALSIFICATION TIER for three fields no source
// sentence states but the engine already computes: which being a node names
// (not a string), whether an arc is corroborated, and the extent it is true
// of. No model call anywhere in this file.
//
// Built on HAND-WRITTEN CoNLL-U, the same discipline eot-rich.test.mjs uses,
// rather than the live trained parser: the live English parser is measured
// at 81% UAS (english-parser.test.mjs) and gets some of these exact
// sentences wrong, which would test the parser's accuracy, not this
// module's logic. A live-parser integration pass belongs in
// english-parser.test.mjs or a dedicated end-to-end file, not here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { attachReferentsToNodes, corroborate, groundOf, enrichRecords } from "./eot-enrich.js";
import { buildReferents } from "../the-fold/referents.js";
import { toEot, parseConllu } from "./eot-rich.js";

const rec = (conllu, source) => { const [s] = parseConllu(conllu); return toEot(s, { language: "eng", source }); };

// ── REFERENT: two surfaces of the same being resolve to one id ─────────────

test("REFERENT: 'Napoleon's army' and 'the army of Napoleon' name the same being (a real name, not a common noun)", () => {
  // The referent organ finds beings the way this project's referent
  // discovery always does: by NAME, which in English text means a
  // capitalised run. A common noun like "king" is never admitted as a
  // referent on its own — found live, the first draft of this test used
  // "king" and every resolve came back empty. Real material always
  // resolves a proper name; this test now does.
  const ground = "Napoleon commanded the campaign. Napoleon's army retreated. The army of Napoleon was destroyed.";
  const POSS = `# sent_id = p1\n1\tNapoleon\tNapoleon\tPROPN\t_\t_\t3\tnmod:poss\t_\t_\n2\t's\t's\tPART\t_\t_\t1\tcase\t_\t_\n3\tarmy\tarmy\tNOUN\t_\t_\t4\tnsubj\t_\t_\n4\tretreated\tretreat\tVERB\t_\tTense=Past|VerbForm=Fin\t0\troot\t_\t_\n`;
  const OF = `# sent_id = p2\n1\tThe\tthe\tDET\t_\t_\t2\tdet\t_\t_\n2\tarmy\tarmy\tNOUN\t_\t_\t6\tnsubj:pass\t_\t_\n3\tof\tof\tADP\t_\t_\t4\tcase\t_\t_\n4\tNapoleon\tNapoleon\tPROPN\t_\t_\t2\tnmod\t_\t_\n5\twas\tbe\tAUX\t_\t_\t6\taux:pass\t_\t_\n6\tdestroyed\tdestroy\tVERB\t_\tTense=Past|VerbForm=Part|Voice=Pass\t0\troot\t_\t_\n`;
  const R = buildReferents(ground);
  const recs = [rec(POSS, "a"), rec(OF, "b")];
  attachReferentsToNodes(recs, R);
  const napNodes = recs.flatMap((r) => r.meaning.nodes).filter((n) => n.lemma === "Napoleon");
  assert.equal(napNodes.length, 2, "expected one 'Napoleon' node per sentence");
  const ids = new Set(napNodes.map((n) => n.referent).filter((x) => x != null));
  assert.equal(ids.size, 1, `the same being resolved to more than one id: ${[...ids]} (referents: ${[...R.resolveName("Napoleon")]})`);
});

test("a node whose lemma names no established being is left unresolved, never guessed", () => {
  const ground = "The king ruled the land.";
  const R = buildReferents(ground);
  const stranger = `# sent_id = t3\n1\tA\ta\tDET\t_\t_\t2\tdet\t_\t_\n2\tstranger\tstranger\tNOUN\t_\t_\t3\tnsubj\t_\t_\n3\tarrived\tarrive\tVERB\t_\tTense=Past|VerbForm=Fin\t0\troot\t_\t_\n`;
  const recs = [rec(stranger, "other")];
  attachReferentsToNodes(recs, R);
  const strangerNode = recs[0].meaning.nodes.find((n) => n.lemma.toLowerCase() === "stranger");
  assert.equal(strangerNode.referent, null);
});

// ── EVIDENCE: single-witness vs corroborated, across documents ─────────────

const DAM_FLOODED = (n) => `# sent_id = f${n}\n1\tThe\tthe\tDET\t_\t_\t2\tdet\t_\t_\n2\tdam\tdam\tNOUN\t_\t_\t3\tnsubj\t_\t_\n3\tflooded\tflood\tVERB\t_\tTense=Past|VerbForm=Fin\t0\troot\t_\t_\n4\tthe\tthe\tDET\t_\t_\t5\tdet\t_\t_\n5\tvalley\tvalley\tNOUN\t_\t_\t3\tobj\t_\t_\n`;
const BRIDGE_FLOODED = `# sent_id = f9\n1\tThe\tthe\tDET\t_\t_\t2\tdet\t_\t_\n2\tbridge\tbridge\tNOUN\t_\t_\t3\tnsubj\t_\t_\n3\tflooded\tflood\tVERB\t_\tTense=Past|VerbForm=Fin\t0\troot\t_\t_\n4\tthe\tthe\tDET\t_\t_\t5\tdet\t_\t_\n5\tvalley\tvalley\tNOUN\t_\t_\t3\tobj\t_\t_\n`;

test("EVIDENCE: the same claim in two independent documents is corroborated", () => {
  const a = rec(DAM_FLOODED(1), "docA"), b = rec(DAM_FLOODED(2), "docB"), c = rec(BRIDGE_FLOODED, "docC");
  corroborate([a, b, c]);
  const standingOf = (r, lemma) => r.meaning.arcs.find((x) => r.meaning.nodes.find((n) => n.key === x.from)?.lemma === lemma)?.standing;
  assert.equal(standingOf(a, "flood"), "corroborated", `docA: ${JSON.stringify(a.meaning.arcs)}`);
  assert.equal(standingOf(b, "flood"), "corroborated");
  assert.equal(standingOf(c, "flood"), "single-witness", "a different claim (bridge, not dam) was corroborated by the dam claim");
  const damArc = a.meaning.arcs.find((x) => r_node(a, x.from) === "flood");
  assert.deepEqual(new Set(damArc.witnesses), new Set(["docA", "docB"]));
});
function r_node(rec, key) { return rec.meaning.nodes.find((n) => n.key === key)?.lemma; }

test("two sentences of the SAME document restating a claim is one witness re-testifying, not two", () => {
  const a = rec(DAM_FLOODED(1), "onedoc");
  const b = rec(DAM_FLOODED(2), "onedoc");
  corroborate([a, b]);
  assert.ok([a, b].every((r) => r.meaning.arcs.every((x) => x.standing === "single-witness")), "one document was double-counted as two witnesses");
});

// ── GROUND: the extent, read off what the meaning layer already typed ──────

const FLOOD_2010 = `# sent_id = g1
# text = The flood struck the city in Nashville in 2010.
1	The	the	DET	_	Definite=Def|PronType=Art	2	det	_	_
2	flood	flood	NOUN	_	Number=Sing	3	nsubj	_	_
3	struck	strike	VERB	_	Tense=Past|VerbForm=Fin	0	root	_	_
4	the	the	DET	_	Definite=Def|PronType=Art	5	det	_	_
5	city	city	NOUN	_	Number=Sing	3	obj	_	_
6	in	in	ADP	_	_	7	case	_	_
7	Nashville	Nashville	PROPN	_	Number=Sing	3	obl	_	_
8	in	in	ADP	_	_	9	case	_	_
9	2010	2010	NUM	_	NumType=Card	3	obl	_	_
10	.	.	PUNCT	_	_	3	punct	_	_
`;

test("GROUND: an oblique date and an oblique place are read as the extent; the direct object is not", () => {
  // "struck the city" — a direct object is a syntactic argument (a patient),
  // never an extent, however place-like the word is; only an OBLIQUE
  // dependent ("in Nashville", "in 2010") marks the extent a statement is
  // true of. Found live: the preposition's own cell is CON·Pattern in every
  // case (universal-grammar.js's relation table), never CON·Ground — what is
  // Ground-grain is the `obl` relation itself, SEG·Ground.
  const g = groundOf(rec(FLOOD_2010, "t"));
  assert.ok(g.dates.includes("2010"), `no date found: ${JSON.stringify(g)}`);
  assert.ok(g.places.includes("Nashville"), `no place found: ${JSON.stringify(g)}`);
  assert.ok(!g.places.includes("city"), "a direct object was read as ground, not just an oblique");
});

test("a bare number with no preposition is not claimed as a date unless it is year-shaped", () => {
  const score = `# sent_id = g2\n1\tThe\tthe\tDET\t_\t_\t2\tdet\t_\t_\n2\tteam\tteam\tNOUN\t_\t_\t3\tnsubj\t_\t_\n3\tscored\tscore\tVERB\t_\tTense=Past|VerbForm=Fin\t0\troot\t_\t_\n4\t12\t12\tNUM\t_\tNumType=Card\t3\tobj\t_\t_\n5\tpoints\tpoint\tNOUN\t_\tNumber=Plur\t4\tnmod\t_\t_\n`;
  const g = groundOf(rec(score, "t"));
  assert.ok(!g.dates.includes("12"), "an ordinary count with no preposition was read as a date");
});

// ── the entry point ──────────────────────────────────────────────────────

test("enrichRecords wires all three without needing separate calls", () => {
  const ground = "The flood struck Nashville in 2010.";
  const R = buildReferents(ground);
  const recs = enrichRecords([rec(FLOOD_2010, "t")], { referents: R });
  assert.ok(recs[0].ground.dates.length || recs[0].ground.places.length);
  assert.ok(recs[0].meaning.arcs.every((a) => a.standing));
  assert.ok(recs[0].meaning.nodes.some((n) => "referent" in n));
});
