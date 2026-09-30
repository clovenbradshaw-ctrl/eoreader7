// tschichold.test.mjs — the setting organ against held-out bytes. Every rule
// is tested the way the bench tests it: where its convention is present it
// must fire, and on a NEAR-MISS — material that looks similar and lacks the
// convention — it must stay quiet. The fixtures are short real-shaped lines
// (Martial's lineation, a flattened GRETIL line, a Gutenberg wrap, Dante's
// lowercase tercets); a second block runs over live_priors when it is
// present and skips, named, when it is not.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { elementsOf, endOf, wordsOf, detectRules, readSetting, applySetting, compareBytes, falsify, competency, segmentElements, SEED_RULES, PRIMITIVES, prepare } from "./tschichold.js";

const rule = (id) => SEED_RULES.find((r) => r.id === id);
const fires = (id, text, lang = null) => detectRules(text, { lang, rules: [rule(id)] }).fired.some((f) => f.id === id);

test("script-universal first words: Arabic, Greek, Chinese lines are never blank", () => {
  for (const [line, lang] of [["حدثنا مسدد قال: حدثنا يحيى", "arb"], ["ἄνδρα μοι ἔννεπε, μοῦσα, πολύτροπον", "grc"], ["太史公曰：余讀諜記", "lzh"]]) {
    const e = elementsOf(line, { lang }).elements[0];
    assert.ok(e.first, `first word read for ${lang}`);
    assert.ok(e.words >= 3, `words counted for ${lang}`);
  }
});

test("closing marks fold to one function across scripts", () => {
  assert.equal(endOf("余讀諜記。", "lzh").fn, ".");
  assert.equal(endOf("هل أتى على الإنسان؟", "arb").fn, "?");
  assert.equal(endOf("τί ἐστιν ἀλήθεια;", "grc").fn, "?");   // the Greek question mark is ";"
  assert.equal(endOf("so they said;", "eng").fn, ";");        // in English it is a semicolon
  assert.equal(endOf("athāto dharmajijñāsā ||", "san").fn, "."); // the double daṇḍa ends
});

test("hard wrap: Italian lowercase verse stays verse; wrapped German prose joins", () => {
  const dante = Array.from({ length: 6 }, (_, k) => ["Nel mezzo del cammin di nostra vita", "mi ritrovai per una selva oscura,", "ché la diritta via era smarrita."][k % 3]).join("\n");
  const verse = elementsOf(dante, { lang: "ita" });
  assert.equal(verse.elements.length, 6, "every tercet line stands");
  const prose = [
    "Als Zarathustra dreissig Jahr alt war, verliess er seine Heimat und den",
    "See seiner Heimat und ging in das Gebirge. Hier genoss er seines Geistes",
    "und seiner Einsamkeit und wurde dessen zehn Jahre nicht müde. Endlich aber",
    "verwandelte sich sein Herz, - und eines Morgens stand er mit der Morgenröthe",
    "auf, trat vor die Sonne hin und sprach also zu ihr: Du grosses Gestirn! Was",
    "wäre dein Glück, wenn du nicht Die hättest, welchen du leuchtest! Zehn Jahre",
    "kamst du hier herauf zu meiner Höhle: du würdest deines Lichtes und dieses",
    "Weges satt geworden sein, ohne mich, meinen Adler und meine Schlange.",
  ].join("\n");
  const joined = elementsOf(prose, { lang: "deu" });
  assert.equal(joined.elements.length, 1, "the wrapped paragraph is one authored line");
});

test("lineation fires on every-fifth-line numbers and not on ordinary trailing numbers", () => {
  const martial = "Hic est quem legis ille, quem requiris,\nToto notus in orbe Martialis\nArgutis epigrammaton libellis:\nCui, lector studiose, quod dedisti\nViventi decus atque sentienti, 5\nRari post cineres habent poetae.\nQui tecum cupis esse meos ubicumque libellos 10\nEt comites longae quaeris habere viae, 15";
  assert.ok(fires("lineation-5", martial));
  const nearMiss = "He was born in 1809\nand died in 1865\nthe house had 12\nrooms and 3";
  assert.ok(!fires("lineation-5", nearMiss), "trailing numbers that are content do not fire");
  assert.ok(PRIMITIVES.lineation(prepare("x ".repeat(40000) + "abc 10")).fired, "a 80K-char line is read linearly (was quadratic)");
});

test("flattened sigla fire on a lost-break edition and not on a line-per-verse edition", () => {
  const flat = "vṛddhir ād-aic || ps_1,1.1 ||adeṅ guṇaḥ || ps_1,1.2 ||iko guṇa-vṛddhī || ps_1,1.3 ||na dhātu-lopa ārdhadhātuke || ps_1,1.4 ||";
  assert.ok(fires("flattened-sigla", flat));
  const lined = "vṛddhir ād-aic || ps_1,1.1 ||\nadeṅ guṇaḥ || ps_1,1.2 ||\niko guṇa-vṛddhī || ps_1,1.3 ||";
  assert.ok(!fires("flattened-sigla", lined));
});

test("speaker labels: drama fires; numbered section heads and canto heads do not", () => {
  const faust = ["FAUST.", "Habe nun, ach! Philosophie,", "MEPHISTOPHELES.", "Ich bin der Geist, der stets verneint!", "FAUST.", "Du nennst dich einen Teil,", "MEPHISTOPHELES.", "Bescheidne Wahrheit sprech ich dir.", "FAUST.", "Wer bist du denn?", "MEPHISTOPHELES.", "Ein Teil von jener Kraft,"].join("\n");
  assert.ok(fires("speaker-labels", faust, "deu"));
  const sections = ["1.", "Gesetzt, dass die Wahrheit ein Weib ist.", "2.", "Wie könnte Etwas aus seinem Gegensatz entstehn?", "3.", "Nachdem ich lange genug den Philosophen.", "1.", "Der Wille zur Wahrheit.", "2.", "Wie könnte Etwas entstehn?", "3.", "Nachdem ich lange."].join("\n");
  assert.ok(!fires("speaker-labels", sections, "deu"), "'1.' '2.' are section numbers, not speakers");
  const cantos = ["Canto I.", "Nel mezzo del cammin di nostra vita", "Canto II.", "Lo giorno se n'andava", "Canto I.", "La gloria di colui che tutto move", "Canto II.", "O voi che siete in piccioletta barca", "Canto I.", "Per correr miglior acque", "Canto II.", "Io era tra color che son sospesi"].join("\n");
  assert.ok(!fires("speaker-labels", cantos, "ita"), "'Canto I.' is a head, not a speaker");
});

test("speaker labels: inline cues fire by turn-taking; recurring abbreviations do not", () => {
  const faustus = ["FAUSTUS. Settle thy studies, Faustus, and begin", "To sound the depth of that thou wilt profess.", "WAGNER. I will, sir.", "FAUSTUS. How am I glutted with conceit of this!", "VALDES. Faustus, these books, thy wit, and our experience", "Shall make all nations to canonize us.", "FAUSTUS. Valdes, as resolute am I in this", "As thou to live.", "WAGNER. Sir, I go.", "FAUSTUS. Come, show me some demonstrations magical,", "VALDES. First I'll instruct thee in the rudiments,", "FAUSTUS. Then come and dine with me.", "WAGNER. I shall, sir.", "VALDES. Go then."].join("\n");
  assert.ok(fires("speaker-labels", faustus), "PG 811-style inline cues");
  const livy = Array.from({ length: 16 }, (_, i) => ["Q. Fabius consul creatus est eo anno.", "Q. Fabius exercitum in Samnium duxit.", "Cn. Pompeius triumphavit de Hispanis.", "Q. Fabius iterum consul factus.", "Q. Fabius dictator dictus est.", "Cn. Pompeius legatus fuit."][i % 6] + ` ${i}`).map((l, i) => (i % 5 === 4 ? `Eo anno ${l.toLowerCase()}` : l)).join("\n");
  assert.ok(!detectRules(livy, { lang: "lat", rules: [rule("speaker-labels")], T: 20 }).fired.length, "praenomina recur, but do not take turns beyond chance");
});

test("doubled fetch fires on a long block copied twice and not on a short refrain", () => {
  const block = "Παρὰ τοῦ πάππου Οὐήρου τὸ καλόηθες καὶ ἀόργητον. Παρὰ τῆς δόξης καὶ μνήμης τῆς περὶ τοῦ γεννήσαντος τὸ αἰδῆμον καὶ ἀρρενικόν. Παρὰ τῆς μητρὸς τὸ θεοσεβὲς καὶ μεταδοτικόν.";
  const doubled = ["short", block, "other", "another", block].join("\n\n");
  assert.ok(fires("doubled-fetch", doubled, "grc"));
  const refrain = ["Pioneers! O pioneers!", "Come my tan-faced children,", "Pioneers! O pioneers!", "Follow well in order, get your weapons ready,", "Pioneers! O pioneers!"].join("\n\n");
  assert.ok(!fires("doubled-fetch", refrain), "a refrain is short and many, not a copy");
});

test("readSetting declares a frame; two settings get different frame ids", async () => {
  const a = await readSetting("I. [ recensere ]\n\nHic est quem legis ille, quem requiris,", { lang: "lat" });
  const b = await readSetting("Hic est quem legis ille, quem requiris,\nToto notus in orbe Martialis", { lang: "lat" });
  assert.ok(a.setting.frame && b.setting.frame, "both settings are declared frames");
  assert.notEqual(a.setting.frame, b.setting.frame, "different settings, different frames — frame.js's cross_frame wall applies");
  assert.ok(a.setting.fired.some((f) => f.id === "wikisource-edit-links"));
  const applied = applySetting("I. [ recensere ]\n\nHic est quem legis ille, quem requiris,", a.setting);
  assert.ok(!applied.text.includes("[ recensere ]"), "the edit link is gone from the reading copy");
  assert.equal(applied.ledger["wikisource-edit-links"], 1);
});

test("compareBytes names what a transformation did: furniture, lineation, a stripped edge chunk", () => {
  const a = "I. [ recensere ]\n\nHic est quem legis ille, quem requiris,\nToto notus in orbe Martialis 5\nPublic domain Public domain false false\nPublic domain Public domain false false";
  const b = "I.\n\nHic est quem legis ille, quem requiris,\nToto notus in orbe Martialis";
  const r = compareBytes(a, b);
  const kinds = r.candidates.map((c) => c.rule);
  assert.ok(kinds.includes("drop-lines"), "the recurring dropped line is furniture");
  assert.ok(kinds.includes("strip-lineation"), "the trailing 5 was lineation");
  assert.ok(kinds.includes("strip-tokens"), "the edge chunk ' [ recensere ]' was stripped");
});

test("falsify reports HELD and REFUTED honestly", () => {
  const good = falsify(rule("flattened-sigla"), [
    { label: "flat", text: "a || ps_1,1.1 ||b || ps_1,1.2 ||c || ps_1,1.3 ||", expect: "fire" },
    { label: "lined", text: "a || ps_1,1.1 ||\nb || ps_1,1.2 ||", expect: "not-fire" },
  ]);
  assert.equal(good.standing, "HELD");
  const bad = falsify(rule("flattened-sigla"), [{ label: "wrong expectation", text: "a || ps_1,1.1 ||\nb || ps_1,1.2 ||", expect: "fire" }]);
  assert.equal(bad.standing, "REFUTED");
});

test("competency: a family is taught only by a rule that held", () => {
  const looks = { families: [{ id: "C1.02", carrier: "C1", name: "lines", exemplars: [{ path: "x", exists: true }] }, { id: "C3.03", carrier: "C3", name: "animal sound", exemplars: [], acquire: "xeno-canto" }] };
  const seedOnly = competency(looks, { rules: SEED_RULES });
  assert.equal(seedOnly.rows.find((r) => r.id === "C1.02").status, "learning", "seed rules alone are not competency");
  const heldBench = { rules: SEED_RULES.map((r) => (r.id === "hard-wrap" ? { ...r, standing: "HELD" } : r)) };
  const c = competency(looks, heldBench);
  assert.equal(c.rows.find((r) => r.id === "C1.02").status, "taught");
  assert.equal(c.rows.find((r) => r.id === "C1.02").runnable, true, "a held seed rule has a primitive: runnable");
  const referenceOnly = competency(looks, { rules: [{ id: "swarm/x", covers: ["C1.02"], standing: "HELD", primitive: null }] });
  assert.equal(referenceOnly.rows.find((r) => r.id === "C1.02").status, "taught");
  assert.equal(referenceOnly.rows.find((r) => r.id === "C1.02").runnable, false, "a held reference detector still needs porting");
  assert.equal(referenceOnly.runnable, 0);
  assert.equal(c.rows.find((r) => r.id === "C3.03").status, "untaught");
  assert.equal(c.rows.find((r) => r.id === "C3.03").lookFirst, "xeno-canto");
});

test("segment: a recurring label cuts a collection, the same way twice; unequal parts are one unit", () => {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  const poem = (k) => ["Shall I compare thee to a summer day,", "Thou art more lovely and more temperate:", "Rough winds do shake the darling buds of May,", `And summer's lease hath all too short a date ${k};`].join("\n");
  const els = elementsOf(roman.map((r, k) => `${r}.\n\n${poem(k)}`).join("\n\n")).elements;
  const seg = segmentElements(els);
  assert.equal(seg.separator, "label:roman");
  assert.equal(seg.units.length, 8);
  assert.equal(segmentElements(els).basis, seg.basis, "seeded: the same material cuts the same way twice");
  const sizes = [1, 14, 1, 1, 12, 1, 1, 16];
  const uneven = roman.map((r, k) => `${r}.\n\n${Array.from({ length: sizes[k] }, (_, i) => `a line of verse number ${i} in part ${k},`).join("\n")}`).join("\n\n");
  assert.equal(segmentElements(elementsOf(uneven).elements).separator, null, "no more uniform than a random cut");
});

// ── rules ported from the swarm's findings on originals ────────────────────
test("shift duplication: a run repeated at one lag fires; a refrain does not", () => {
  const body = Array.from({ length: 40 }, (_, i) => `line number ${i} of the book says something ${i * 7}`);
  const doubled = [...body, ...body.slice(10, 22)].join("\n");     // lines 10..21 again at lag 30
  const r = detectRules(doubled, { rules: [rule("shift-duplication")] });
  assert.ok(r.fired.some((f) => f.id === "shift-duplication" && f.evidence.lag === 30), "the lag is found");
  const big = detectRules(doubled, { rules: [rule("shift-duplication")], T: 200 });
  assert.ok(big.fired.some((f) => f.id === "shift-duplication"), "a 200-rule bench still lets it reach 1/T (64 draws floor p at 1/65)");
  assert.ok(big.fired[0].evidence.randomLagDraws >= 400);
  const refrain = body.map((l, i) => (i % 9 === 0 ? "Pioneers! O pioneers! we march" : l)).join("\n");
  assert.ok(!fires("shift-duplication", refrain), "a refrain recurs, but never as a run");
  const cleaned = applySetting(doubled, detectRules(doubled, { rules: [rule("shift-duplication")] }), { rules: [rule("shift-duplication")] });
  assert.equal(cleaned.ledger["shift-duplication"], 12);
});

test("page numbers: decorated footers counting up fire; equation numbers do not", () => {
  const pages = Array.from({ length: 6 }, (_, k) => `The heat flux was measured at station ${k}.\nThe results agree with the theory.\n\n-${k + 4}-`).join("\n\n");
  assert.ok(fires("page-numbers", pages));
  const eqs = "q = k dT/dx   (1)\nwhere k is the conductivity.   (7)\nand so   (3)";
  assert.ok(!fires("page-numbers", eqs));
});

test("OCR letter split fires on split words and not on ordinary prose", () => {
  const ocr = Array.from({ length: 5 }, (_, i) => `the i n f r a r e d band ${i} and the t h e r m a l region`).join("\n");
  assert.ok(fires("ocr-letter-split", ocr));
  assert.ok(!fires("ocr-letter-split", "I saw a cat. It was a big cat, and I was a small boy.\nA day in May I met a man."));
});

test("body markers keep what a source declares as its body", () => {
  const pg = "Title: X\nAuthor: Y\n\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\n\nCall me Ishmael.\n\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nlicence text";
  const d = detectRules(pg, { rules: [rule("body-markers")] });
  assert.ok(d.fired.length);
  const out = applySetting(pg, d, { rules: [rule("body-markers")] });
  assert.ok(out.text.includes("Call me Ishmael") && !out.text.includes("Author:") && !out.text.includes("licence"));
});

// ── the eyes: what a look saw, tested against the page's bytes ─────────────
import { learnFromLook, layoutFacts, shapeOf } from "./tschichold-look.js";

test("look → rule: an edge line becomes a shape; decorated numbers, note marks, headings told apart", () => {
  assert.equal(shapeOf("(12)"), "(9)");
  assert.equal(shapeOf("- 5 -"), "- 9 -");
  const bytes = "   2. OVERVIEW\n\nThe flow over the wing was measured at\nseveral stations along the span.\n\n*The flow angle in a plane normal to the wing\n\n                (12)";
  const facts = { head: { text: "2. OVERVIEW" }, foot: { text: "(12)" } };
  const c = learnFromLook(bytes, facts);
  const foot = c.find((x) => x.edge === "foot"), head = c.find((x) => x.edge === "head");
  assert.equal(foot.rule, "page-number", "a decorated number at the foot is a page number");
  assert.ok(foot.reproducedByBytes, "the bytes carry the same shape at their edge");
  assert.equal(head.rule, "set-apart-head", "one page's set-apart top line is a heading until its shape recurs");
  const note = learnFromLook("text\n\n*The flow angle in a plane", { foot: { text: "*The flow angle in a plane" } });
  assert.equal(note[0].rule, "footnote-band");
});

test("look facts: justified prose is not a table; a real table is (the page's own null)", () => {
  const W = 10; // px per character in the synthetic layout
  const line = (y, words) => ({ y0: y, y1: y + 12, x0: words[0][0] * W, x1: (words.at(-1)[0] + words.at(-1)[1].length) * W, text: words.map((w) => w[1]).join(" "), words: words.map(([c, t]) => ({ x: c * W, y, w: t.length * W, h: 12, text: t })) });
  // prose: 12 lines of words at pseudo-random starts, all lines full width
  let s = 7; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const prose = Array.from({ length: 12 }, (_, i) => { const ws = []; let c = 0; while (c < 70) { const len = 2 + Math.floor(r() * 8); ws.push([c, "x".repeat(len)]); c += len + 1; } return line(i * 20, ws); });
  const pf = layoutFacts({ lines: prose, words: prose.flatMap((l) => l.words) });
  assert.equal(pf.tables.length, 0, "prose word starts align only by chance");
  // table: the same four columns on every row, among prose rows
  const table = Array.from({ length: 6 }, (_, i) => line(300 + i * 20, [[0, "Mach"], [20, "0.8"], [40, "1.2"], [60, "3.4"]]));
  const tf = layoutFacts({ lines: [...prose, ...table], words: [...prose, ...table].flatMap((l) => l.words) });
  assert.ok(tf.tables.length >= 1, "rows sharing every column beat the page's null");
});

// ── over live_priors, when present ─────────────────────────────────────────
const LP = process.env.LIVE_PRIORS_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "live_priors");
const have = (rel) => fs.existsSync(path.join(LP, rel));
const read = (rel) => fs.readFileSync(path.join(LP, rel), "utf8");

test("live_priors: the rules fire where the archon fold measured them", { skip: !have("11-multi-language/latin-originals/martial-epigrammata.txt") && "live_priors not present beside eoreader7" }, async () => {
  const martial = await readSetting(read("11-multi-language/latin-originals/martial-epigrammata.txt"), { lang: "lat" });
  for (const id of ["lineation-5", "wikisource-edit-links"]) assert.ok(martial.setting.fired.some((f) => f.id === id), `Martial: ${id}`);
  if (have("11-multi-language/sanskrit-originals/nagarjuna-mulamadhyamakakarika.txt")) {
    const nag = detectRules(read("11-multi-language/sanskrit-originals/nagarjuna-mulamadhyamakakarika.txt"), { lang: "san", rules: [rule("flattened-sigla")] });
    assert.ok(!nag.fired.length, "Nāgārjuna's edition keeps its line breaks — the near-miss for the flattened-sigla rule");
  }
});
