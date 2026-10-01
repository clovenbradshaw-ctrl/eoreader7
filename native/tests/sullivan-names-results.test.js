// sullivan-names-results.test.js — what Sullivan learned about the marks on written names, pinned.
//
// `eval/lavar/sullivan-names.mjs` learned, per language and from that language's own treebank, which marks on a written name leave its referent where it
// was, chose each operating point on a split it did not learn from, and reported on a third. A committed result nothing reads is a report, not an
// enforcement (eo-constitution III.5; the-fold POLICIES.md P94): the generated block of sullivan-names-RESULTS.md is regenerated from the committed
// record by the same pure function the driver prints with, every verdict the document states is re-derived from the record's own fields, the shipped
// priors are checked against the record they came from, and where the treebank files are on disk the whole row of a language is re-taken and compared.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { summarizeNames } from "../eval/lavar/lib/sullivan-names-summary.mjs";
import { SPACE, SHIP, MIN_STEM, TREEBANKS, runLanguage } from "../eval/lavar/sullivan-names.mjs";
import { spaceSize } from "../eval/lavar/lib/swarm-search.mjs";
import { nameFormsFromPrior, PRESERVING } from "../adapters/text/name-forms.js";
import { REQUIRED_PROVENANCE, BASES } from "../adapters/text/morph-cues.js";

const here = new URL("../eval/lavar/results/", import.meta.url);
const record = JSON.parse(readFileSync(new URL("sullivan-names.json", here), "utf8"));
const doc = readFileSync(new URL("sullivan-names-RESULTS.md", here), "utf8");
const byName = Object.fromEntries(record.languages.map((l) => [l.name, l]));
const priorFile = (iso) => new URL(`../priors/name-forms-${iso}.json`, import.meta.url);
const eps = 1e-12;

test("the document's tables are exactly what the committed record says", () => {
  const m = doc.match(/<!-- sullivan:begin -->\n([\s\S]*?)\n<!-- sullivan:end -->/);
  assert.ok(m, "the generated block is delimited by sullivan:begin / sullivan:end");
  assert.equal(m[1], summarizeNames(record));
});

test("the record is whole: ten languages, the declared space and bar, and the exact bytes each was learned from", () => {
  assert.equal(record.schema, "SullivanNames@1");
  assert.equal(record.languages.length, 10);
  assert.equal(new Set(record.languages.map((l) => l.iso)).size, 10);
  assert.equal(record.space.configs, spaceSize(SPACE));
  assert.equal(record.space.configs, 108);
  assert.equal(record.space.minStem, MIN_STEM);
  assert.deepEqual(record.ship, SHIP);
  assert.deepEqual(record.ship, { minPrecision: 0.9, minIssued: 30 }, "the bar the document states");
  for (const l of record.languages) {
    for (const split of ["train", "dev", "test"]) {
      assert.match(l.files[split].sha256, /^[0-9a-f]{64}$/, `${l.name} ${split}`);
      assert.ok(l.files[split].sentences > 0 && l.files[split].bytes > 0);
    }
    for (const k of REQUIRED_PROVENANCE) {
      const v = l.provenance[k];
      assert.ok((v && typeof v === "object" ? v.value : v), `${l.name} names its ${k}`);
      if (v && typeof v === "object") assert.ok(BASES.includes(v.basis), `${l.name} ${k} says its basis`);
    }
    assert.match(l.provenance.source.value, new RegExp(l.files.train.sha256), `${l.name}'s source names the hash of the file it learned from`);
  }
});

test("every verdict is re-derived from the record: ships iff TEST precision and issued types clear the bar AND H is above both controls built to fail", () => {
  const shipped = [];
  for (const l of record.languages) {
    if (!l.champion) { assert.equal(l.ship, false, `${l.name} has no operating point and cannot ship`); continue; }
    const t = l.champion.test;
    const best = Math.max(l.controls.finalS.H ?? 0, l.controls.shuffled.H ?? 0);
    const should = t.A !== null && t.A >= SHIP.minPrecision && t.issued >= SHIP.minIssued && (t.H ?? 0) > best;
    assert.equal(l.ship, should, `${l.name}: the stored verdict is the bar applied to the stored scores`);
    if (should) shipped.push(l.name);
  }
  assert.deepEqual(shipped.sort(), ["English", "French"], "exactly the two languages the document says ship");
});

test("the claims the document makes about each language hold against the record", () => {
  const en = byName.English, fr = byName.French, it = byName.Italian, de = byName.German;
  // English: two rules, no false strip, 34 of 43
  assert.deepEqual(en.rules.suffix.map((r) => [r.ending, r.exponent]), [["'s", "'s"], ["s'", "'"]]);
  assert.equal(en.rules.prefix.length, 0);
  assert.deepEqual([en.champion.test.issued, en.champion.test.gold, en.champion.test.A, en.champion.test.falseStrips, en.champion.test.wrongStrips], [34, 43, 1, 0, 0]);
  assert.ok(Math.abs(en.champion.test.C - 34 / 43) < eps);
  const missed = en.errors.misses.map((m) => m.word).sort();
  assert.deepEqual(missed, ["Andiamos", "Bachelors", "Cox'", "Limos", "Mc.Donalds", "McDonalds", "Sams", "Services", "portillos"], "all nine misses are held in the record, so the document can name them");
  assert.equal(missed.length, en.champion.test.gold - en.champion.test.issued);
  // French: three elision prefixes, no suffix rule, every TEST type changed to the gold stem
  assert.deepEqual(fr.rules.prefix.map((r) => r.ending).sort(), ["d'", "l'", "qu'"]);
  assert.equal(fr.rules.suffix.length, 0);
  assert.deepEqual([fr.champion.test.issued, fr.champion.test.gold, fr.champion.test.A, fr.champion.test.C], [38, 38, 1, 1]);
  assert.deepEqual([fr.champion.dev.issued, fr.champion.dev.gold, fr.champion.dev.H], [141, 141, 1]);
  // Italian: the same shape, under the declared issued-type bar, one named false strip
  assert.equal(it.champion.test.issued, 19);
  assert.ok(it.champion.test.A >= 0.9 && it.champion.test.A < 1);
  assert.deepEqual(it.errors.falseStrips.map((x) => x.word), ["D'Ovidio"]);
  assert.equal(it.ship, false);
  assert.match(it.shipWhy, /only 19 issued types/);
  // the languages whose exponent is an ordinary letter stay under the precision bar, and the false strips are real names
  for (const [name, a] of [["German", 0.647], ["Danish", 0.778], ["Finnish", 0.784], ["Hungarian", 0.867]]) {
    const t = byName[name].champion.test;
    assert.ok(t.A < SHIP.minPrecision && Math.abs(t.A - a) < 0.0006, `${name} TEST precision ${t.A}`);
    assert.ok(byName[name].errors.falseStrips.length > 0);
  }
  const falseWords = (n) => byName[n].errors.falseStrips.map((x) => x.word);
  assert.ok(falseWords("German").includes("Anders") && falseWords("German").includes("Amiens"));
  assert.ok(falseWords("Danish").includes("Jens"));
  assert.ok(falseWords("Finnish").includes("Aasia") && falseWords("Finnish").includes("Jan"));
  assert.ok(byName.Swedish.champion.test.issued < SHIP.minIssued && byName.Spanish.champion.test.issued < SHIP.minIssued);
  assert.equal(byName.Dutch.champion, null, "Dutch has too few gold-changing DEV types to choose a point by");
  // German: a rule with no language in it scores above the learned table, which is why German is refused on the controls too
  assert.ok(de.controls.finalS.H > de.champion.test.H, `strip-a-final-s ${de.controls.finalS.H} against learned ${de.champion.test.H}`);
  assert.match(de.shipWhy, /controls built to fail/);
});

test("THE REPLACEMENT DECISION: the learned English prior costs one type of 1,186 against the typed route, and nothing on an independent text", () => {
  const q = byName.English.incumbent.test;
  assert.deepEqual([q.both, q.neither, q.aOnly, q.bOnly], [1177, 8, 0, 1]);
  assert.equal(q.both + q.neither + q.aOnly + q.bOnly, byName.English.types.test);
  assert.equal(q.p, 1, "exact two-sided probability of a 0/1 split");
  const g = record.genre[0];
  assert.match(g.name, /PUD/);
  assert.deepEqual([g.incumbent.both, g.incumbent.neither, g.incumbent.aOnly, g.incumbent.bOnly], [1135, 2, 0, 0]);
  assert.equal(g.incumbent.both + g.incumbent.neither, g.types);
  assert.equal(g.score.H, g.typed.H, "the two routes score the same on text the audit never read");
  // the document states the revision of the bar and says why
  assert.match(doc, /The ship bar was revised after the first full run/);
  assert.match(doc, /Cox'/);
  assert.match(doc, /read the English and German TEST splits once/);
});

test("CONTROLS BUILT TO FAIL: shuffled labels teach nothing anywhere, and a language-free rule is refused by its own false strips", () => {
  for (const l of record.languages) {
    if (!l.champion) { assert.equal(l.controls.shuffled, null); continue; }
    assert.ok((l.controls.shuffled.H ?? 0) <= 0.05, `${l.name}: shuffled H ${l.controls.shuffled.H}`);
    if (l.controls.finalS.A !== null) assert.ok(l.controls.finalS.A < SHIP.minPrecision, `${l.name}: strip-a-final-s precision ${l.controls.finalS.A}`);
  }
  assert.ok(byName.English.controls.finalS.A < 0.1, "in English the language-free rule is nearly always wrong");
});

test("the compiled rules ARE the measured prior: the stored list answers every TEST type as the full table did, at every shipped operating point", () => {
  for (const l of record.languages) {
    if (!l.champion) continue;
    assert.equal(l.selfCheck.equivalent, true, `${l.name}: ${l.selfCheck.differing} types answered differently by the stored rules`);
    assert.equal(l.selfCheck.types, l.types.test);
  }
});

test("THE SWARM, as the document states it: the gate admitted nothing in eight languages, refused every gain in four, and kept a point below the colony's own best in five", () => {
  const colonies = record.languages.map((l) => ({ l, a: l.arms.swarm, g: l.arms.gainsOnly, s: l.arms.sweep }));
  // structural: what the gate kept cannot exceed what was measured, and nothing measured exceeds the sweep's maximum over every point
  for (const { l, a, g, s } of colonies) {
    for (const arm of [a, g]) {
      assert.ok(arm.gateH <= arm.devH + eps, `${l.name}: kept ${arm.gateH} > measured ${arm.devH}`);
      assert.ok(arm.devH <= s.devH + eps, `${l.name}: measured ${arm.devH} > the sweep's ${s.devH}`);
    }
    assert.equal(s.evaluations, 108);
    assert.ok(a.evaluations <= 108 && g.evaluations <= 108);
  }
  const none = colonies.filter(({ a }) => a.admitted === 0);
  assert.equal(none.length, 8);
  assert.deepEqual(none.filter(({ a }) => a.stall.gains === 0).map(({ l }) => l.name).sort(), ["Dutch", "English", "French", "Swedish"], "shown no gain: a seed already sat on the sweep's top plateau");
  assert.deepEqual(none.filter(({ a }) => a.stall.gains > 0).map(({ l }) => l.name).sort(), ["Danish", "Finnish", "German", "Hungarian"], "shown gains and refused every one");
  assert.deepEqual(["German", "Danish", "Finnish", "Hungarian"].map((n) => byName[n].arms.swarm.stall.gains), [3, 2, 7, 4]);
  assert.equal(colonies.filter(({ a }) => a.gateH < a.devH - eps).length, 5);
  assert.equal(colonies.filter(({ g }) => g.gateH < g.devH - eps).length, 4);
  // the refused gains are smaller than a loss on the colony's own record: the mechanism the toy landscape in swarm-search.test.js pins
  for (const n of ["German", "Danish", "Finnish", "Hungarian"]) {
    const st = byName[n].arms.swarm.stall;
    assert.ok(st.largestGain < -st.largestLoss, `${n}: the largest gain ${st.largestGain} is under the largest loss ${-st.largestLoss}`);
  }
  assert.equal(record.languages.filter((l) => l.arms.swarm.devH >= l.arms.sweep.devH - eps).length, 7);
  assert.equal(record.languages.filter((l) => l.arms.swarm.gateH >= l.arms.sweep.devH - eps).length, 5);
});

test("THE DEV CHAMPION IS THE MOST OVERFITTED POINT: in three languages a point the colony measured scores higher on TEST than the sweep's, and none of the three ships", () => {
  const better = record.languages.filter((l) => l.arms.swarm.testH > l.arms.sweep.testH + eps);
  assert.deepEqual(better.map((l) => l.name).sort(), ["Finnish", "German", "Hungarian"]);
  assert.deepEqual(better.map((l) => +(l.arms.swarm.testH - l.arms.sweep.testH).toFixed(3)).sort(), [0.018, 0.028, 0.053]);
  assert.ok(better.every((l) => l.ship === false));
  assert.deepEqual([byName.English.selection.plateau, byName.French.selection.plateau, byName.Italian.selection.plateau], [68, 48, 15]);
  assert.deepEqual(byName.English.selection.testH.map((x) => +x.toFixed(3)), [0.883, 0.897]);
});

test("transfer: a mark shared between two languages transfers, and nothing else does", () => {
  const cell = (from, to) => record.transfer.find((r) => r.from === from).on[to];
  assert.ok(cell("Spanish", "French").H > 0.94 && cell("Spanish", "French").A === 1, "Spanish d' and l' strip French elisions with no false strip");
  assert.ok(cell("Italian", "French").H > 0.98);
  assert.ok(cell("Italian", "English").H > 0.85, "the Italian 's rule strips English possessives");
  assert.equal(cell("English", "French").issued <= 1 && cell("English", "French").H === 0, true, "the English prior does nothing to French");
  for (const to of ["Finnish", "Hungarian"]) for (const from of ["English", "French", "Spanish", "Italian"]) assert.ok((cell(from, to).H ?? 0) === 0, `${from} on ${to}`);
  for (const l of record.languages.filter((x) => x.champion)) assert.equal(cell(l.name, l.name).H, l.champion.test.H, `${l.name} on itself is its TEST score`);
});

test("the two shipped priors are the record's: same rules, same operating point, same held-out scores, same bytes' hashes — and only shipped languages have a prior", () => {
  const files = readdirSync(new URL("../priors/", import.meta.url)).filter((f) => /^name-forms-.*\.json$/.test(f)).sort();
  assert.deepEqual(files, ["name-forms-eng.json", "name-forms-fra.json"]);
  for (const iso of ["eng", "fra"]) {
    const prior = JSON.parse(readFileSync(priorFile(iso), "utf8"));
    const l = record.languages.find((x) => x.iso === iso);
    assert.equal(l.ship, true);
    const loaded = nameFormsFromPrior(prior);
    assert.deepEqual(prior.suffixRules, l.rules.suffix);
    assert.deepEqual(prior.prefixRules, l.rules.prefix);
    assert.deepEqual({ ...prior.operatingPoint, heldOut: undefined, lineage: undefined }, { ...l.champion.cfg, minStem: MIN_STEM, classes: [...PRESERVING], heldOut: undefined, lineage: undefined });
    assert.deepEqual(prior.operatingPoint.heldOut, { dev: l.champion.dev, test: l.champion.test });
    assert.deepEqual(prior.provenance, l.provenance);
    assert.equal(loaded.operatingPoint.minStem, 1, "the prior declares no stem floor: that is the consumer's");
    assert.match(prior.provenance.license.value, /^CC BY-SA 4\.0$/, "a shipped prior derives from a share-alike treebank and carries it");
    assert.ok(!/non-commercial/i.test(JSON.stringify(prior.provenance)), "a prior learned from a non-commercial treebank is not distributed");
    assert.equal(prior.language.bcp47, iso === "eng" ? "en" : "fr");
  }
  // the two non-commercial treebanks' rows are evaluation only, and the record says so where a reader would need it
  for (const n of ["Italian", "Hungarian"]) assert.match(byName[n].provenance.license.value, /non-commercial/);
});

test("REPRODUCTION — where the treebank files are on disk, every language's whole row is re-taken and equals the committed one; where they are not, the test says so by name", (t) => {
  const dir = process.env.UD_NAMES_DIR ?? fileURLToPath(new URL("../eval/lavar/ud-names/", import.meta.url));
  if (!existsSync(dir)) { t.skip(`fixture_absent: ${dir} — run eval/lavar/fetch-ud-name-treebanks.sh (a run that cannot be repeated is a report, not a result)`); return; }
  let rerun = 0;
  for (const T of TREEBANKS) {
    const have = ["train", "dev", "test"].every((s) => existsSync(`${dir}/${T.code}-${s}.conllu`));
    if (!have) continue;
    const { out } = runLanguage(T, dir);
    const row = { ...record.languages.find((l) => l.iso === T.iso) };
    delete row.provenance;
    assert.deepEqual(JSON.parse(JSON.stringify(out)), row, `${T.name}: a re-run differs from the committed record`);
    rerun += 1;
  }
  assert.ok(rerun > 0, "the directory exists but holds none of the ten treebanks");
});
