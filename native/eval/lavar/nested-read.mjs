// nested-read.mjs — propositions nest; an end can hold another proposition.
//
// User direction, verbatim (2026-09-09): "this is more than one proposition.
// and propositions can be nested, that's the whole point of the holograph."
//
// The specimen that provoked it, from Chapter 1's own clean reading:
//
//   curious child | was | very fond of pretending to be two people
//
// That object is not a string. It carries a second proposition (the child
// pretending), and that one carries a third (pretending TO BE two people).
// A flat triple throws both away and reports the discard as a success.
//
// TWO MECHANISMS, neither of which existed anywhere in native/ (checked:
// no inheritedSubject/matrixSubject/controlledSubject/nested* organ, and
// `standing` has no "proposition" member — an end could only ever hold a
// referent, an occurrence, a candidate or a projection).
//
//   1. INHERITED SUBJECT. A nested clause usually has no subject of its own
//      — it is CONTROLLED by the matrix subject ("the child was fond of
//      [the child] pretending"). Recursing extractRelations naively into
//      the object finds no subject and grabs the nearest noun-ish token
//      instead: `very | fond | of pretending to be two people`. Supplying
//      the matrix subject is what makes the inner clause readable at all.
//
//   2. PROPOSITION-VALUED ENDS. The outer proposition's second end becomes
//      an ADDRESS of the inner one (`->p2`), not a copy of its text. This
//      is the nesting itself; without it the layers are just more flat
//      triples sitting beside each other.
//
// EVERY span is verified against the real source bytes before it is kept
// (P5.2 as a gate, not a report) — the subject prepended for mechanism 1 is
// synthetic, never in the file, so an inner span's offsets are recovered by
// locating the inner text inside the REAL object span and refusing if it
// does not slice back byte-identical.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitSentences } from "../../adapters/text/spans.js";
import { extractRelations, discoverRelationVocab } from "../../adapters/text/relations.js";
import { extractSurfaces } from "../../adapters/text/surfaces.js";
import { classifyWord, dominantClass } from "../../adapters/text/wordclass.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAX_DEPTH = 3; // declared, not tuned: three is where Chapter 1's own deepest real nest sits.

const source = process.argv[2];
if (!source) {
  console.error("usage: node nested-read.mjs <path-to-text-file>");
  process.exit(1);
}
const raw = fs.readFileSync(source, "utf8");
const sentences = splitSentences(raw);
const surfaces = extractSurfaces(sentences);
// minSurfaces is declared, never defaulted (discoverRelationVocab refuses a
// default outright — how much recurrence counts as a pattern is the caller's
// to say). 1 is the value this repo's own relation tests declare, and the
// value the production sidecar recipe reads at; it is matched here rather
// than chosen, so this prototype's vocabulary is the same vocabulary the
// flat reading earned, and any difference in output is the NESTING, not a
// wider verb list.
const vocabReport = discoverRelationVocab(raw, { surfaces, minSurfaces: 1 });
const verbs = vocabReport?.verbs instanceof Set ? vocabReport.verbs : new Set(vocabReport?.verbs ?? []);
const opts = { verbs, phrasalPredicates: true, nounPhraseSubjects: true };

let nextId = 0;
const propositions = [];
const refusedNests = [];

// THE REFUSAL GATE, and why it is a refusal and not a confirmation.
//
// The first run of this file nested happily and produced garbage:
// `she | with | a waistcoat-pocket`, `as there | to | her`, `what | to |
// happen next` — the connector slot holding a PREPOSITION, not a verb.
// That is a known standing defect of extractRelations' connector slot
// (the-fold, eval/results/asserted-crosslingual.md), and prepending a
// subject to a fragment makes it fire far more often, because almost any
// fragment reads as a clause once something subject-shaped sits in front
// of it.
//
// The organ that settles this already exists — wordclass.js's dominantClass
// over the real UD_English-EWT treebank prior — and P56's rule says exactly
// how it may be used: "a part of speech is a candidate set, never a
// per-occurrence verdict; settled means REFUSABLE, never confirmable." So
// this gate only ever REFUSES a nest whose connector settles, at a bare
// majority of its attested uses, as something other than a verb. It never
// admits one on POS evidence alone — the earned vocabulary still has to
// have nominated the token first.
const POS_PRIOR = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors/pos-eng.json"), "utf8"));
const GRAMMAR_MIN_SHARE = 0.5; // the production sidecar recipe's own declared value, matched not chosen
const settlesAsNonVerb = (label) => {
  const head = String(label ?? "").trim().split(/\s+/).pop()?.toLowerCase();
  if (!head) return true;
  const settled = dominantClass(classifyWord(head, { posPrior: POS_PRIOR }), { minShare: GRAMMAR_MIN_SHARE });
  if (!settled?.thraxClass) return false; // unsettled is NOT a refusal — only a settled non-verb is
  return settled.thraxClass !== "verb";
};
// Weaker test, used only by promoteLabel: a label that settles as a verb is
// already right and is left alone; anything else (a settled non-verb, or an
// unsettled token like the PART "to") is a candidate for promotion.
const settlesAsNonVerbOrUnsettled = (label) => {
  const head = String(label ?? "").trim().split(/\s+/).pop()?.toLowerCase();
  if (!head) return true;
  const settled = dominantClass(classifyWord(head, { posPrior: POS_PRIOR }), { minShare: GRAMMAR_MIN_SHARE });
  return settled?.thraxClass !== "verb";
};

// THE INFINITIVE MARKER, handled as what it is rather than hand-listed.
//
// "to" settles as NOTHING (thraxClass null) — Universal Dependencies tags it
// PART, and THRAX_OUT_OF_SCOPE deliberately keeps PART out of Thrax's eight
// categories rather than forcing it into the nearest one. So the refusal
// gate above correctly declines to refuse it, and labels like
// `it | to | see anything` survive with an infinitive marker sitting in the
// relation slot where the verb belongs.
//
// The fix does NOT hand-type "to" into a new closed class. When a label does
// not settle as a verb, but the object it introduces BEGINS with a token
// that this reading's own earned vocabulary already nominated AND that
// settles as a verb in the treebank, the boundary was simply drawn one token
// too early — the label absorbs that verb and the object gives it up. Both
// halves of that test are evidence already on hand (the earned vocabulary,
// the received POS prior); nothing new is declared.
const promoteLabel = (label, objectText) => {
  if (!settlesAsNonVerbOrUnsettled(label)) return null;
  const m = String(objectText ?? "").match(/^\s*([\p{L}\p{N}’']+)\s+([\s\S]*)$/u);
  if (!m) return null;
  const [, head, rest] = m;
  const lower = head.toLowerCase();
  if (!verbs.has(lower)) return null;
  const settled = dominantClass(classifyWord(lower, { posPrior: POS_PRIOR }), { minShare: GRAMMAR_MIN_SHARE });
  if (settled?.thraxClass !== "verb") return null;
  if (!rest.trim()) return null;
  return { label: `${label} ${head}`.trim(), object: rest };
};

// Does this fragment carry a verb this reading has actually earned? Only
// then is there a second proposition in it to look for.
const carriesVerb = (text) =>
  String(text ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}’']+/u)
    .some((tok) => verbs.has(tok));

// Recover an inner extraction's real byte address by locating its text
// inside the OUTER object span it was read from. Refuses rather than guesses.
const addressWithin = (innerText, outerText, outerStart) => {
  const idx = outerText.indexOf(innerText);
  if (idx < 0) return null;
  const start = outerStart + idx;
  const end = start + innerText.length;
  if (raw.slice(start, end) !== innerText) return null; // P5.2 gate
  return { start, end };
};

function readNested(subject, objectText, objectStart, depth, parentId) {
  if (depth >= MAX_DEPTH || !carriesVerb(objectText)) return null;
  // Mechanism 1: the inherited subject. The matrix subject is prepended so
  // the fragment reads as a clause; it is synthetic and never addressed.
  const inner = extractRelations(`${subject} ${objectText}`, opts);
  if (!inner.length) return null;
  const e = inner[0];
  if (!e.object || e.object === objectText) return null; // no progress made
  const promoted = promoteLabel(e.verb, e.object);
  if (promoted) { e.verb = promoted.label; e.object = promoted.object; }
  if (settlesAsNonVerb(e.verb)) { refusedNests.push({ label: e.verb, from: objectText.slice(0, 60) }); return null; }
  const addr = addressWithin(e.object, objectText, objectStart);
  if (!addr) return null;

  const id = `p${++nextId}`;
  const node = {
    id,
    parent: parentId,
    depth,
    end1: subject,
    label: e.verb,
    end2: null,          // filled below: either a nested proposition address or the text
    end2Text: e.object,
    at: `${addr.start}-${addr.end}`,
    inheritedSubject: true,
  };
  propositions.push(node);
  const child = readNested(subject, e.object, addr.start, depth + 1, id);
  node.end2 = child ? { standing: "proposition", ref: child.id } : { standing: "text", text: e.object };
  return node;
}

for (const sent of sentences) {
  const outer = extractRelations(sent.text, opts);
  for (const e of outer) {
    if (!e.subject || !e.object) continue;
    const objIdxInSent = sent.text.indexOf(e.object);
    if (objIdxInSent < 0) continue;
    const objStart = sent.offset + objIdxInSent;
    if (raw.slice(objStart, objStart + e.object.length) !== e.object) continue; // P5.2 gate

    const id = `p${++nextId}`;
    const node = {
      id,
      parent: null,
      depth: 0,
      end1: e.subject,
      label: e.verb,
      end2: null,
      end2Text: e.object,
      at: `${objStart}-${objStart + e.object.length}`,
      inheritedSubject: false,
    };
    propositions.push(node);
    const child = readNested(e.subject, e.object, objStart, 1, id);
    node.end2 = child ? { standing: "proposition", ref: child.id } : { standing: "text", text: e.object };
  }
}

const nested = propositions.filter((p) => p.depth > 0);
const roots = propositions.filter((p) => p.depth === 0);
const withNestedEnd = propositions.filter((p) => p.end2?.standing === "proposition");

// SCOPED TO ITS SOURCE: the path is stated once, here. Every address below
// is a bare byte range into it — the 741 repetitions of this same path in
// the flat sidecar were 19% of that file's bytes and carried no information
// the header does not already have.
const out = {
  schema: "EOTNested@1",
  source: { path: path.relative(path.resolve(HERE, "../../../.."), path.resolve(source)), bytes: raw.length },
  reading: {
    sentences: sentences.length,
    propositions: propositions.length,
    roots: roots.length,
    nested: nested.length,
    withPropositionValuedEnd: withNestedEnd.length,
    nestsRefusedByPosGate: refusedNests.length,
    maxDepth: propositions.reduce((m, p) => Math.max(m, p.depth), 0),
  },
  propositions,
  // Never silent: every nest this reading declined, and the connector that
  // got it declined. A refusal that leaves no trace reads as "nothing was
  // there" — which is the exact failure this whole apparatus exists to stop.
  refusedNests,
};

const outPath = path.join(HERE, "results", `${path.basename(source, ".txt")}-nested.json`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));

console.log(`${sentences.length} sentences, ${verbs.size} earned verbs`);
console.log(`${propositions.length} propositions — ${roots.length} root, ${nested.length} nested (max depth ${out.reading.maxDepth})`);
console.log(`${withNestedEnd.length} propositions hold another proposition in an end`);
console.log(`-> ${path.relative(process.cwd(), outPath)}`);
