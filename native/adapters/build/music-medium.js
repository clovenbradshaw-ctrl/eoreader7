// adapters/build/music-medium.js — music as a MEDIUM of the one build pipeline
// (organs/talk-build.js). The core is unchanged: it reads the request ("a
// lullaby in two phrases of four bars each") into parts, asks the mouth only
// for what only talk can give (the piece's name, its phrases' names), hears
// everything into the ledger, reasons, and checks every element's provenance.
// This says what makes music music:
//
//   the whole   a piece (lullaby, song, tune …)
//   sourcing    a bar is SNIPPED, never asked of the mouth: cut by tick range
//               from a licensed score (Standard MIDI, adapters/midi/midi.js),
//               in order, and heard with the span it was cut from —
//               witness source:<url>#ticks:<a>-<b>
//   license     a source is judged by the one license table
//               (organs/license-table.js): public domain is taken, a
//               share-alike typesetting is refused, on the record
//   drawing     the bars laid end to end into one MIDI file; every note on it
//               maps to the ledger claim for the bar it came from
//   elements    the note events of the written file, read back by parseMidi
//               (`pitch@tick`), so the provenance check reads the artifact
//               itself, not the renderer's account of it
//   checking    the file parses and carries the notes of every bar asked for
//   continuing  a bar past the end of every licensed source is not asked of
//               anyone: it is CONTINUED (kernel/continuation.js, proven on
//               this Prelude) by a mixture of priors sedimented from the bars
//               already snipped — pitch, duration and gap as the file states
//               them, no theory named — and heard as a derived claim whose
//               premises are those bars (witness derived:continuation)
//
// No regular expressions.
import { createHash } from "node:crypto";
import { parseMidi, writeMidi } from "../midi/midi.js";
import { readLicense } from "../../organs/license-table.js";
import { sedimentPrior, expertOf, runMixture, continueMixture, lcg } from "../../kernel/continuation.js";

/** Bars are cut at this many beats — set by hand 2026-09-27: the two Mutopia
 *  fixtures are in 4/4 and the reader does not yet read a time signature. */
export const BEATS_PER_BAR = 4;

/**
 * makeMusicMedium({ sources }) — sources: [{ uri, url, bytes, license, licenseFrom }]
 *   uri          a short name for the source ("wtk1-prelude1.mid")
 *   url          where it was fetched from
 *   bytes        the file as served (Uint8Array / Buffer)
 *   license      the license as the source states it ("Public Domain")
 *   licenseFrom  where that statement was read (the typesetting's header)
 */
/** The continuation's grain and its seed — set by hand 2026-09-27 from the
 *  MIDI eval (eval/the-fold/midi-continuation.mjs: order 3, a mixture of
 *  orders 1–3). */
export const CONTINUATION_ORDER = 3;
const CONTINUATION_SEED = 11;

export function makeMusicMedium({ sources = [], beatsPerBar = BEATS_PER_BAR, continues = true } = {}) {
  const judged = sources.map((src) => {
    const lic = readLicense(src.license);
    const midi = parseMidi(src.bytes);
    const sha = createHash("sha256").update(Buffer.from(src.bytes)).digest("hex");
    return { ...src, lic, midi, sha, barTicks: (midi.ticksPerBeat ?? 480) * beatsPerBar };
  });
  const usable = judged.filter((s) => s.lic.ok && !s.midi.refused && s.midi.notes?.length);
  const refused = judged.filter((s) => !s.lic.ok).map((s) => ({ uri: s.uri, license: s.license, why: `${s.license} is not a permissive license: a snip would bind the piece it lands in` }));
  const byKey = new Map(usable.map((s) => [`${s.uri}@${s.sha.slice(0, 12)}`, s]));
  const notesIn = (s, a, b) => s.midi.notes.filter((n) => n.tick >= a && n.tick < b);

  // the notes the engine continued, by address: continued:<sha12> -> [{ tick, dur, pitch, velocity }] relative to the bar
  const continued = new Map();
  const tokensOf = (notes, barTicks) => notes.map((n, i) => `${n.pitch}:${n.dur}:${(notes[i + 1]?.tick ?? barTicks) - n.tick}`);
  // the bars on the record that were snipped: what the continuation may learn from
  const heardBars = (fold = []) => fold.filter((n) => n.label === "notes" && String(n.end2).includes("#ticks:")).map((n) => {
    const v = String(n.end2), at = v.indexOf("#ticks:"), src = byKey.get(v.slice(0, at));
    const [a, b] = v.slice(at + "#ticks:".length).split("-").map(Number);
    return src ? { note: n.id, notes: notesIn(src, a, b).map((x) => ({ ...x, tick: x.tick - a })), barTicks: b - a } : null;
  }).filter(Boolean);

  /** A bar past the end of the source: continued from the heard bars. */
  function continuePart(k, fold) {
    const bars = heardBars(fold);
    if (!continues || bars.length < 2) return null;
    const barTicks = bars[0].barTicks;
    const heard = bars.flatMap((b) => tokensOf(b.notes, b.barTicks));
    const experts = [1, 2, CONTINUATION_ORDER].map((o) => expertOf(`heard@${o}`, sedimentPrior(heard, { order: o, giver: `snipped bars@${o}` })));
    const warm = runMixture(experts, heard, { order: CONTINUATION_ORDER, alphabetSize: new Set(heard).size });
    const prevKey = [...continued.keys()].at(-1);
    const prev = k > bars.length && prevKey ? tokensOf(continued.get(prevKey), barTicks) : heard;
    const gen = continueMixture(experts, warm.weights, prev.slice(-CONTINUATION_ORDER), { length: 4 * Math.max(8, Math.round(heard.length / bars.length)), rng: lcg(CONTINUATION_SEED + k), seen: new Set(heard), order: CONTINUATION_ORDER });
    const notes = [];
    let t = 0;
    for (const g of gen.generated) {
      const [pitch, dur, gap] = String(g.event).split(":").map(Number);
      if (t >= barTicks) break;
      notes.push({ tick: t, dur: Math.min(dur, barTicks - t), pitch, velocity: 64 });
      t += gap;
    }
    if (!notes.length) return null;
    const key = `continued:${createHash("sha256").update(JSON.stringify(notes)).digest("hex").slice(0, 12)}`;
    continued.set(key, notes);
    const novel = gen.generated.filter((g) => g.shape === "new").length;
    return {
      claims: [{ label: "notes", end2: key }],
      witness: "derived:continuation",
      because: `bar ${k + 1} continued from ${heard.length} notes of ${bars.length} snipped bars by a mixture of priors sedimented from them (orders 1-${CONTINUATION_ORDER}); ${notes.length} notes, ${novel} of the draws new to the hearing [premises: ${JSON.stringify(bars.map((b) => b.note))}]`,
    };
  }

  /** a bar, cut from the first usable source, in order: bar k of the piece is
   *  bar k of the source (the parts' order is the record's own); past the
   *  source's end, continued */
  async function sourcePart({ kind, parentOrdinal = 0, index = 0, perParent = 1, fold = [] }) {
    if (kind !== "bar" && kind !== "measure") return null;
    const s = usable[0];
    if (!s) return null;
    const k = parentOrdinal * perParent + index;
    const a = k * s.barTicks, b = a + s.barTicks;
    const notes = notesIn(s, a, b);
    if (!notes.length) return continuePart(k, fold);
    const span = `${s.uri}@${s.sha.slice(0, 12)}#ticks:${a}-${b}`;
    return {
      claims: [{ label: "notes", end2: span }],
      witness: `source:${s.url}#ticks:${a}-${b}`,
      because: `bar ${k + 1} of ${s.uri} (${s.lic.chosen}, per ${s.licenseFrom}): ${notes.length} notes, ticks ${a}-${b}, sha256 ${s.sha}`,
    };
  }

  /** the piece: its phrases in order, their bars in order, end to end */
  function render(belief) {
    const byId = new Map(belief.map((t) => [t.id, t]));
    const piece = belief.find((t) => t.kind === "piece" && !t.parent) ?? null;
    const phrases = (piece?.children ?? []).map((c) => byId.get(c)).filter((t) => t?.kind === "phrase");
    const bars = phrases.flatMap((p) => p.children.map((c) => byId.get(c)).filter((t) => t && (t.kind === "bar" || t.kind === "measure")));
    const out = [], map = [];
    let at = 0, tpb = usable[0]?.midi.ticksPerBeat ?? 480;
    for (const bar of bars) {
      const prop = bar.props.find((p) => p.label === "notes");
      const hash = String(prop?.value ?? "").indexOf("#ticks:");
      const s = prop && hash > 0 ? byKey.get(String(prop.value).slice(0, hash)) : null;
      const [a, b] = s ? String(prop.value).slice(hash + "#ticks:".length).split("-").map(Number) : [0, 0];
      const own = prop && continued.has(String(prop.value)) ? continued.get(String(prop.value)) : null;
      if (own) for (const n of own) {
        const note = { tick: at + n.tick, dur: n.dur, pitch: n.pitch, velocity: n.velocity, channel: 0 };
        out.push(note);
        map.push({ text: `${note.pitch}@${note.tick}`, src: [prop.note] });
      }
      if (s) for (const n of notesIn(s, a, b)) {
        const note = { tick: at + (n.tick - a), dur: n.dur, pitch: n.pitch, velocity: n.velocity, channel: 0 };
        out.push(note);
        map.push({ text: `${note.pitch}@${note.tick}`, src: [prop.note] });
      }
      at += s ? s.barTicks : own ? (usable[0]?.barTicks ?? tpb * beatsPerBar) : tpb * beatsPerBar;
    }
    return { artifact: writeMidi(out, { ticksPerBeat: tpb }), map, engineWords: {}, style: null, bars: bars.length };
  }

  /** the elements of a MIDI file: its note events, read back from the bytes */
  const leaves = (bytes) => (parseMidi(bytes).notes ?? []).map((n) => ({ text: `${n.pitch}@${n.tick}`, where: "note" }));

  /** the file parses and every bar asked for sounds */
  async function verify(kind, bytes) {
    const m = parseMidi(bytes);
    const ok = !m.refused && (m.notes?.length ?? 0) > 0;
    return { ok, checks: [`the file parses as MIDI (${m.refused ? m.refused.type : `${m.notes.length} notes`})`] };
  }

  return Object.freeze({
    kind: "music",
    root: "piece",
    wholeFallback: "the piece",
    wholeWords: new Set(["piece", "song", "tune", "lullaby", "melody", "music", "composition", "track", "work"]),
    fieldHolders: new Set(),
    numericDetails: new Set(["tempo"]),
    showsVerb: "has",
    askWhatPartsShow: false,
    sourcePart, render, leaves, verify,
    sources: judged.map((s) => ({ uri: s.uri, url: s.url, license: s.license, spdx: s.lic.chosen, taken: s.lic.ok, sha256: s.sha })),
    refused,
  });
}
