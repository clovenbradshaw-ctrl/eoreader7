// field-lens-boost.mjs — the resemblance lens (the-fold/relative.js's
// Field), run as a standing, bulk, post-hoc pass over an ALREADY-FINISHED
// chapter ledger.
//
// Deliberately NOT inline in eot-jsonl.mjs. A first cut ran it as a step
// inside that file's own invocation, right after the reread-delta
// reconciliation — and comparing before/after inside that SAME run looked
// like a regression (ch2: 58->54) until it was confirmed, by a from-scratch
// regeneration with the boost code removed entirely, that the shift was
// the sibling session's own concurrent S103 merge to eot-jsonl.mjs,
// unrelated to this pass — but the fact that two structural interventions
// (reread's own contest/dedup reconciliation, and this pass's own
// referent-scoped dedup) touching one `lines` array in one invocation
// LOOKED indistinguishable from a real regression is reason enough on its
// own to never compose them in one run again. This script only ever reads
// a finished ledger and its .prior.json vocabulary, and only ever APPENDS.
//
// THE DISCIPLINE, measured and reported honestly this session
// (field-lens-improvement-test.mjs): the Field's own resemblance is never
// trusted as an arrangement. It only PROPOSES which already-read sentences
// deserve a second look for one specific, under-covered referent — the
// SAME extractRelations/grainOf/endRef path eot-jsonl.mjs's main loop uses
// types and resolves whatever comes back, and a find is only ever emitted
// if it is independently, mechanically ABOUT the referent the Field
// recalled (by resolved id, or by the referent's own surface literally
// appearing in what extractRelations found) — the Field never gets credit
// for a find it merely sat near.
//
// usage: node field-lens-boost.mjs <bookPath> <ch1,ch2,...>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { extractRelations } = await import(path.join(HERE, "..", "..", "adapters", "text", "relations.js"));
const { splitSentences, normaliseNewlines } = await import(path.join(HERE, "..", "..", "adapters", "text", "spans.js"));
const { makeGrainTyper } = await import(path.join(HERE, "grain-typing.mjs"));
const { Field } = await import(path.join(HERE, "..", "..", "..", "..", "the-fold", "relative.js"));
// Same POS prior eot-jsonl.mjs's own English default reads — a caller that
// boosts a --lang= chapter would pass its own prior here; this pass has no
// declared multilingual scope of its own yet.
const POS_PRIOR = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "priors", "pos-eng.json"), "utf8"));
const { grainOf } = makeGrainTyper(POS_PRIOR);

const bookPath = process.argv[2];
const chapterArg = process.argv[3];
if (!bookPath || !chapterArg) { console.error("usage: node field-lens-boost.mjs <bookPath> <ch1,ch2,...>"); process.exit(1); }
const chapters = chapterArg.split(",").map(Number);

const originBytes = fs.readFileSync(bookPath, "utf8");
const { text: raw, toRaw } = normaliseNewlines(originBytes);
const rawAt = (s, e) => [toRaw(s), toRaw(e)];
const basename = path.basename(bookPath, ".txt");

const HEAD_RE = /^CHAPTER ([IVXLC]+)\.\s*\n([^\n]*)\n/gmd;
const heads = [];
{ let m; while ((m = HEAD_RE.exec(raw))) {
  const candidateEnd = m.index + m[0].length;
  const hasRealTitle = Boolean(m[2].trim()) && raw[candidateEnd] === "\n";
  heads.push({ start: m.index, headEnd: hasRealTitle ? candidateEnd : m.indices[2][0] });
} }
for (let i = 0; i < heads.length; i += 1) heads[i].end = i + 1 < heads.length ? heads[i + 1].start : raw.length;

const TOPK_FRACTION = 0.1;
let grandTotal = 0;

for (const ch of chapters) {
  const ledgerPath = path.join(HERE, "results", `${basename}-ch${ch}.eot.jsonl`);
  if (!fs.existsSync(ledgerPath)) { console.log(`ch${ch}: no ledger, skipped`); continue; }
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

  const WIN = [heads[ch - 1].headEnd, heads[ch - 1].end];
  const chapterText = raw.slice(WIN[0], WIN[1]);
  const sentences = splitSentences(raw).filter((s) => s.offset >= WIN[0] && s.offset + s.text.length <= WIN[1]);

  // Vocabulary: union of this chapter's own earned verbs plus every prior
  // chapter this chapter's own .prior.json (or the ledger's own
  // priorsLoaded disclosure) named — reconstructed from the SAME .prior.json
  // files eot-jsonl.mjs itself reads, never re-derived by re-extracting.
  const verbs = new Set();
  const ownPriorPath = path.join(HERE, "results", `${basename}-ch${ch}.prior.json`);
  const surfaceToReferent = new Map();
  if (fs.existsSync(ownPriorPath)) {
    const own = JSON.parse(fs.readFileSync(ownPriorPath, "utf8"));
    for (const v of own.verbs ?? []) verbs.add(v);
  }
  const readingPass = lines.find((l) => l.schema === "EOTReadingPass@1");
  for (const p of readingPass?.priorsLoaded ?? []) {
    const pp = path.join(HERE, "results", `${basename}-ch${p.chapter}.prior.json`);
    if (fs.existsSync(pp)) for (const v of JSON.parse(fs.readFileSync(pp, "utf8")).verbs ?? []) verbs.add(v);
  }
  const opts = { verbs, phrasalPredicates: true, nounPhraseSubjects: true };

  const entityLines = lines.filter((l) => l.role === "entity");
  for (const e of entityLines) for (const s of e.surfaces ?? []) surfaceToReferent.set(s, e.referent);
  const propLines = lines.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && Array.isArray(l.at));

  const field = new Field();
  for (const sent of sentences) field.admit(sent.text, { offset: sent.offset });
  const topK = Math.max(3, Math.round(field.size * TOPK_FRACTION));

  const addressOf = (text, withinText, withinStart) => {
    const i = withinText.indexOf(text);
    if (i < 0) return null;
    const start = withinStart + i, end = start + text.length;
    return raw.slice(start, end) === text ? [start, end] : null;
  };

  let boosted = 0, referentsExamined = 0;
  let nextId = Math.max(0, ...lines.filter((l) => typeof l.id === "string").map((l) => Number(l.id.replace(/^\D+/, "")) || 0)) + 1;
  let nextSeq = Math.max(0, ...lines.map((l) => l.seq ?? 0)) + 1;
  const newLines = [];

  for (const ent of entityLines) {
    const surfaces = ent.surfaces ?? [];
    if (!surfaces.length) continue;
    const primary = [...surfaces].sort((a, b) => b.length - a.length)[0];
    const mentionCount = sentences.filter((s) => surfaces.some((sf) => s.text.includes(sf))).length;
    const resolvedCount = propLines.filter((l) => l.end1Ref === ent.referent || l.end2Ref === ent.referent).length;
    if (mentionCount < 3 || resolvedCount / mentionCount >= 0.3) continue;
    referentsExamined += 1;

    const ranked = field.recall(primary);
    for (const { node, activation } of ranked.slice(0, topK)) {
      const sentOffset = node.payload.offset;
      const [rs, re] = rawAt(sentOffset, sentOffset + node.text.length);
      const alreadyBoundHere = propLines.some((l) => l.at[0] < re && l.at[1] > rs && (l.end1Ref === ent.referent || l.end2Ref === ent.referent));
      if (alreadyBoundHere) continue;

      const found = extractRelations(node.text, opts);
      for (const e of found) {
        if (!e.subject || !e.object) continue;
        const at = addressOf(e.object, node.text, sentOffset);
        if (!at) continue;
        const aboutTarget = surfaceToReferent.get(e.subject) === ent.referent || surfaceToReferent.get(e.object) === ent.referent
          || surfaces.some((sf) => e.subject.includes(sf) || e.object.includes(sf));
        if (!aboutTarget) continue;
        const g = grainOf(e.verb);
        if (g.refused || g.grain_gap) continue;
        const key = `${at[0]}|${e.subject.toLowerCase()}|${e.verb.toLowerCase()}|${e.object.toLowerCase()}`;
        if (newLines.some((l) => l._key === key)) continue; // one candidate sentence can be reached by more than one referent's own recall
        newLines.push({
          seq: nextSeq++, schema: "EOTObservation@1", id: `o${nextId++}`, at: rawAt(at[0], at[1]), role: "proposition",
          end1: e.subject, label: e.verb, end2: e.object, subjectBasis: "stated",
          ...(surfaceToReferent.get(e.subject) ? { end1Ref: surfaceToReferent.get(e.subject) } : {}),
          ...(surfaceToReferent.get(e.object) ? { end2Ref: surfaceToReferent.get(e.object) } : {}),
          ...g,
          foundViaFieldLens: true, fieldTargetReferent: ent.referent, fieldActivation: activation,
          _key: key,
        });
        boosted += 1;
      }
    }
  }
  for (const l of newLines) delete l._key;
  if (newLines.length) fs.writeFileSync(ledgerPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n" + newLines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  console.log(`ch${ch}: field-lens boost appended ${boosted} propositions from ${referentsExamined} weak referents (of ${entityLines.length} cast)`);
  grandTotal += boosted;
}
console.log(`\ntotal appended across ${chapters.length} chapters: ${grandTotal}`);
