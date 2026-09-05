// aliases.test.mjs — the walls, against the REAL sentence organ and real prose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "./grounding.js";
import { splitSentences as offsetlessSentences } from "../adapters/text/spans.js";
import { declaredAliases, aliasIndex, shapesFrom, ALIAS_REFUSALS } from "./aliases.js";
import { readFileSync } from "node:fs";

// The REAL prior, as live_priors built it — never a fixture written here.
const PRIOR = JSON.parse(readFileSync("/home/user/live_priors/derived-priors/alias-priors/alias-declaration-en.json", "utf8"));
const SHAPES = shapesFrom(PRIOR, { minConfirmRate: 0.3, minFires: 100 });

const MIN = 2;
const run = (t) => declaredAliases(t, { splitSentences, minUses: MIN, shapes: SHAPES });

test("a glossed name the text goes on to use is admitted, with its address", () => {
  const t = "The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected by the board.";
  const { aliases } = run(t);
  const a = aliases.find((x) => x.alias === "RTA");
  assert.ok(a, "RTA should be admitted");
  assert.ok(a.full.endsWith("Regional Transit Authority"), `full was ${a.full}`);
  assert.equal(t.slice(a.start, a.end), a.sentence, "the address must read back from the bytes");
});

test("an initialism is admitted as ONE SUBTYPE of alias, with no rule about initials", () => {
  // The alias here shares no initials with its full name at all; it is
  // admitted on exactly the same evidence as RTA above — the text declared
  // it and then used it. Nothing in the organ knows what an acronym is.
  const t = "The Riverside Housing Trust (the Trust) filed a budget. The Trust later resubmitted it.";
  const { aliases } = run(t);
  assert.ok(aliases.some((x) => x.alias === "the Trust"), "a non-initial short form is an alias too");
});

test("a gloss the text never uses again is refused, not dropped silently", () => {
  const t = "The Regional Transit Authority (RTA) covers downtown. Nothing further was said.";
  const { aliases, refused } = run(t);
  assert.equal(aliases.length, 0);
  assert.equal(refused.find((r) => r.alias === "RTA")?.why, ALIAS_REFUSALS.USED_ONCE);
});

test("a parenthetical that is not a name is refused", () => {
  const t = "The County Commission (which met on Tuesday night after a long debate) voted. The County Commission voted again.";
  const { aliases, refused } = run(t);
  assert.equal(aliases.length, 0);
  assert.ok(refused.some((r) => r.why === ALIAS_REFUSALS.NOT_A_NAME));
});

test("a year in parentheses is never an alias", () => {
  const t = "The Riverside Housing Trust (2026) filed. The 2026 filing was late and 2026 was busy.";
  const { aliases } = run(t);
  assert.equal(aliases.length, 0);
});

test("every floor and the vocabulary itself are declared by the caller, never here", () => {
  assert.throws(() => declaredAliases("x", { splitSentences, shapes: SHAPES }), /minUses is declared/);
  assert.throws(() => declaredAliases("x", { minUses: 2, shapes: SHAPES }), /splitSentences is injected/);
  assert.throws(() => declaredAliases("x", { splitSentences, minUses: 2 }), /shapes are received/);
  assert.throws(() => shapesFrom({ schema: "Nope" }, { minConfirmRate: 0.3, minFires: 1 }), /AliasDeclarationPrior@1 is received/);
  assert.throws(() => shapesFrom(PRIOR, {}), /declared by the caller/);
});

test("the prior is received with its giver, and its shapes carry the evidence that earned them", () => {
  assert.equal(PRIOR.schema, "AliasDeclarationPrior@1");
  assert.ok(PRIOR.provenance?.built_by, "a prior names what built it");
  assert.ok(PRIOR.provenance?.files_read > 0, "a prior names how much it read");
  assert.ok(SHAPES.length >= 1, "at least one shape cleared the declared floors");
  for (const sh of SHAPES) assert.ok(sh.evidence.fires > 0 && sh.evidence.confirm_rate > 0, `${sh.id} carries its evidence`);
});

test("a shape the corpus never confirmed does not reach the reader", () => {
  // "short for" and "d/b/a" never fired in the corpus; at any honest floor
  // they are absent, and their absence is readable in the prior itself.
  const ids = SHAPES.map((s) => s.id);
  assert.ok(!ids.includes("short-for"), "a never-firing shape is not offered");
  assert.equal(PRIOR.shapes["short-for"].fires, 0, "and the prior says why");
});

test("two fulls glossed to one alias are both kept, never resolved for the reader", () => {
  const t = "The Regional Transit Authority (RTA) met. The River Trail Association (RTA) also met. RTA is ambiguous here and RTA recurs.";
  const { aliases } = run(t);
  const idx = aliasIndex(aliases);
  const e = idx.get("rta");
  assert.ok(e, "RTA should be indexed");
  assert.equal(e.fulls.length, 2, "both full names are kept");
});

test("real prose from a fetched page: the material's own declarations are read", () => {
  const t = "Concerns intensified this week. The Regional Transit Authority (RTA) manages the district. RTA officials confirmed the change, and RTA submitted a revised budget.";
  const { aliases } = run(t);
  const a = aliases.find((x) => x.alias === "RTA");
  assert.ok(a);
  assert.ok(a.full.endsWith("Regional Transit Authority"), `full was ${a.full}`);
  assert.ok(a.uses >= 3, `RTA is used ${a.uses} times`);
});

test("a sentence organ that carries no offsets yields no alias — an address that cannot be verified is never shipped", () => {
  // spans.js's splitSentences returns text without a start; P5.2 says an
  // address that does not read back is refused, and this is that refusal
  // reached from the one direction a caller can actually cause.
  const t = "The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected.";
  const { aliases, refused } = declaredAliases(t, { splitSentences: offsetlessSentences, minUses: 2, shapes: SHAPES });
  assert.equal(aliases.length, 0);
  assert.equal(refused[0]?.why, ALIAS_REFUSALS.ADDRESS_UNVERIFIED);
});
