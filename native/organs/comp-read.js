// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 3 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// Handle: Vitruvius — the architect who codified how a plan is READ: from the
// drawing's own proportions and positions to the building it calls for.
//
// comp-read.js — a UI comp, read as a SPEC. The eye (organs/look.js +
// adapters/image/comp-detect.py) measures: words with positions, nested
// rectangles and layout blocks, the palette. This organ is the pure step after
// it: which lines go together as a section; which section is a headline, a run
// of `Label: value` facts, a row of tabs, a grid of equal cards, a stack of
// label/value rows, or a REPEATED entry; what is counted ("5 cards", "3
// entries"); which numbers carry which unit.
//
// Nothing here knows what an app is ABOUT. There is no "weather", "price",
// "temperature" or "fuel" in this file (comp-read.test.mjs scans for them, and
// reads comps of different subjects through the same code). Every decision is
// a SIZE, a POSITION or a SHAPE — a line well above the text around it, a
// colon that splits a label from a value, a run of columns whose centres line
// up, sibling sections with one signature — and every zone names the rule that
// decided it in `basis`, so a wrong reading is a named rule to change, never a
// hunch. What a value MEANS is a later stage's (binding — and then only by
// pointing at a candidate the data source offers).
//
// Why no model reads the layout here: measured 2026-09-30, gemma2:2b handed the
// 21 OCR lines of a real phone screen with a constrained schema put every line
// in the status bar and the same lines in three other sections — 57 s to
// produce nothing. The small model can read; it cannot partition. So the
// partition is mechanical, and a model is only ever asked to POINT among
// candidates a mechanism produced.
//
// PURE: no I/O, no model. The measurement arrives as an argument.
export const COMP_SPEC_SCHEMA = "EOCompSpec@2";

// Declared numbers (set by hand 2026-09-30 from the first comps read — one drawn
// for the tests, three found on F-Droid; each is a structural tolerance named
// where it is used, none tuned against a score):
/** Lines further apart than this many text heights are different sections. */
export const GROUP_GAP_EM = 1.8;
/** A line this many times the median text height is a HEADLINE (the big value), not body text. */
export const HEADLINE_RATIO = 1.45;
/** A horizontal gap wider than this many line-heights cuts a line into separate segments (columns). */
export const SEGMENT_GAP_EM = 2.5;
/** Column centres of consecutive lines line up (one grid) when they differ by less than this share of the column pitch. */
export const GRID_ALIGN = 0.45;
/** A run of sibling sections is a LIST at REPEAT_MIN repeats, or at REPEAT_MIN_COMPLEX when an entry has ≥ COMPLEX_LINES lines
 *  (a repeat of a structure is strong evidence; a pair of similar lines is a coincidence). Two repeats is the structural minimum
 *  of a pattern (binding.js / WITNESS_FLOOR: one instance is not a pattern). */
export const REPEAT_MIN = 3;
export const REPEAT_MIN_COMPLEX = 2;
export const COMPLEX_LINES = 3;
/** The top and bottom of a screen are device chrome (a status bar, a navigation bar) when a section lies wholly within this share. */
export const CHROME_EDGE = 0.045;
/** The last section of a screen may be CUT OFF by the screen's own edge: it matches the entries above it when it is a prefix of their
 *  structure and lies within this share of the screen height from the bottom. */
export const CUTOFF_EDGE = 0.12;
/** A background change between two lines' containing blocks cuts a section when the RGB distance exceeds this. */
export const BG_CHANGE = 40;

/** Unit marks a value may carry — language-neutral symbols, set by hand; a new unit is one added entry. */
export const UNIT_MARKS = Object.freeze(["$", "€", "£", "¥", "%", "°F", "°C", "°", "mph", "km/h", "kph", "m/s", "hPa", "mm", "in"]);
const SYMBOL_PREFIX = new Set(["$", "€", "£", "¥"]);

const digitAt = (c) => c >= "0" && c <= "9";
const hasDigit = (s) => [...String(s)].some(digitAt);
const cx = (b) => b.x + b.w / 2;
const cy = (b) => b.y + b.h / 2;
const area = (b) => b.w * b.h;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();
const letters = (s) => [...String(s)].filter(isLetter);
const isCaps = (s) => { const l = letters(s); return l.length >= 3 && l.every((c) => c === c.toUpperCase()); };
const colourDist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 0);

/** parseValue("$3.12") / ("72°F") / ("58%") / ("9 mph") / ("23 °C") → { number, unit, raw } or null.
 *  A value is a run of digits (with . , and a leading -) and ONE unit mark, before or after it. Structure, never a word list. */
export function parseValue(text) {
  const raw = String(text ?? "").trim();
  if (!hasDigit(raw)) return null;
  let number = "", unit = "", seen = false;
  for (const ch of raw) {
    if (digitAt(ch) || ((ch === "." || ch === ",") && seen) || (ch === "-" && !seen)) { number += ch; seen = true; }
    else if (SYMBOL_PREFIX.has(ch) && !seen) unit = ch;
    else if (ch === " ") continue;
    else unit += ch;
  }
  let u = unit.trim();
  if (u && !UNIT_MARKS.includes(u)) { const hit = UNIT_MARKS.find((m) => u.startsWith(m)); u = hit ?? ""; }
  const n = Number(number.split(",").join(""));
  if (!Number.isFinite(n)) return null;
  return { number: n, unit: u || null, raw };
}

/** Two OCR passes (the page as it is, then inverted for light-on-dark text) read the same glyphs twice and split big glyph runs
 *  into fragments. A word whose box lies inside another word's box, or that repeats the same text at the same place, is the same
 *  ink read again — kept once, as the longer reading. */
export function cleanWords(words) {
  const overlap = (a, b) => { const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return ix * iy; };
  return words.filter((w, i) => !words.some((o, j) => {
    if (i === j) return false;
    const small = Math.min(area(w), area(o)) || 1;
    if (overlap(w, o) / small >= 0.7) return o.text.length > w.text.length || (o.text.length === w.text.length && (area(o) > area(w) || (area(o) === area(w) && j < i)));
    return o.text === w.text && Math.hypot(cx(o) - cx(w), cy(o) - cy(w)) <= Math.max(o.h, w.h, 12) && (area(o) > area(w) || (area(o) === area(w) && j < i));
  }));
}

/** Words → lines: sort by vertical centre, cluster within a fraction of a word's height, order each line by x. The OCR's own line
 *  ids are not trusted — two OCR passes mint different ones for the same line. */
export function linesOf(words, tolerance = 0.6) {
  const ws = [...words].sort((a, b) => cy(a) - cy(b) || a.x - b.x);
  const lines = [];
  for (const w of ws) {
    const last = lines.at(-1);
    if (last && Math.abs(cy(w) - last.cy) <= tolerance * Math.max(w.h, last.h)) { last.words.push(w); last.cy = (last.cy * (last.words.length - 1) + cy(w)) / last.words.length; last.h = Math.max(last.h, w.h); }
    else lines.push({ words: [w], cy: cy(w), h: w.h });
  }
  return lines.map((l) => {
    const words = l.words.sort((a, b) => a.x - b.x);
    const x0 = Math.min(...words.map((w) => w.x)), x1 = Math.max(...words.map((w) => w.x + w.w));
    return { text: words.map((w) => w.text).join(" "), words, x: x0, w: x1 - x0, y: Math.min(...words.map((w) => w.y)), h: Math.max(...words.map((w) => w.h)) };
  });
}

/** A line cut at its wide horizontal gaps into SEGMENTS — columns of one visual line. */
export function segmentsOf(line, gapEm = SEGMENT_GAP_EM) {
  const ws = line.words;
  const segs = [[ws[0]]];
  for (let i = 1; i < ws.length; i++) {
    const gap = ws[i].x - (ws[i - 1].x + ws[i - 1].w);
    if (gap > gapEm * line.h) segs.push([ws[i]]); else segs.at(-1).push(ws[i]);
  }
  return segs.map((g) => ({ text: g.map((w) => w.text).join(" "), words: g, x: g[0].x, w: g.at(-1).x + g.at(-1).w - g[0].x, y: Math.min(...g.map((w) => w.y)), h: Math.max(...g.map((w) => w.h)) }));
}

/** "Wind: Moderate breeze (4) E" → { label: "Wind", value: "Moderate breeze (4) E" } — the colon is the split; the label is what precedes the first one. */
export function colonSplit(text) {
  const t = String(text);
  const i = t.indexOf(":");
  if (i <= 0 || i >= t.length - 1) return null;
  if (t[i + 1] !== " ") return null; // "Wind: light" has a space after the colon; "17:35" and "09:00" do not
  const label = t.slice(0, i).trim(), value = t.slice(i + 1).trim();
  if (!label || !value || label.split(" ").length > 4) return null;
  return { label, value };
}

/** A line is a VALUE when it is one short run carrying a number ("23 °C", "74°"), TEXT otherwise ("Saturday 09/05/2020 18:00" has digits but is a heading). */
const lineKind = (l) => (l.value && l.segs.length === 1 && l.text.length < 12 ? "value" : "text");

/** The smallest rectangle that contains a point and is big enough to be a container of text, not a glyph's hole. */
function containerOf(rects, p, minArea) {
  let best = null;
  for (const r of rects) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h && area(r) >= minArea && (!best || area(r) < area(best))) best = r;
  return best;
}

/** compSpecOf({ words, rects, palette, width, height }, { vision, source }) → EOCompSpec@2. */
export function compSpecOf(measure, { vision = null, source = null } = {}) {
  const { rects = [], palette = [], width, height, dividers = [] } = measure ?? {};
  if (!width || !height) throw new TypeError("compSpecOf: the measurement carries no canvas size — an unmeasured comp is not read");
  const words = cleanWords(measure?.words ?? []);
  const lines = linesOf(words);
  const H = median(lines.map((l) => l.h)) || 12;

  // ── annotate each line ─────────────────────────────────────────────────
  const minContainer = 6 * H * H;
  for (const l of lines) {
    l.segs = segmentsOf(l);
    // an ASIDE: the last segment of a line that starts on the left and ends at the right edge — a value or note set beside the text
    // ("23 °C" at the end of an entry's line, "Last update:" beside a run of facts). It is read on its own, not as a column.
    l.aside = null;
    if (l.segs.length >= 2 && l.segs.length <= 3 && l.segs[0].x < 0.4 * width && l.segs.at(-1).x + l.segs.at(-1).w > 0.75 * width && l.segs.at(-1).x > 0.5 * width && !(l.segs.length === 3 && l.segs.every((sg) => sg.words.length <= 2) && isCaps(l.text))) {
      l.aside = l.segs.pop();
      l.w = l.segs.at(-1).x + l.segs.at(-1).w - l.x;
      l.text = l.segs.map((sg) => sg.text).join(" ");
    }
    l.size = l.h / H;
    l.box = containerOf(rects, { x: cx(l), y: cy(l) }, minContainer);
    l.colons = l.segs.map((sg) => colonSplit(sg.text)); // a visual line may hold several facts side by side ("Sunset: 22:36   Last update: 17:35")
    l.colon = l.colons.length && l.colons.every(Boolean) ? l.colons[0] : null;
    l.value = parseValue(l.segs.at(-1).text);
    l.caps = isCaps(l.text);
  }

  // ── group lines into sections ──────────────────────────────────────────
  // CHROME first, line by line: a line wholly inside the screen's top or bottom margin is the device's (clock, signal), not the app's
  const chromeLines = lines.filter((l) => l.y + l.h < CHROME_EDGE * height || l.y > (1 - CHROME_EDGE) * height);
  const bodyLines = lines.filter((l) => !chromeLines.includes(l));
  const groups = [];
  let cur = null;
  for (const l of bodyLines) {
    const prev = cur?.lines.at(-1);
    const gap = prev ? l.y - (prev.y + prev.h) : 0;
    const bgChanged = prev && prev.box && l.box && prev.box.id !== l.box.id && colourDist(prev.box.fill, l.box.fill) > BG_CHANGE;
    // a visible border or fill separates sections; the layout cut's own blocks do not (they are regions of the page, and cut a
    // heading from the body it heads)
    const boxChanged = prev && prev.box && l.box && prev.box.id !== l.box.id && prev.box.via !== "cut" && l.box.via !== "cut";
    const divided = prev && dividers.some((d) => d.y > prev.y + prev.h - 2 && d.y < l.y + 2);
    const why = !prev ? null : gap > GROUP_GAP_EM * H ? `a gap of ${Math.round(gap)}px > ${GROUP_GAP_EM} text heights` : divided ? "a horizontal rule lies between the lines" : bgChanged ? "the background colour changes" : boxChanged ? "the lines sit in different bordered boxes" : null;
    if (!cur || why) { cur = { id: `g${groups.length}`, lines: [], cut: why }; groups.push(cur); }
    cur.lines.push(l);
  }
  for (const g of groups) {
    // the asides of consecutive lines are one note ("Last update:" over "17:35"), kept once for the section
    const asides = g.lines.filter((l) => l.aside).map((l) => l.aside);
    g.aside = asides.length ? asides.map((a) => a.text).join(" ") : null;
    g.x = Math.min(...g.lines.map((l) => l.x));
    g.y = Math.min(...g.lines.map((l) => l.y));
    g.w = Math.max(...g.lines.map((l) => l.x + l.w)) - g.x;
    g.h = Math.max(...g.lines.map((l) => l.y + l.h)) - g.y;
  }

  // ── read each group ────────────────────────────────────────────────────
  const fields = [];
  let fieldSeq = 0;
  const addField = (zone, label, valueText, extra = {}) => {
    const v = parseValue(valueText);
    const f = { id: `f${fieldSeq++}`, zone: zone.id, label: label ? String(label).trim() : null, sample: String(valueText).trim(), kind: v ? "value" : "text", number: v?.number ?? null, unit: v?.unit ?? null, ...extra };
    fields.push(f);
    zone.fields.push(f.id);
    return f;
  };
  const zones = [];
  const firstApp = groups[0];
  const readGroup = (g) => {
    const z = { id: `z${zones.length}`, kind: "text", at: { x: g.x, y: g.y, w: g.w, h: g.h }, fill: g.lines[0].box?.fill ?? null, basis: "", fields: [], lines: g.lines.length, cut: g.cut };
    const asideField = () => { if (!g.aside) return; const c = colonSplit(g.aside); if (c) addField(z, c.label, c.value, { role: "aside", kind: parseValue(c.value) ? "value" : "text" }); else addField(z, null, g.aside, { role: "aside", kind: parseValue(g.aside) ? "value" : "text" }); };
    const ls = g.lines;
    // GRID: consecutive lines that share ≥3 columns whose centres line up — a strip of equal cards
    const n = ls[0].segs.length;
    if (ls.length >= 2 && n >= 3 && ls.every((l) => l.segs.length === n)) {
      const pitch = (ls[0].segs.at(-1).x - ls[0].segs[0].x) / (n - 1) || 1;
      const aligned = ls.every((l) => l.segs.every((s, i) => Math.abs(cx(s) - cx(ls[0].segs[i])) <= GRID_ALIGN * pitch));
      if (aligned) {
        z.kind = "strip"; z.n = n; z.basis = `${ls.length} line(s) of ${n} columns whose centres line up within ${GRID_ALIGN} of the column pitch`;
        z.items = [];
        for (let i = 0; i < n; i++) {
          const item = { fields: [] };
          const col = ls.map((l) => l.segs[i]);
          const valueSeg = col.find((s) => parseValue(s.text)), labelSeg = col.find((s) => s !== valueSeg);
          if (labelSeg) item.fields.push(addField(z, null, labelSeg.text, { kind: "text", role: "label", item: i }).id);
          if (valueSeg) item.fields.push(addField(z, labelSeg?.text ?? null, valueSeg.text, { role: "value", item: i }).id);
          z.items.push(item);
        }
        return z;
      }
    }
    // TABS: one line of ≥2 short segments, all capitals or single words, spread across the width
    if (ls.length === 1 && ls[0].segs.length >= 2 && ls[0].segs.every((s) => s.words.length <= 2) && (ls[0].caps || ls[0].segs.every((s) => s.words.length === 1)) && !ls[0].value) {
      z.kind = "tabs"; z.basis = "one line of ≥2 short segments (capitals or single words) spread across the screen"; z.n = ls[0].segs.length;
      ls[0].segs.forEach((s, i) => addField(z, null, s.text, { kind: "text", role: "tab", item: i }));
      return z;
    }
    // ROWS: ≥2 lines each split into a LEFT label and a RIGHT value
    const pairLine = (l) => l.segs.length === 2 && l.segs[1].text && parseValue(l.segs[1].text) && !parseValue(l.segs[0].text);
    if (ls.length >= 2 && ls.filter(pairLine).length >= Math.ceil(ls.length * 0.6)) {
      z.kind = "rows"; z.n = ls.length; z.basis = `${ls.filter(pairLine).length} of ${ls.length} lines are a left label and a right value`;
      for (const l of ls) { if (pairLine(l)) addField(z, l.segs[0].text, l.segs[1].text, { role: "value" }); else addField(z, null, l.text, { kind: l.value ? "value" : "text", role: "action" }); }
      return z;
    }
    // SUMMARY / FACTS / ENTRY: a headline (a line well above body height) and/or `Label: value` lines
    const head = ls.filter((l) => l.size >= HEADLINE_RATIO).sort((a, b) => b.size - a.size)[0] ?? null;
    const facts = ls.filter((l) => l.colon);
    if (head || facts.length) {
      z.kind = head ? "summary" : facts.length === ls.length ? "facts" : "entry";
      z.basis = [head ? `a line ${head.size.toFixed(1)}× the body text height is the headline (≥${HEADLINE_RATIO}×)` : null, facts.length ? `${facts.length} line(s) split by a colon into label and value` : null].filter(Boolean).join("; ");
      for (const l of ls) {
        if (l === head) { addField(z, null, l.text, { role: "headline", kind: l.value ? "value" : "text" }); continue; }
        if (l.colon) { for (const c of l.colons) addField(z, c.label, c.value, { role: "fact", kind: parseValue(c.value) ? "value" : "text" }); continue; }
        if (l.segs.length === 2 && parseValue(l.segs[1].text)) { addField(z, l.segs[0].text, l.segs[1].text, { role: "value" }); continue; }
        addField(z, null, l.text, { role: ls.indexOf(l) === 0 ? "heading" : "caption", kind: lineKind(l) });
      }
      asideField();
      return z;
    }
    // a single short line: a TITLE (first section of the screen) or plain text
    z.basis = "a section with no headline, no colon-split line, no grid, no tabs, no label/value rows";
    if (ls.length === 1 && g === firstApp && ls[0].text.length < 40) { z.kind = "title"; z.basis = "the first section of the app (after the device chrome), one short line"; }
    ls.forEach((l, i) => addField(z, null, l.text, { kind: lineKind(l), role: z.kind === "title" ? "title" : i === 0 ? "heading" : "text" }));
    asideField();
    return z;
  };
  if (chromeLines.length) {
    const z = { id: `z${zones.length}`, kind: "chrome", at: { x: Math.min(...chromeLines.map((l) => l.x)), y: Math.min(...chromeLines.map((l) => l.y)), w: Math.max(...chromeLines.map((l) => l.x + l.w)) - Math.min(...chromeLines.map((l) => l.x)), h: Math.max(...chromeLines.map((l) => l.y + l.h)) - Math.min(...chromeLines.map((l) => l.y)) }, fill: null, basis: `lines wholly within the top or bottom ${CHROME_EDGE * 100}% of the screen are the device's (status / navigation bar), not the app's`, fields: [], lines: chromeLines.length, cut: null };
    chromeLines.forEach((l) => addField(z, null, l.text, { kind: "text", role: "chrome" }));
    zones.push(z);
  }
  for (const g of groups) zones.push(readGroup(g));

  // ── repeats: adjacent sections with one signature are a LIST ───────────
  const sig = (z) => `${z.kind}:${z.fields.map((id) => { const f = fields.find((x) => x.id === id); return `${f.role ?? "?"}${f.kind[0]}${f.label ? "L" : ""}`; }).join(",")}`;
  const listable = new Set(["entry", "facts", "summary", "rows", "text"]);
  // the roles of a section's fields, with a caption and plain text the same thing: the comparison a CUT-OFF last entry needs
  const roles = (z) => z.fields.map((id) => { const f = fields.find((x) => x.id === id); const r = f.role === "caption" || f.role === "text" ? "t" : f.role; return `${r}${f.kind[0]}${f.label ? "L" : ""}`; });
  // two entries of one list need not have the same number of lines (one station lists three grades, the next one): they are the same KIND
  // of entry when the roles of the shorter are all among the roles of the longer and they share a heading and a value-bearing role
  const roleSet = (z) => new Set(roles(z).map((r) => r.replace(/[tvL]+$/, "") || r));
  const compatible = (a, b) => { const A = roleSet(a), B = roleSet(b); const [small, big] = A.size <= B.size ? [A, B] : [B, A]; return a.kind === "entry" && b.kind === "entry" && [...small].every((r) => big.has(r)) && small.has("heading") && (small.has("fact") || small.has("aside") || small.has("value")); };
  const cutOff = (z, first) => { const a = roles(z), b = roles(first); return z.at.y + z.at.h > (1 - CUTOFF_EDGE) * height && a.length < b.length && a.every((r, k) => r === b[k]); };
  const out = [];
  for (let i = 0; i < zones.length;) {
    let j = i + 1;
    while (j < zones.length && listable.has(zones[i].kind) && ((zones[j].kind === zones[i].kind && (sig(zones[j]) === sig(zones[i]) || compatible(zones[i], zones[j]))) || (j > i && cutOff(zones[j], zones[i]) && j === zones.length - 1))) j++;
    const run = zones.slice(i, j);
    const need = zones[i].lines >= COMPLEX_LINES ? REPEAT_MIN_COMPLEX : REPEAT_MIN;
    if (run.length >= need && listable.has(zones[i].kind)) {
      const first = run[0];
      const minX = Math.min(...run.map((z) => z.at.x));
      out.push({ id: `z${out.length}`, kind: "list", n: run.length, entry: first.kind, at: { x: minX, y: first.at.y, w: Math.max(...run.map((z) => z.at.x + z.at.w)) - minX, h: run.at(-1).at.y + run.at(-1).at.h - first.at.y },
        fill: first.fill, basis: `${run.length} adjacent sections share one signature (${sig(first)}) — REPEAT_MIN=${REPEAT_MIN}, or ${REPEAT_MIN_COMPLEX} when an entry has ≥${COMPLEX_LINES} lines`,
        items: run.map((z) => ({ fields: z.fields })), fields: run.flatMap((z) => z.fields), lines: first.lines });
    } else for (const z of run) out.push({ ...z, id: `z${out.length}` });
    i = j;
  }
  const finalOf = new Map();
  out.forEach((z) => z.fields.forEach((id) => finalOf.set(id, z.id)));
  fields.forEach((f) => { f.zone = finalOf.get(f.id) ?? f.zone; });

  const counted = out.filter((z) => z.n).map((z) => ({ zone: z.id, kind: z.kind === "strip" ? "card" : z.kind === "rows" ? "row" : z.kind === "tabs" ? "tab" : "entry", n: z.n }));
  return Object.freeze({
    schema: COMP_SPEC_SCHEMA,
    canvas: { width, height },
    palette: palette.map((p) => ({ rgb: p.rgb, frac: p.frac })),
    textHeight: H,
    zones: out, fields, counted,
    vision: vision ?? null,
    source,
    basis: "measured by comp-detect.py (Tesseract words, read twice; OpenCV rectangles; a layout cut); read by comp-read.js — sizes, positions and repeats only, no meaning",
  });
}

/** The spec as a sentence a person would say of the comp ("a strip of 5 cards"). */
export function describeSpec(spec) {
  return spec.zones.map((z) => {
    const title = z.fields.length ? spec.fields.find((f) => f.id === z.fields[0])?.sample : null;
    switch (z.kind) {
      case "strip": return `a strip of ${z.n} cards`;
      case "rows": return `a stack of ${z.n} label/value rows`;
      case "tabs": return `${z.n} tabs`;
      case "list": return `a list of ${z.n} ${z.entry === "entry" ? "entries" : z.entry + "s"}`;
      case "summary": return `a summary (headline${z.fields.length > 2 ? ` and ${z.fields.length - 1} more lines` : ""})`;
      case "facts": return `${z.fields.length} label: value facts`;
      case "chrome": return "device chrome";
      case "title": return `a title "${title}"`;
      default: return `${z.kind}${title ? ` "${String(title).slice(0, 30)}"` : ""}`;
    }
  });
}
