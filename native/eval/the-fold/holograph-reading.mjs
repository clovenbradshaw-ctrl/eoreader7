// holograph-reading.mjs — does reading by ADDRESS beat reading by STRING?
//
// The holograph claim (2026-09-07): every line of the record carries an
// address into the whole, so a reader that resolves a question to REFERENTS
// and follows the ledger's addresses should reach the right passage with
// less handed than a reader that matches the question's words against every
// chunk. Two arms over the same fact bank, no model anywhere:
//
//   STRING   the turn's own term retrieval (source.js retrieve, top 3).
//   ADDRESS  the fact's names → referent ids (cast.js index over the whole
//            corpus) → the ledger's notes whose ends resolve to those ids →
//            the addresses their witnesses carry → passages ranked by how
//            many notes point at them and how many active ids they cover.
//   CONTROL  the same walk over a ledger whose witness addresses were
//            REDEALT across notes (seeded): identity kept, addresses
//            destroyed — the hit rate must collapse toward chance (II.23).
//
// Scored: is the fact's own address among the top 3? Handed: the bytes the
// arm would put in front of a mouth (three passages vs the note lines).
// Reachable: facts whose names the index establishes at all — the address
// arm cannot read a name the material never established, and says so.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { organs as productOrgans } from "./lib/product-assay.mjs";
import { buildFactBank, makeRng } from "./lib/long-stream.mjs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const ROOT = new URL("../../../../", import.meta.url).pathname;
const FOLD = `${ROOT}the-fold/`;
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SOURCE = flag("source", `${FOLD}pg2554.txt`);
const TOP = Number(flag("top", 3));
const PER_SOURCE = Number(flag("facts", 120));
const SEED = Number(flag("seed", 3));

const O = await productOrgans();
const { makeReferentIndex } = await import(`${FOLD}cast.js`);
const { admitPassages } = await import(`${FOLD}read-on-arrival.js`);
const { referentsOf } = await import(`${FOLD}dialogue.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { lineIndex, outlineOfIndex } = await import(`${ROOT}eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/segments.js`);
const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const boundariesOf = (t) => { try { const out = outlineOfIndex(lineIndex(t), { max: 5000 }); if (out.gap || out.headings.length < 2) return null; return out.headings.map((h) => ({ start: h.start, end: h.end })); } catch { return null; } };

const t0 = Date.now();
const name = SOURCE.split("/").pop();
const text = readFileSync(SOURCE, "utf8");
const CHUNKING = String(flag("chunking", "app")); // the app's own unit (paragraphs) by default — P88; "outline" is the long-stream rig's chapter unit
const chunks = O.chunkSource(name, text, { boundaries: CHUNKING === "outline" ? boundariesOf(text) : null }).map((c) => ({ ...c, source: name, kind: "prose" }));
const byRef = new Map(chunks.map((c) => [c.ref, c]));
console.log(`holograph-reading — ${name}: ${text.length} bytes, ${chunks.length} chunks (${CHUNKING}), top ${TOP}, seed ${SEED}`);
const index = indexFor(chunks);
console.log(`  corpus referents: ${index.referents.size} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
const t1 = Date.now();
const rel = O.relationsFor(chunks, { pool: chunks });
const admitted = admitPassages(O.hl, null, chunks, { read: rel.read, witnessFor: (p) => `${p.ref}~holograph-eval`, frame: { reader: "holograph-reading.mjs", organs: { relationsFor: "product-assay organs" } } });
const notes = O.hl.foldWithStanding(admitted.log);
console.log(`  ledger: ${admitted.heard} heard, ${admitted.turnedAway.length} turned away, ${notes.length} notes (${((Date.now() - t1) / 1000).toFixed(1)}s)`);

// Each note's referent ids (through the index) and addresses (its witnesses).
const addressOf = (w) => String(typeof w === "string" ? w : (w?.at ?? w?.ref ?? "")).split("~")[0];
const ids = (n) => new Set([...index.resolve(String(n.subject ?? "")), ...index.resolve(String(n.object ?? ""))]);
const noteRows = notes.map((n) => ({ n, ids: ids(n), addrs: [...new Set((n.witnesses ?? []).map(addressOf).filter((a) => byRef.has(a)))] })).filter((r) => r.ids.size && r.addrs.length);
console.log(`  notes with a resolvable end and a real address: ${noteRows.length}`);

// The control: the same rows with their addresses redealt across notes.
const rng = makeRng(SEED);
const shuffled = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pool = shuffled(noteRows.map((r) => r.addrs));
const controlRows = noteRows.map((r, i) => ({ ...r, addrs: pool[i] }));

const line = (n) => `${n.subject} — ${n.verb}→ ${n.object}`;
function byAddress(rows, active, top) {
  const score = new Map(); const lines = new Map();
  for (const r of rows) {
    const cover = [...r.ids].filter((id) => active.has(id)).length;
    if (!cover) continue;
    for (const a of r.addrs) { score.set(a, (score.get(a) ?? 0) + cover); if (!lines.has(a)) lines.set(a, []); lines.get(a).push(line(r.n)); }
  }
  const ranked = [...score].sort((a, b) => b[1] - a[1]).slice(0, top).map(([a]) => a);
  const handed = ranked.flatMap((a) => lines.get(a).map((l) => `- ${l} [${a}]`));
  return { refs: ranked, handed: handed.join("\n") };
}

const bank = buildFactBank(chunks, { perSource: PER_SOURCE, rng: makeRng(SEED) });
const facts = bank.map((f) => ({ ...f, names: f.atoms.filter((a) => a.kind === "name").map((a) => a.value) })).filter((f) => f.names.length);
const tally = { string: 0, address: 0, control: 0, both: 0, addressOnly: 0, stringOnly: 0, reachable: 0 };
const bytes = { string: 0, address: 0 };
const rowsOut = [];
for (const f of facts) {
  const question = `What does the book say about ${f.names.slice(0, 2).join(" and ")}?`;
  const s = O.retrieve(chunks, question, TOP);
  const sRefs = s.map((p) => p.ref);
  const sHit = sRefs.includes(f.ref);
  const active = new Set(f.names.flatMap((n) => [...index.resolve(n)]));
  const reachable = active.size > 0;
  if (reachable) tally.reachable += 1;
  const a = reachable ? byAddress(noteRows, active, TOP) : { refs: [], handed: "" };
  const c = reachable ? byAddress(controlRows, active, TOP) : { refs: [], handed: "" };
  const aHit = a.refs.includes(f.ref), cHit = c.refs.includes(f.ref);
  tally.string += sHit; tally.address += aHit; tally.control += cHit;
  if (sHit && aHit) tally.both += 1; if (aHit && !sHit) tally.addressOnly += 1; if (sHit && !aHit) tally.stringOnly += 1;
  bytes.string += s.reduce((z, p) => z + String(p.text ?? "").length, 0); bytes.address += a.handed.length;
  rowsOut.push({ ref: f.ref, names: f.names, question, string: sHit, address: aHit, control: cHit, reachable, stringBytes: s.reduce((z, p) => z + String(p.text ?? "").length, 0), addressBytes: a.handed.length, addressRefs: a.refs, stringRefs: sRefs });
}
const n = facts.length;
const pct = (k) => `${tally[k]}/${n} (${(100 * tally[k] / n).toFixed(1)}%)`;
const chance = `${(100 * TOP / chunks.length).toFixed(2)}%`;
console.log(`\n== ${n} facts (names only), ${tally.reachable} reachable by referent; chance for top ${TOP} of ${chunks.length} chunks = ${chance}`);
console.log(`  STRING  (term retrieval, top ${TOP}):        ${pct("string")}`);
console.log(`  ADDRESS (referents → ledger → addresses):  ${pct("address")}   over reachable: ${tally.address}/${tally.reachable} (${(100 * tally.address / Math.max(1, tally.reachable)).toFixed(1)}%)`);
console.log(`  CONTROL (addresses redealt):               ${pct("control")}`);
console.log(`  both ${tally.both}, address-only ${tally.addressOnly}, string-only ${tally.stringOnly}`);
console.log(`  handed per fact: string ${(bytes.string / n).toFixed(0)} bytes (${TOP} passages) vs address ${(bytes.address / n).toFixed(0)} bytes (note lines) — compression ${(bytes.string / Math.max(1, bytes.address)).toFixed(1)}×`);
mkdirSync(`${NATIVE}/eval/the-fold/results`, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(`${NATIVE}/eval/the-fold/results/holograph-reading-${stamp}-${CHUNKING}.json`, JSON.stringify({ ran: new Date().toISOString(), source: name, chunking: CHUNKING, chunks: chunks.length, referents: index.referents.size, notes: notes.length, noteRows: noteRows.length, top: TOP, seed: SEED, facts: n, tally, bytes: { string: bytes.string / n, address: bytes.address / n }, rows: rowsOut }, null, 1));
console.log(`  rows → results/holograph-reading-${stamp}-${CHUNKING}.json (${((Date.now() - t0) / 1000).toFixed(0)}s total)`);
