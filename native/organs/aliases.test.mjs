// aliases.test.mjs — the walls, against the REAL sentence organ and real prose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "./grounding.js";
import { splitSentences as offsetlessSentences } from "../adapters/text/spans.js";
import { declaredAliases, aliasIndex, shapesFrom, licenseAliases, ALIAS_REFUSALS } from "./aliases.js";
import { readFileSync, existsSync } from "node:fs";

// The REAL prior, as live_priors built it — never a fixture written here.
// Portable, module-relative (S65/P95: a driver refuses what it lacks rather
// than throwing on a path good for one machine only) — live_priors is a
// sibling checkout of this repo, same as the-fold and eoreader6.
const PRIOR_PATH = new URL("../../../live_priors/derived-priors/alias-priors/alias-declaration-en.json", import.meta.url);
const SKIP = existsSync(PRIOR_PATH) ? undefined : `live_priors is not checked out as a sibling of this repo: ${PRIOR_PATH}`;
const PRIOR = SKIP ? null : JSON.parse(readFileSync(PRIOR_PATH, "utf8"));
const SHAPES = SKIP ? null : shapesFrom(PRIOR, { minConfirmRate: 0.3, minFires: 100 });

const MIN = 2;
const run = (t) => declaredAliases(t, { splitSentences, minUses: MIN, shapes: SHAPES });

test("a glossed name the text goes on to use is admitted, with its address", { skip: SKIP }, () => {
  const t = "The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected by the board.";
  const { aliases } = run(t);
  const a = aliases.find((x) => x.alias === "RTA");
  assert.ok(a, "RTA should be admitted");
  assert.ok(a.full.endsWith("Regional Transit Authority"), `full was ${a.full}`);
  assert.equal(t.slice(a.start, a.end), a.sentence, "the address must read back from the bytes");
});

test("an initialism is admitted as ONE SUBTYPE of alias, with no rule about initials", { skip: SKIP }, () => {
  // The alias here shares no initials with its full name at all; it is
  // admitted on exactly the same evidence as RTA above — the text declared
  // it and then used it. Nothing in the organ knows what an acronym is.
  const t = "The Riverside Housing Trust (the Trust) filed a budget. The Trust later resubmitted it.";
  const { aliases } = run(t);
  assert.ok(aliases.some((x) => x.alias === "the Trust"), "a non-initial short form is an alias too");
});

test("a gloss the text never uses again is refused, not dropped silently", { skip: SKIP }, () => {
  const t = "The Regional Transit Authority (RTA) covers downtown. Nothing further was said.";
  const { aliases, refused } = run(t);
  assert.equal(aliases.length, 0);
  assert.equal(refused.find((r) => r.alias === "RTA")?.why, ALIAS_REFUSALS.USED_ONCE);
});

test("a parenthetical that is not a name is refused", { skip: SKIP }, () => {
  const t = "The County Commission (which met on Tuesday night after a long debate) voted. The County Commission voted again.";
  const { aliases, refused } = run(t);
  assert.equal(aliases.length, 0);
  assert.ok(refused.some((r) => r.why === ALIAS_REFUSALS.NOT_A_NAME));
});

test("a year in parentheses is never an alias", { skip: SKIP }, () => {
  const t = "The Riverside Housing Trust (2026) filed. The 2026 filing was late and 2026 was busy.";
  const { aliases } = run(t);
  assert.equal(aliases.length, 0);
});

test("every floor and the vocabulary itself are declared by the caller, never here", { skip: SKIP }, () => {
  assert.throws(() => declaredAliases("x", { splitSentences, shapes: SHAPES }), /minUses is declared/);
  assert.throws(() => declaredAliases("x", { minUses: 2, shapes: SHAPES }), /splitSentences is injected/);
  assert.throws(() => declaredAliases("x", { splitSentences, minUses: 2 }), /shapes are received/);
  assert.throws(() => shapesFrom({ schema: "Nope" }, { minConfirmRate: 0.3, minFires: 1 }), /AliasDeclarationPrior@1 is received/);
  assert.throws(() => shapesFrom(PRIOR, {}), /declared by the caller/);
});

test("the prior is received with its giver, and its shapes carry the evidence that earned them", { skip: SKIP }, () => {
  assert.equal(PRIOR.schema, "AliasDeclarationPrior@1");
  assert.ok(PRIOR.provenance?.built_by, "a prior names what built it");
  assert.ok(PRIOR.provenance?.files_read > 0, "a prior names how much it read");
  assert.ok(SHAPES.length >= 1, "at least one shape cleared the declared floors");
  for (const sh of SHAPES) assert.ok(sh.evidence.fires > 0 && sh.evidence.confirm_rate > 0, `${sh.id} carries its evidence`);
});

test("a shape the corpus never confirmed does not reach the reader", { skip: SKIP }, () => {
  // "short for" and "d/b/a" never fired in the corpus; at any honest floor
  // they are absent, and their absence is readable in the prior itself.
  const ids = SHAPES.map((s) => s.id);
  assert.ok(!ids.includes("short-for"), "a never-firing shape is not offered");
  assert.equal(PRIOR.shapes["short-for"].fires, 0, "and the prior says why");
});

test("two fulls glossed to one alias are both kept, never resolved for the reader", { skip: SKIP }, () => {
  const t = "The Regional Transit Authority (RTA) met. The River Trail Association (RTA) also met. RTA is ambiguous here and RTA recurs.";
  const { aliases } = run(t);
  const idx = aliasIndex(aliases);
  const e = idx.get("rta");
  assert.ok(e, "RTA should be indexed");
  assert.equal(e.fulls.length, 2, "both full names are kept");
});

test("real prose from a fetched page: the material's own declarations are read", { skip: SKIP }, () => {
  const t = "Concerns intensified this week. The Regional Transit Authority (RTA) manages the district. RTA officials confirmed the change, and RTA submitted a revised budget.";
  const { aliases } = run(t);
  const a = aliases.find((x) => x.alias === "RTA");
  assert.ok(a);
  assert.ok(a.full.endsWith("Regional Transit Authority"), `full was ${a.full}`);
  assert.ok(a.uses >= 3, `RTA is used ${a.uses} times`);
});

test("a sentence organ that carries no offsets yields no alias — an address that cannot be verified is never shipped", { skip: SKIP }, () => {
  // spans.js's splitSentences returns text without a start; P5.2 says an
  // address that does not read back is refused, and this is that refusal
  // reached from the one direction a caller can actually cause.
  const t = "The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected.";
  const { aliases, refused } = declaredAliases(t, { splitSentences: offsetlessSentences, minUses: 2, shapes: SHAPES });
  assert.equal(aliases.length, 0);
  assert.equal(refused[0]?.why, ALIAS_REFUSALS.ADDRESS_UNVERIFIED);
});

// ── licenseAliases: a declaration is a shape; sameness is earned apart ─────────
// These walls need no prior: they take the declaration notes in, so they run wherever this repo does. The planted cases are the
// shapes real prose was measured to put through declaredAliases as "aliases" (alias-precision-RESULTS.md), each beside a true
// alias that must survive — a wall that refuses everything passes the refusals and fails the survivals.
const notesOf = (t, full, alias) => {
  const found = splitSentences(t).filter((x) => x.text.includes(`${full} (${alias})`));
  assert.ok(found.length, `the text declares ${full} (${alias})`);
  return found.map((s) => ({ full, alias, sentence: s.text, start: s.start, end: s.start + s.text.length, shape: "parenthetical", uses: 2 }));
};
const license = (t, pairs) => licenseAliases(pairs.flatMap(([f, a]) => notesOf(t, f, a)), t, { splitSentences });
const whys = (r) => r.refused.map((x) => `${x.alias}:${x.why}`).sort();

test("an initialism the text uses in place of the full is licensed; so is a nickname", () => {
  const a = license("The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected by the board.", [["Regional Transit Authority", "RTA"]]);
  assert.equal(a.licensed.length, 1);
  assert.deepEqual(a.refused, []);
  const b = license("Elizabeth Hart (Liz) joined the club last year. Liz is allergic to eggs. Elizabeth Hart keeps the keys.", [["Elizabeth Hart", "Liz"]]);
  assert.equal(b.licensed.length, 1, "the nickname is used in place of the full name, never beside it");
});

test("SHARED_LABEL: a gloss declared against more than one distinct full is a label, not a name", () => {
  const t = "Malta (Catholic) is small. Argentina (Catholic) is large. The Catholic vote differs. Catholic schools differ.";
  const r = license(t, [["Malta", "Catholic"], ["Argentina", "Catholic"]]);
  assert.equal(r.licensed.length, 0);
  assert.deepEqual(whys(r), ["Catholic:shared-label", "Catholic:shared-label"]);
  assert.deepEqual(r.refused[0].fulls, ["argentina", "malta"], "the evidence names the fulls it was declared against");
});

test("CO_PRESENT: a full and a gloss that stand together in another sentence are two things", () => {
  const t = "Paris (France) is large. France borders Spain. In Paris, France, the river runs west. France is old.";
  const r = license(t, [["Paris", "France"]]);
  assert.deepEqual(whys(r), ["France:co-present"]);
  assert.match(r.refused[0].together, /Paris, France/, "the sentence that kept them apart is the evidence");
  // the same pair declared again is a re-declaration, not co-presence
  const t2 = "The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected. The Regional Transit Authority (RTA) met again.";
  const again = license(t2, [["Regional Transit Authority", "RTA"]]);
  assert.deepEqual(again.refused, [], "a declaration of the same pair in another sentence is not co-presence");
  assert.equal(again.licensed.length, 2, "both declarations are licensed, each with its own address");
});

test("NOT_NAME_BEHAVED: a gloss written lowercase is a description, and a capitalised one used lowercase elsewhere is a common word", () => {
  const t = "Eric Watkins (philosopher) wrote a book. The philosopher wrote more. MARTHE (kommt). Kommt again and kommt.";
  const r = license(t, [["Eric Watkins", "philosopher"], ["MARTHE", "kommt"]]);
  assert.deepEqual(whys(r), ["kommt:not-name-behaved", "philosopher:not-name-behaved"]);
  const t2 = "Nashville (Music City) hosts a festival. Tourists love music city nights, and music city grows.";
  const r2 = license(t2, [["Nashville", "Music City"]]);
  assert.deepEqual(whys(r2), ["Music City:not-name-behaved"]);
  assert.match(r2.refused[0].use, /music city/, "the lowercase use is the evidence");
});

test("an initialism is not tested against its lowercase twin; a script without case never trips the lowercase wall", () => {
  const t = "The United States (US) signed the treaty. They gave us a chance. The US signed again.";
  assert.equal(license(t, [["United States", "US"]]).licensed.length, 1, "US is not us");
  const t2 = "東京都 (東京) is large. 東京 has many people.";
  assert.equal(license(t2, [["東京都", "東京"]]).licensed.length, 1, "no cased letter, nothing to be lowercase");
});

test("a refusal keeps the declaration and its address — nothing is dropped silently", () => {
  const t = "Paris (France) is large. In Paris, France, the river runs west. France is old.";
  const r = license(t, [["Paris", "France"]]);
  const x = r.refused[0];
  assert.equal(t.slice(x.start, x.end), x.sentence, "the address still reads back from the bytes");
  assert.throws(() => licenseAliases([], t, {}), /splitSentences is injected/);
});

test("declaredAliases admits the false shapes and licenseAliases refuses them, beside a true alias that survives", { skip: SKIP }, () => {
  const t = "Paris (France) is large. France borders Spain. In Paris, France, the river runs west. The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected. "
    + "Eric Watkins (philosopher) wrote a book. The philosopher wrote more. Malta (Catholic) is small. Argentina (Catholic) is large. Catholic schools differ.";
  const { aliases } = run(t);
  const admitted = aliases.map((x) => x.alias).sort();
  for (const want of ["France", "RTA", "philosopher", "Catholic"]) assert.ok(admitted.includes(want), `the declaration reader admits ${want} (that is the measured gap)`);
  const { licensed } = licenseAliases(aliases, t, { splitSentences });
  assert.deepEqual(licensed.map((x) => x.alias), ["RTA"], "only the alias the text uses in place of its full survives");
});

