// omnimodal-discovery.mjs — the same discovery organ, four media, real bytes.
//
// THE CLAIM UNDER TEST. `discovered-reading-kinds.mjs` found reading rules in
// three Wikipedia pages by pointing `kind-standing.js::discoverCompanyKinds`
// at a stream of line-shapes. If that was a fact about DISCOVERY, the identical
// organ finds each medium's own grammar when handed that medium's own events.
// If it was a fact about text, it will not.
//
// WHAT IS IDENTICAL, and it is the whole point: `discoverCompanyKinds`, its
// declared floors, and its II.23 null arm. One call, four callers. Nothing in
// the organ is told which medium it is reading, and nothing here reaches into
// it.
//
// WHAT DIFFERS: the INSTRUMENT — the thing that turns a medium's bytes into an
// ordered stream of tokens. That is medium-specific by necessity (a WAV is not
// a MIDI is not a GIF), and each one below reads real bytes off disk.
//
//   text   real Wikipedia HTML, extracted, one token per line
//   pdf    a REAL fetched 12-page report, content streams inflated, text ops read
//   music  REAL Bach MIDI (Goldberg Aria, WTC I Prelude 1), note events
//   video  a REAL animated GIF, one token per frame from its own descriptors
//
// A NOTE ON THE VIDEO INSTRUMENT, so it is not read as more than it is: there
// is no ffmpeg in this container, so no frames are decoded to pixels. The GIF's
// own per-frame descriptors — size, position, delay, compressed length — are
// read straight from the container, which is real structure the file declares
// about itself and is enough to ask whether frames arrange in kinds. It is NOT
// a claim about image content.
//
// THE HONEST ASYMMETRY IN SCORING. Text has an independent oracle (the HTML's
// own structural classes, a channel the reader never sees), so a kind there can
// be scored for USEFULNESS against a second null. The other three have no such
// channel, so only the DISCOVERY null runs and the sample is the evidence —
// this project's own "read the landings, don't count them" discipline. Nothing
// here invents an oracle to score against.
//
//   node omnimodal-discovery.mjs
import { readFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const MIN_MENTIONS = Number(process.env.MIN_MENTIONS ?? 4);
const MIN_SHARE = Number(process.env.MIN_SHARE ?? 0.4);
const MIN_MEMBERS = Number(process.env.MIN_MEMBERS ?? 2);
const DRAWS = Number(process.env.DRAWS ?? 40);
const ALPHA = Number(process.env.ALPHA ?? 0.05);
const SEED = Number(process.env.SEED ?? 0);
const PDF = process.env.PDF ?? "/tmp/r.pdf";
// A DECLARED BUDGET (P9), and it exists because the cost is real: the null arm
// is O(draws x events x |vocabulary|), so the 13,439 text operations a real
// 12-page PDF draws, against a large vocabulary, is ~10^9 operations for 40
// draws — measured at over five minutes on this machine with no output. The
// cap is on the STREAM, declared and reported, never a silent truncation.
const MAX_EVENTS = Number(process.env.MAX_EVENTS ?? 4000);

const { discoverCompanyKinds } = await import(`${NATIVE}/organs/kind-standing.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const identity = (t) => t;
const bucket = (v, edges) => { for (let i = 0; i < edges.length; i += 1) if (v < edges[i]) return i; return edges.length; };

// ── instrument: TEXT ─────────────────────────────────────────────────────
// A line's characters collapsed to classes; no letter, digit or mark keeps its
// identity, so the token is blind to language.
const CAP = 4;
const lineShape = (s) => {
  const cls = String(s).trim().replace(/[\p{L}\p{M}]+/gu, "a").replace(/\p{N}+/gu, "0").replace(/\s+/gu, "_").replace(/[^a0_]+/gu, ".");
  const n = String(s).trim().length;
  return `${n < 24 ? "S" : n < 72 ? "M" : "L"}${cls.replace(/(.)\1+/g, "$1").slice(0, CAP)}`;
};
function textStream(path) {
  const lines = extractReadable(readFileSync(path, "utf8")).text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  return { tokens: lines.map(lineShape), raw: lines };
}

// ── instrument: PDF ──────────────────────────────────────────────────────
// Content streams inflated with Node's own zlib; text-showing operators read
// out. A CRUDE extractor and said to be one — it recovers the strings a page
// draws, in draw order, which is exactly the ordered stream this asks for. It
// does not model layout, columns or fonts.
function pdfStream(path) {
  const buf = readFileSync(path);
  const out = [];
  let at = 0;
  for (;;) {
    const s = buf.indexOf("stream", at);
    if (s < 0) break;
    const e = buf.indexOf("endstream", s);
    if (e < 0) break;
    let body = buf.subarray(s + 6, e);
    while (body.length && (body[0] === 0x0d || body[0] === 0x0a)) body = body.subarray(1);
    at = e + 9;
    let text = null;
    try { text = inflateSync(body).toString("latin1"); } catch { continue; }
    // Tj / TJ / ' / " — the operators that put glyphs on a page.
    for (const m of text.matchAll(/\((?:\\.|[^\\()])*\)|\[((?:[^\][]|\\.)*)\]\s*TJ/g)) {
      const chunk = m[0].startsWith("[") ? [...m[1].matchAll(/\((?:\\.|[^\\()])*\)/g)].map((x) => x[0]).join("") : m[0];
      const str = chunk.replace(/[()]/g, "").replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, "$1");
      if (str.trim()) out.push(str.replace(/\s+/g, " ").trim());
    }
  }
  return { tokens: out.map(lineShape), raw: out };
}

// ── instrument: MUSIC (MIDI) ─────────────────────────────────────────────
// Real note events off a real Standard MIDI File. A token is what the ORGAN
// can compare: the interval from the previous note and the note's duration
// class. Pitch itself is deliberately not the token — an absolute pitch is a
// fact about key, and an interval is a fact about the music's own motion.
function midiStream(path) {
  const b = readFileSync(path);
  if (b.toString("latin1", 0, 4) !== "MThd") return null;
  const notes = [];
  let at = 14;
  while (at + 8 <= b.length) {
    const id = b.toString("latin1", at, at + 4), len = b.readUInt32BE(at + 4);
    const start = at + 8, end = Math.min(b.length, start + len);
    at = end;
    if (id !== "MTrk") continue;
    let i = start, tick = 0, running = 0;
    const on = new Map();
    while (i < end) {
      let d = 0, byte;
      do { byte = b[i++]; d = (d << 7) | (byte & 0x7f); } while (byte & 0x80 && i < end);
      tick += d;
      let status = b[i];
      if (status < 0x80) status = running; else i += 1;
      running = status;
      const type = status & 0xf0;
      if (status === 0xff) { const t = b[i++]; let l = 0, bb; do { bb = b[i++]; l = (l << 7) | (bb & 0x7f); } while (bb & 0x80 && i < end); i += l; if (t === 0x2f) break; continue; }
      if (status === 0xf0 || status === 0xf7) { let l = 0, bb; do { bb = b[i++]; l = (l << 7) | (bb & 0x7f); } while (bb & 0x80 && i < end); i += l; continue; }
      const d1 = b[i++], d2 = (type === 0xc0 || type === 0xd0) ? 0 : b[i++];
      if (type === 0x90 && d2 > 0) on.set(d1, tick);
      else if ((type === 0x80 || (type === 0x90 && d2 === 0)) && on.has(d1)) { notes.push({ pitch: d1, start: on.get(d1), dur: tick - on.get(d1) }); on.delete(d1); }
    }
  }
  notes.sort((a, b2) => a.start - b2.start || a.pitch - b2.pitch);
  const tokens = [], raw = [];
  for (let k = 1; k < notes.length; k += 1) {
    const iv = notes[k].pitch - notes[k - 1].pitch;
    const dir = iv > 0 ? "u" : iv < 0 ? "d" : "s";
    const size = bucket(Math.abs(iv), [1, 3, 5, 8, 13]);
    const dur = bucket(notes[k].dur, [60, 120, 240, 480, 960]);
    tokens.push(`${dir}${size}t${dur}`);
    raw.push(`pitch ${notes[k].pitch}, interval ${iv >= 0 ? "+" : ""}${iv}, dur ${notes[k].dur}`);
  }
  return { tokens, raw };
}

// ── instrument: VIDEO (GIF frames) ───────────────────────────────────────
// Each frame's own declared descriptor, straight from the container: its size
// and position on the canvas, its delay, and how many compressed bytes it took.
// No pixels are decoded. Compressed length is a real per-frame property — how
// much NEW information this frame carried — which is the closest thing to a
// shot's own weight that a container gives up for free.
function gifStream(path) {
  const b = readFileSync(path);
  if (b.toString("latin1", 0, 3) !== "GIF") return null;
  let i = 13;
  const flags = b[10];
  if (flags & 0x80) i += 3 * (2 ** ((flags & 0x07) + 1));
  const frames = [];
  let delay = 0;
  const skipBlocks = () => { while (i < b.length && b[i]) { i += b[i] + 1; } i += 1; };
  while (i < b.length) {
    const sep = b[i];
    if (sep === 0x3b) break;
    if (sep === 0x21) { i += 1; const label = b[i++]; if (label === 0xf9) { const sz = b[i]; delay = b.readUInt16LE(i + 2); i += sz + 1; skipBlocks(); } else { skipBlocks(); } continue; }
    if (sep === 0x2c) {
      i += 1;
      const left = b.readUInt16LE(i), top = b.readUInt16LE(i + 2), w = b.readUInt16LE(i + 4), h = b.readUInt16LE(i + 6);
      const lf = b[i + 8]; i += 9;
      if (lf & 0x80) i += 3 * (2 ** ((lf & 0x07) + 1));
      i += 1; // LZW min code size
      const dataStart = i; skipBlocks();
      frames.push({ left, top, w, h, delay, bytes: i - dataStart });
      continue;
    }
    i += 1;
  }
  const tokens = frames.map((f) => `a${bucket(f.w * f.h, [1e3, 1e4, 4e4, 1.6e5])}p${bucket(f.left + f.top, [1, 50, 200])}d${bucket(f.delay, [3, 6, 10])}z${bucket(f.bytes, [500, 2000, 8000, 20000])}`);
  return { tokens, raw: frames.map((f) => `${f.w}x${f.h} at ${f.left},${f.top} delay ${f.delay} bytes ${f.bytes}`) };
}

// ── one organ, four media ────────────────────────────────────────────────
function discover(label, stream) {
  if (!stream || stream.tokens.length < 20) { console.log(`\n${label}: unavailable or too short (${stream?.tokens.length ?? 0} tokens)`); return null; }
  const full = stream.tokens.length;
  const tokens = stream.tokens.slice(0, MAX_EVENTS);
  const raw = stream.raw.slice(0, MAX_EVENTS);
  const vocabulary = [...new Set(tokens)];
  const marg = (() => { const f = new Map(); for (const t of tokens) f.set(t, (f.get(t) ?? 0) + 1); return Math.max(...f.values()) / tokens.length; })();
  const kinds = discoverCompanyKinds([{ text: tokens.join(" ") }], vocabulary, {
    minMentions: MIN_MENTIONS, minShare: MIN_SHARE, minMembers: MIN_MEMBERS,
    clean: identity, nullArm: { draws: DRAWS, seed: SEED, alpha: ALPHA },
  });
  console.log(`\n${label}`);
  console.log(`  ${tokens.length}${full > tokens.length ? ` of ${full} (capped at the declared MAX_EVENTS ${MAX_EVENTS})` : ""} events, ${vocabulary.length} distinct kinds of event, max marginal ${marg.toFixed(2)}${marg >= 0.5 ? "  (DEGENERATE — the organ's own stated failure regime)" : ""}`);
  console.log(`  ${kinds.length} kind(s) cleared the null arm (draws ${DRAWS}, alpha ${ALPHA})`);
  for (const k of kinds) {
    const idx = tokens.map((t, j) => (k.members.includes(t) ? j : -1)).filter((j) => j >= 0);
    console.log(`    ${k.name.padEnd(20)} ${String(idx.length).padStart(5)} events  members ${k.members.slice(0, 4).join(" ")}${k.members.length > 4 ? ` +${k.members.length - 4}` : ""}`);
    for (const j of idx.slice(0, 2)) console.log(`        e.g. ${JSON.stringify(String(raw[j]).slice(0, 62))}`);
  }
  if (!kinds.length) console.log(`    — nothing cleared: this stream's arrangement is not distinguishable from its own shuffle at these floors`);
  return { kinds, tokens, raw };
}

console.log(`ONE ORGAN, FOUR MEDIA — discoverCompanyKinds, identical call, declared floors`);
console.log(`  minMentions ${MIN_MENTIONS}, minShare ${MIN_SHARE}, minMembers ${MIN_MEMBERS}, nullArm { draws ${DRAWS}, alpha ${ALPHA}, seed ${SEED} }`);

discover("TEXT — real Wikipedia HTML (Borodino), one token per line", textStream(`${FIX}wikipedia-battle-of-borodino.html`));
if (existsSync(PDF)) discover(`PDF — a real fetched 12-page report (${PDF})`, pdfStream(PDF));
else console.log(`\nPDF — not present at ${PDF}; fetch one and re-run (no claim is made without it)`);
for (const m of ["bwv-988-aria.mid", "wtk1-prelude1.mid"])
  if (existsSync(`${FIX}midi/${m}`)) discover(`MUSIC — real Bach MIDI (${m}), one token per note`, midiStream(`${FIX}midi/${m}`));
if (existsSync(`${FIX}animation.gif`)) discover("VIDEO — a real animated GIF, one token per frame descriptor", gifStream(`${FIX}animation.gif`));
else console.log(`\nVIDEO — no animation.gif in fixtures`);
