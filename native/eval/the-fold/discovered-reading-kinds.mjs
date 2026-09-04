// discovered-reading-kinds.mjs — the reading rule is not developed. It is
// DISCOVERED, by the same organ that discovers kinds of words, pointed at a
// stream of lines.
//
// THE CORRECTION THIS IS BUILT ON (user, 2026-09-03): "the system isn't
// developing a rule. it's discovering it." The previous design had a model
// propose a rule and a gate verify it — which is still developing, with a
// filter bolted on. The model would be the author, and the material would be
// only the judge. Discovery is the other way round: the regularity is already
// IN the material, and the organ's job is to find which regularities are real.
//
// AND THE ORGAN ALREADY EXISTS. `kind-standing.js::discoverCompanyKinds`
// groups words by the dominant `before=` feature of their own company, names
// each kind BY ITS OWN SIGNATURE (`kind:before=the`), and carries an II.23
// null arm that dissolves a kind whose share is reachable when company is
// destroyed. Nothing is taught to it; nothing is proposed to it. Its own
// header says a non-text caller declares its own cleaner, which is the seam
// that lets a different stream through.
//
// SO THE STREAM CHANGES AND THE ORGAN DOES NOT. A document becomes one
// sequence; its tokens are its LINES, each written as its own shape (characters
// collapsed to classes, so no letter, digit or mark keeps its identity and the
// stream is blind to language and format alike). "Company" is then what kind of
// line precedes this kind of line — and a discovered kind is a REGULARITY OF
// ARRANGEMENT the document has, named by its own signature.
//
// THE ORACLE ONLY SCORES. Discovery never sees it. The HTML's own structural
// classes say what each line is; that channel `extractReadable` throws away,
// so no reader here can reach it. It is used ONLY to ask, afterwards, whether
// a discovered kind happens to separate prose from furniture — never to find
// one, never to pick among them.
//
// WHAT "MORE SIGNAL THAN NOISE" MEANS HERE, and it is not a preference: a kind
// clears only if its own null arm admitted it (its members' company shares beat
// what shuffling the document's line order produces) AND its prose share
// differs from the document's base rate by more than the same shuffle produces.
// Two nulls, one at discovery and one at scoring, because clearing the first
// says the kind is real and says nothing about whether it is USEFUL.
//
//   node discovered-reading-kinds.mjs   env: PAGES - MIN_SHARE - MIN_MEMBERS - DRAWS - ALPHA - CAP
import { readFileSync } from "node:fs";
import { oracleFor } from "./region-oracle.mjs";


const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const REFS = (process.env.PAGES ?? "wikipedia-battle-of-borodino.html,wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html").split(",");
// Cap 4 is the value this driver's own results document derives and reports
// against — the smallest cap whose maximum marginal share falls below 0.5 on
// every page. The default had drifted to 2, so a plain run reproduced kinds
// the document never describes (`la_` where it reports `la_a_`). The marginal
// table that chooses it is a fact about shapes, not about any oracle.
const CAP = Number(process.env.CAP ?? 4);
const MIN_MENTIONS = Number(process.env.MIN_MENTIONS ?? 4);
const MIN_SHARE = Number(process.env.MIN_SHARE ?? 0.4);
const MIN_MEMBERS = Number(process.env.MIN_MEMBERS ?? 2);
const DRAWS = Number(process.env.DRAWS ?? 40);
const ALPHA = Number(process.env.ALPHA ?? 0.05);
const SEED = Number(process.env.SEED ?? 0);
const SPANS_PER_NOTE = Number(process.env.SPANS_PER_NOTE ?? 3);
// The review runs at its OWN declared standard, defaulting to the one
// discovery used. A reader who tightens it is changing the standard, not
// discovering a refutation, and a concession made under a tightened standard
// says so in its own trigger — the two are different acts and the record must
// not conflate them.
const REVIEW_MIN_SHARE = Number(process.env.REVIEW_MIN_SHARE ?? MIN_SHARE);

const { discoverCompanyKinds, kindNotes } = await import(`${NATIVE}/organs/kind-standing.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { sourceOfWitness, recipeOfWitness } = await import(`${NATIVE}/kernel/notes.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const T = await import(`${NATIVE}/kernel/task-log.js`);
const hl = makeHyperlexicon({ createTaskLog: T.createTaskLog, append: T.append, projectTasks: T.projectTasks, ENTRY_KINDS: T.ENTRY_KINDS, OPERATOR_BASIS: T.OPERATOR_BASIS, GRAINS, cellOf });
const RECIPE = `shape-cap${CAP}-share${MIN_SHARE}-null${DRAWS}@${ALPHA}`;
let ledger = hl.createHyperlexicon({ frame: { probe: "discovered-reading-kinds", cap: CAP, minShare: MIN_SHARE, nullArm: { draws: DRAWS, alpha: ALPHA, seed: SEED } } });
const perPage = new Map();

// A line's shape. Characters collapsed to classes, runs collapsed, capped,
// plus a length bucket. Nothing here is a word of any language.
const lineShape = (s) => {
  const cls = String(s).trim().replace(/[\p{L}\p{M}]+/gu, "a").replace(/\p{N}+/gu, "0").replace(/\s+/gu, "_").replace(/[^a0_]+/gu, ".");
  const n = String(s).trim().length;
  return `${n < 24 ? "S" : n < 72 ? "M" : "L"}${cls.replace(/(.)\1+/g, "$1").slice(0, CAP)}`;
};

// The organ's `clean` default strips non-letter edges — a TEXT prior its own
// header names. A shape is not text, so this caller declares identity, which
// is exactly the seam the header describes.
const identity = (t) => t;

const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };

for (const ref of REFS) {
  const raw = readFileSync(`${FIX}${ref}`, "utf8");
  const { lines } = oracleFor(raw);
  // BYTE OFFSETS, because `admit` refuses an unaddressed edge — "no addressed
  // span backs it", P5.2 at the door, and it is right to. A discovered kind is
  // a measurement over many lines, but a MEMBERSHIP is witnessed at the places
  // that shape actually occurs, and those are addresses. Walk the extracted
  // text the same way the oracle does (normalize, drop empties) so index i is
  // the same line in both.
  const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
  const face = extractReadable(raw).text;
  const spanOf = [];
  { let at = 0;
    for (const l of face.split("\n")) {
      const t = l.replace(/\s+/g, " ").trim();
      // The kernel's OWN span shape: `at`, or `{ref,start,end}` from which it
      // builds `ref#start-end`. Read from `addressed()` rather than invented —
      // the first cut supplied {b0,b1,source} and every note was correctly
      // refused as unaddressed.
      // The text face additionally requires each span to carry its own TEXT
      // (hyperlexicon.js filters out any span whose text is empty) — a span that
      // cannot show its bytes cannot be self-verified. Read from the code, after
      // two wrong guesses at the shape.
      if (t) spanOf.push({ start: at, end: at + l.length, text: l });
      at += l.length + 1;
    } }
  const shapes = lines.map((l) => lineShape(l.text));
  const vocabulary = [...new Set(shapes)];
  // One document, one sequence. The organ's own shuffle null redeals within a
  // sequence — which for this stream is exactly "destroy the line order,
  // keep every line".
  const sentences = [{ text: shapes.join(" ") }];

  const kinds = discoverCompanyKinds(sentences, vocabulary, {
    minMentions: MIN_MENTIONS, minShare: MIN_SHARE, minMembers: MIN_MEMBERS,
    clean: identity, nullArm: { draws: DRAWS, seed: SEED, alpha: ALPHA },
  });

  const truth = lines.map((l) => l.kind === "prose");
  const base = truth.filter(Boolean).length / truth.length;
  console.log(`\n${ref}`);
  console.log(`  ${lines.length} lines, ${vocabulary.length} distinct shapes, base rate ${(100 * base).toFixed(1)}% prose`);
  console.log(`  ${kinds.length} kinds discovered and cleared their own null arm (draws ${DRAWS}, alpha ${ALPHA})`);

  if (!kinds.length) { console.log("  — nothing discovered at these declared floors"); continue; }

  // SCORING, and it is the oracle's ONLY appearance. For each discovered kind:
  // which lines belong (their shape is a member), and what share of those are
  // prose? Then the second null: shuffle the line ORDER, rediscover, and see
  // what prose-share separation a kind reaches by chance.
  const rowsFor = (kindMembers, shapeList) => {
    const mem = new Set(kindMembers);
    return shapeList.map((s, i) => (mem.has(s) ? i : -1)).filter((i) => i >= 0);
  };
  // The scoring null: the same kinds' member sets against a SHUFFLED oracle
  // labelling — which is the honest control for "does membership predict
  // prose", because it keeps the kind exactly and destroys only the pairing.
  const nullSeps = [];
  const r = rnd(SEED + 7);
  for (let d = 0; d < DRAWS; d += 1) {
    const shuffled = truth.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    let worst = 0;
    for (const k of kinds) {
      const idx = rowsFor(k.members, shapes);
      if (!idx.length) continue;
      const share = idx.filter((i) => shuffled[i]).length / idx.length;
      worst = Math.max(worst, Math.abs(share - base));
    }
    nullSeps.push(worst);
  }
  nullSeps.sort((a, b) => a - b);
  const ceiling = nullSeps[Math.min(nullSeps.length - 1, Math.ceil((1 - ALPHA) * nullSeps.length) - 1)];
  console.log(`  scoring null: the largest prose-share separation any kind reaches on a shuffled labelling is ${(100 * ceiling).toFixed(1)} points (${DRAWS} draws)`);

  const scored = kinds.map((k) => {
    const idx = rowsFor(k.members, shapes);
    const share = idx.length ? idx.filter((i) => truth[i]).length / idx.length : 0;
    return { k, idx, share, sep: Math.abs(share - base) };
  }).sort((a, b) => b.sep - a.sep);

  for (const { k, idx, share, sep } of scored) {
    const clears = sep > ceiling;
    console.log(`    ${clears ? "CLEARS " : "refused"}  ${k.name.padEnd(22)} ${String(idx.length).padStart(4)} lines  prose ${(100 * share).toFixed(0)}%  (base ${(100 * base).toFixed(0)}%, separation ${(100 * sep).toFixed(1)} pts)`);
    if (clears) {
      const sample = idx.slice(0, 3).map((i) => JSON.stringify(lines[i].text.slice(0, 56)));
      console.log(`               members: ${k.members.slice(0, 5).join(" ")}${k.members.length > 5 ? ` +${k.members.length - 5}` : ""}`);
      console.log(`               e.g. ${sample.join("  ")}`);
    }
  }
  const cleared = scored.filter((s) => s.sep > ceiling);
  console.log(`  => ${cleared.length} of ${kinds.length} kinds find more signal than noise on this page`);

  // LAND THEM. `kindNotes` is the existing projection — one note per
  // membership, subject the shape, verb "keeps-company", object the kind's own
  // name — so a discovered kind becomes an ADDRESSABLE note and a future organ
  // consults the address instead of re-deriving the measurement. The witness
  // carries the recipe (P68), so two pages read by the SAME instrument
  // corroborate as two sources and not as two instruments.
  // `kindNotes` builds the membership assertions; this caller supplies the
  // ADDRESSES, which is the half a kind-discovery organ cannot know. Up to
  // SPANS_PER_NOTE occurrences per membership — a declared budget, not every
  // occurrence, because a note carrying 271 spans is a list and not a witness.
  const shapeSpans = new Map();
  shapes.forEach((sh, i) => { if (spanOf[i]) { if (!shapeSpans.has(sh)) shapeSpans.set(sh, []); shapeSpans.get(sh).push(spanOf[i]); } });
  const addressed = kindNotes(cleared.map((c) => c.k), { witness: ref, recipe: RECIPE })
    .map((n) => ({ ...n, spans: (shapeSpans.get(n.subject) ?? []).slice(0, SPANS_PER_NOTE).map((sp) => ({ ...sp, ref })) }))
    .filter((n) => n.spans.length);
  const landed = hl.admit(ledger, addressed, { witness: `${ref}~${RECIPE}` });
  ledger = landed.log;
  console.log(`  landed ${landed.heard?.length ?? 0} membership note(s)${landed.turnedAway?.length ? `, ${landed.turnedAway.length} turned away (${landed.turnedAway[0].reason})` : ""}`);
  perPage.set(ref, { shapes, truth, base, cleared: cleared.map((c) => c.k) });
}

// ── born standing: what several pages independently discovered ───────────
console.log(`\n${"=".repeat(72)}\nBORN STANDING — a kind several sources independently discovered`);
const notes = hl.foldWithStanding(ledger);
const byKind = new Map();
for (const n of notes) {
  const srcs = new Set((n.witnesses ?? []).map(sourceOfWitness).filter(Boolean));
  const cur = byKind.get(n.end2) ?? { members: new Set(), sources: new Set() };
  cur.members.add(n.end1);
  for (const s of srcs) cur.sources.add(s);
  byKind.set(n.end2, cur);
}
for (const [kind, v] of [...byKind].sort((a, b) => b[1].sources.size - a[1].sources.size))
  console.log(`  ${v.sources.size >= 2 ? "STANDING" : "single  "}  ${kind.padEnd(22)} ${v.sources.size} source(s)  members ${[...v.members].join(" ")}`);

// ── REC: the gate re-run on the GROWN reading, and what lapses ───────────
// `reviewEntities`' own discipline, one register over: re-run the SAME gate
// against everything read so far. A kind that no longer clears is CONCEDED —
// not deleted, and its past is kept. Absence is not a refutation: a kind that
// simply does not occur in a new source is untouched, because failing to
// appear is a fact about that source and never evidence against the kind.
console.log(`\n${"=".repeat(72)}\nREVIEW — the same gate against the grown reading`);
const pooled = [...perPage.values()];
const pooledSentences = pooled.map((p) => ({ text: p.shapes.join(" ") }));
const pooledVocab = [...new Set(pooled.flatMap((p) => p.shapes))];
const grown = discoverCompanyKinds(pooledSentences, pooledVocab, {
  minMentions: MIN_MENTIONS, minShare: REVIEW_MIN_SHARE, minMembers: MIN_MEMBERS,
  clean: identity, nullArm: { draws: DRAWS, seed: SEED, alpha: ALPHA },
});
const tightened = REVIEW_MIN_SHARE !== MIN_SHARE;
if (tightened) console.log(`  NOTE: reviewing at minShare ${REVIEW_MIN_SHARE}, not the ${MIN_SHARE} discovery used — a concession here is the STANDARD changing, never the material refuting.`);
const stillClears = new Set(grown.map((k) => k.name));
console.log(`  pooled: ${pooledSentences.length} sources, ${pooledVocab.length} shapes -> ${grown.length} kinds clear the gate`);
let conceded = 0;
for (const [kind, v] of byKind) {
  if (stillClears.has(kind)) { console.log(`  holds     ${kind}`); continue; }
  // Only a kind whose shapes ARE PRESENT in the grown reading can lapse.
  const present = [...v.members].some((m) => pooledVocab.includes(m));
  if (!present) { console.log(`  untouched ${kind}  (its shapes do not occur in the grown reading — absence is not refutation)`); continue; }
  for (const n of notes.filter((x) => x.end2 === kind)) {
    // `concede` returns { log, refused, noop } — never a bare log. A refusal
    // is reported rather than swallowed: a concession that did not land is
    // exactly the thing a record must not silently imply happened.
    const r = hl.concede(ledger, n.id, { trigger: tightened
      ? `re-run over ${pooledSentences.length} pooled sources at a TIGHTENED standard (minShare ${MIN_SHARE} -> ${REVIEW_MIN_SHARE}): ${kind} no longer clears. The standard changed; the material did not refute it.`
      : `re-run over ${pooledSentences.length} pooled sources at the same declared floors: ${kind} no longer clears its own null arm` });
    ledger = r.log;
    if (r.refused) { console.log(`    refused  ${n.id}: ${r.refused.type} — ${r.refused.detail}`); continue; }
    if (!r.noop) conceded += 1;
  }
  console.log(`  LAPSED    ${kind}  (REC, ${v.members.size} membership note(s) conceded, past kept)`);
}
console.log(`  => ${conceded} note(s) conceded by REC; the log keeps every one of them`);
