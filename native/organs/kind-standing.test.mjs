import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { contextVectors, cosine, kindFit, kindMembership, foldPermitted } from "../eoreader7/native/organs/index.js";

const LP = "/Users/mlacy/Documents/3.0/live_priors";
const BOOK = `${LP}/01-literature-books/gutenberg/pg345_Dracula.txt`;
const ALPHA = 0.05; // declared once for every case below, never defaulted in the module

const sent = (t, i) => ({ text: t, order: i });
const corpus = (lines) => lines.map(sent);

test("contextVectors: company only — the token before and after, sentence edges included", () => {
  const v = contextVectors(corpus(["We went to Whitby that day.", "Whitby was cold."]), ["Whitby"]);
  const w = v.get("Whitby");
  assert.equal(w.get("before=to"), 1);
  assert.equal(w.get("before=^"), 1, "sentence-initial is its own token, so position is evidence");
  assert.equal(w.get("after=was"), 1);
});

test("contextVectors: a surface with no occurrence gets no entry at all, never an empty one", () => {
  const v = contextVectors(corpus(["Nothing here."]), ["Whitby"]);
  assert.equal(v.has("Whitby"), false);
});

test("counts, not sets: a swamped context still contributes, and cosine reflects the shape", () => {
  const v = contextVectors(corpus([
    "At Whitby we waited.", "At Whitby again.", "At Whitby once more.",
    "Helsing spoke to Whitby.",
  ]), ["Whitby"]);
  const w = v.get("Whitby");
  assert.equal(w.get("before=at"), 3, "the dominant company keeps its weight");
  assert.equal(w.get("before=to"), 1, "the rare company is not erased — a set would flatten these to equal");
});

test("kindFit leaves the candidate out, so a declared member is never scored against itself", () => {
  const v = contextVectors(corpus([
    "We sailed to Varna.", "We sailed to Whitby.", "We sailed to Exeter.",
  ]), ["Varna", "Whitby", "Exeter"]);
  const f = kindFit("Varna", ["Varna", "Whitby", "Exeter"], v);
  assert.ok(f > 0.9, "identical company should read as a near-perfect fit");
  assert.equal(kindFit("Varna", ["Varna"], v), null, "a kind of only the candidate itself has no evidence");
});

test("alpha is never defaulted — an undeclared threshold throws (P4)", () => {
  const v = contextVectors(corpus(["At Whitby."]), ["Whitby"]);
  assert.throws(() => kindMembership("Whitby", ["Whitby"], v, {}), /alpha must be declared/);
});

test("a referent with no profile is UNKNOWN, never 'not a member'", () => {
  const v = contextVectors(corpus(["We sailed to Varna.", "We sailed to Whitby."]), ["Varna", "Whitby"]);
  const r = kindMembership("Nowhere", ["Varna", "Whitby"], v, { alpha: ALPHA });
  assert.equal(r.verdict, "unknown");
  assert.equal(r.reason, "no_profile");
});

test("foldPermitted ALLOWS on absent standing — a thin profile is a fact about the reader", () => {
  const v = contextVectors(corpus(["We sailed to Varna.", "We sailed to Whitby."]), ["Varna", "Whitby"]);
  const r = foldPermitted("Varna", "Nowhere", ["Varna", "Whitby"], v, { alpha: ALPHA });
  assert.equal(r.permitted, true);
  assert.equal(r.reason, "no_standing", "absence of evidence never refuses a fold");
});

// ── against the real book, real organs, no fixtures ──────────────────────
const haveBook = fs.existsSync(BOOK);
const PLACES = ["London", "Transylvania", "Bukovina", "Bistritz", "England", "Exeter", "Purfleet", "Carfax", "Whitby", "Varna"];

async function realVectors() {
  const { loadOrgans } = await import(`${LP}/scripts/eot-digest.mjs`);
  const organs = await loadOrgans();
  const { stripContainer, stripItalicsMarkup } = await import("./source.js");
  const body = stripItalicsMarkup(stripContainer(fs.readFileSync(BOOK, "utf8")).text);
  const sentences = organs.spans.splitSentences(body);
  const surfaces = organs.surfaces.extractSurfaces(sentences, {}).filter((e) => e.mentions >= 5).map((e) => e.surface);
  return contextVectors(sentences, surfaces);
}

test("THE SPECIMEN: Castle Dracula reads as a place, Count Dracula does not", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const castle = kindMembership("Castle Dracula", PLACES, v, { alpha: ALPHA });
  const count = kindMembership("Count Dracula", PLACES, v, { alpha: ALPHA });
  assert.equal(castle.verdict, "member", `Castle Dracula p=${castle.p}`);
  assert.equal(count.verdict, "not_member", `Count Dracula p=${count.p}`);
  assert.ok(castle.fit > count.fit * 2, "and the separation is wide, not marginal");
});

test("THE FIX: the fold that started this is now refused, on positive evidence", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const r = foldPermitted("Castle Dracula", "Count Dracula", PLACES, v, { alpha: ALPHA });
  assert.equal(r.permitted, false);
  assert.equal(r.reason, "different_kind");
});

test("CONTROL: real people are never read as places", { skip: !haveBook }, async () => {
  const v = await realVectors();
  for (const person of ["Van Helsing", "Mina", "Lucy", "Renfield"]) {
    assert.equal(kindMembership(person, PLACES, v, { alpha: ALPHA }).verdict, "not_member", person);
  }
});

test("CONTROL: the kind recovers its own declared members — 9 of 10, and the tenth is disclosed", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const verdicts = PLACES.map((p) => [p, kindMembership(p, PLACES, v, { alpha: ALPHA }).verdict]);
  const members = verdicts.filter(([, x]) => x === "member").map(([p]) => p);
  assert.ok(members.length >= 9, `expected >=9 recovered, got ${members.length}: ${JSON.stringify(verdicts)}`);
  // Purfleet is genuinely marginal (p ~ 0.10) and is reported, never rounded in.
  assert.equal(members.includes("Purfleet"), false, "the marginal member stays marginal — this test pins the disclosure, not a pass");
});

test("THE JUDGE SHUFFLED (II.23 on this test's own number): a RANDOM declared kind must not recover 9 of 10", { skip: !haveBook }, async () => {
  // "9 of 10 recover" is only evidence if a random set of ten referents,
  // declared as a kind, does NOT also recover ~9 of itself. This is the
  // same question the oracle run put to P60's judge, asked of this
  // module's own headline: what does a shuffle score? Six random kinds,
  // seeded, drawn from the same population the real kind sits in.
  const v = await realVectors();
  const pool = [...v.keys()].filter((s) => !PLACES.includes(s));
  let seed = 13; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const recoveries = [];
  for (let k = 0; k < 6; k++) {
    const shuffled = [...pool]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const kind = shuffled.slice(0, 10);
    recoveries.push(kind.filter((m) => kindMembership(m, kind, v, { alpha: ALPHA }).verdict === "member").length);
  }
  recoveries.sort((a, b) => a - b);
  const median = recoveries[3];
  // the real kind recovers 9; a random kind recovering as well would mean
  // the membership test rewards ANY declared set — the number would be void
  assert.ok(median <= 6, `random kinds recover a median of ${median}/10 (draws ${JSON.stringify(recoveries)}) — must sit well below the real kind's 9`);
});

test("DISCLOSED LIMIT: a thin profile lands not_member for want of evidence — East/West Cliff is NOT closed", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const cliff = kindMembership("East Cliff", PLACES, v, { alpha: ALPHA });
  assert.equal(cliff.verdict, "not_member");
  assert.ok(cliff.p > 0.5, `East Cliff sits mid-population (p=${cliff.p}) — too few mentions to read, which is a fact about the reader`);
});

// ── discovered company-kinds (2026-09-01) ────────────────────────────────
import { discoverCompanyKinds, kindNotes, frameWords } from "../eoreader7/native/organs/index.js";

// A synthetic heard stream with DECLARED ground truth: roleA/roleB/roleC
// always follow "zub" (an invented frame word — no English smuggled);
// nameX/nameY/nameZ open their sentences and never follow zub.
const framed = [];
// 30 rounds -> 10 mentions per word: enough that a shuffled before-token
// cannot reach the share floor by chance (the first cut used 4 mentions and
// the control CAUGHT a chance kind at exactly 0.50 — the control working)
for (let i = 0; i < 30; i++) {
  framed.push({ text: `zub role${"abc"[i % 3]} spoke plainly today` });
  framed.push({ text: `name${"xyz"[i % 3]} walked to the river bend` });
}
const VOCAB = ["rolea", "roleb", "rolec", "namex", "namey", "namez"];
const FLOORS = { minMentions: 3, minShare: 0.5, minMembers: 2 };

test("discoverCompanyKinds: the kind names itself by its own signature, floors declared, nothing taught", () => {
  assert.throws(() => discoverCompanyKinds(framed, VOCAB, { minShare: 0.5, minMembers: 2 }), /must be declared/);
  const kinds = discoverCompanyKinds(framed, VOCAB, FLOORS);
  const zub = kinds.find((k) => k.name === "kind:before=zub");
  const initial = kinds.find((k) => k.name === "kind:before=^");
  assert.ok(zub, "the frame kind is discovered and named by its own signature");
  assert.deepEqual([...zub.members].sort(), ["rolea", "roleb", "rolec"]);
  assert.ok(initial, "the sentence-initial kind is discovered too");
  assert.deepEqual([...initial.members].sort(), ["namex", "namey", "namez"]);
});

test("II.23 CONTROL, built to fail: shuffling words within sentences dissolves every kind at the same floors", () => {
  // marginals preserved, company destroyed — a seeded LCG, no Math.random
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const shuffled = framed.map((s) => {
    const w = s.text.split(" ");
    for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
    return { text: w.join(" ") };
  });
  const kinds = discoverCompanyKinds(shuffled, VOCAB, FLOORS);
  // under shuffle no word keeps a dominant before-company at the declared
  // share floor — if kinds survive this, the statistic is not reading
  // company and the mechanism is unlicensed (II.23)
  assert.equal(kinds.length, 0, `kinds must dissolve under shuffle, got: ${kinds.map((k) => k.name).join(", ")}`);
});

test("frameWords is structural, not an English list: word-signed kinds are frames, position-signed kinds are not", () => {
  const kinds = discoverCompanyKinds(framed, VOCAB, FLOORS);
  const frames = frameWords(kinds);
  assert.deepEqual([...frames].sort(), ["rolea", "roleb", "rolec"], "only the zub-framed words");
  assert.ok(!frames.has("namex"), "a sentence-initial (position-signed) kind never marks its members as frames");
});

test("kindNotes projects a discovered kind into hyperlexicon-hearable, ADDRESSABLE assertions", async () => {
  const kinds = discoverCompanyKinds(framed, VOCAB, FLOORS);
  assert.throws(() => kindNotes(kinds), /witness.*must be named/);
  const notes = kindNotes(kinds, { witness: "synthetic-chronicle" });
  const n = notes.find((x) => x.subject === "rolea");
  assert.equal(n.verb, "keeps-company");
  assert.equal(n.object, "kind:before=zub");
  assert.match(n.because, /before=zub carries \d+% of its before-company/);
  // the address: two organs asking about the same membership get one id
  const { assertionId } = await import("./hyperlexicon.js");
  assert.equal(assertionId(n.subject, n.verb, n.object), assertionId("Rolea", "keeps-company", "KIND:BEFORE=ZUB"));
});

test("a discovered kind lands in the REAL hyperlexicon: one addressable note, witnesses UNIONED across sources", async () => {
  // the whole point of naming the kind: two independent sources that both
  // discover it fold to ONE note with TWO witnesses — kind membership is
  // itself a corroboratable note, riding the same door facts ride (P57).
  const H = await import("./hyperlexicon.js");
  const TL = await import("../eoreader7/native/kernel/task-log.js");
  const hl = H.makeHyperlexicon(TL);
  let log = hl.createHyperlexicon();
  const mk = (share, w) => kindNotes(
    [{ name: "kind:before=zub", signature: "before=zub", members: ["rolea"], share: new Map([["rolea", share]]) }],
    { witness: w });
  for (const n of mk(0.61, "chronicle-a(heard)")) log = hl.hear(log, n);
  for (const n of mk(0.55, "chronicle-b(heard)")) log = hl.hear(log, n);
  const folded = hl.foldHyperlexicon(log);
  assert.equal(folded.length, 1, "two sightings, one note");
  assert.equal(folded[0].id, "rolea|keeps-company|kind:before=zub", "the kind is addressable by its own name");
  assert.deepEqual(folded[0].witnesses.sort(), ["chronicle-a(heard)", "chronicle-b(heard)"], "witnesses unioned, never replaced");
});

test("P79's DECLARED place-kind is RECOVERED from nothing: discovered locative kinds on the real book contain most of it", { skip: !haveBook }, async () => {
  // The kind foldPermitted was validated against was typed by hand
  // (PLACES). Run discoverCompanyKinds over the book's own recurring
  // surfaces, taught nothing, under the null arm: the kinds signed by
  // locative frames (before=at, before=in) should contain the declared
  // places — the hand list was a reading of structure the material
  // carries on its own.
  const { loadOrgans } = await import(`${LP}/scripts/eot-digest.mjs`);
  const organs = await loadOrgans();
  const { stripContainer, stripItalicsMarkup } = await import("./source.js");
  const body = stripItalicsMarkup(stripContainer(fs.readFileSync(BOOK, "utf8")).text);
  const sentences = organs.spans.splitSentences(body);
  const surfaces = organs.surfaces.extractSurfaces(sentences, {}).filter((e) => e.mentions >= 5).map((e) => e.surface);
  const kinds = discoverCompanyKinds(sentences, surfaces, { minMentions: 5, minShare: 0.2, minMembers: 2, nullArm: { draws: 60, seed: 0, alpha: 0.05 } });
  const locative = kinds.filter((k) => ["before=at", "before=in", "before=to", "before=from"].includes(k.signature));
  const found = new Set(locative.flatMap((k) => k.members));
  const recovered = PLACES.filter((p) => found.has(p) || found.has(p + "a") || [...found].some((f) => f.startsWith(p)));
  assert.ok(locative.length >= 2, `locative kinds discovered: ${kinds.map((k) => k.name).join(", ")}`);
  assert.ok(recovered.length >= 6, `at least 6 of the 10 declared places recovered from nothing; got ${recovered.length}: ${recovered.join(", ")}`);
  // and a person never lands in a locative kind
  for (const person of ["Lucy", "Jonathan", "Arthur", "Renfield"]) assert.ok(!found.has(person), `${person} is not a place`);
  // DISCLOSED LIMIT: the flagship surface's own company is split across
  // prepositions (at/to/of Castle Dracula), so no single locative signature
  // reaches 0.2 for it — fold-gate still needs the DECLARED kind for that
  // pair. A locative super-kind (signatures that frame the same members)
  // is the named next step, not built here.
  assert.ok(!found.has("Castle Dracula"), "pinned as a limit: the flagship is not yet discoverable at one-signature grain");
});
