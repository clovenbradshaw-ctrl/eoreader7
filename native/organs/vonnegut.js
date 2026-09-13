// organs/vonnegut.js — the WRITER's arc: the fortune curve of the piece.
//
// Handle: Vonnegut — after Kurt Vonnegut's shape theory of stories. A story
// is a line on a graph of fortune (good/bad luck, or here: the reader's
// CONVICTION that the piece knows what it is talking about) against time.
//
// Fortune here is measured, never felt: the reader's conviction is the
// CUMULATIVE material claims the piece has established by each section
// boundary — the propositions of the record (the EOT fold) that the piece
// has actually re-stated, resolved through the material's own referent
// index. A piece that names the record's claims is a piece the reader
// believes; one that never does is a flatline that argues nothing.
//
// The measured arc (fortune curve + the classic Vonnegut read) is handed to
// organs/story-shapes.js, which maps it into the full EO taxonomy (27 cells).

// The classic four. (Vonnegut's eight include two more — "boy-meets-girl"
// and "creation story" — that our fortune-as-conviction measure cannot see
// with this instrument; the measured set is named honestly as what it is.)
const NORM = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();

export function storyShape(documentLines = [], { materialPropositions = [], index = null } = {}) {
  const props = (materialPropositions ?? []).filter((p) => p && NORM(p.label));
  const resolveIn = (text) => {
    try {
      const r = index?.resolveIn?.(String(text ?? ""));
      return r instanceof Set ? r : new Set(r ?? []);
    } catch { return new Set(); }
  };
  // The fortune curve: cumulative material claims established, per section
  // boundary. A claim is established the first time a section carries its act
  // (label), the same recall golden-tool.mjs scores on — conviction is built
  // by re-stating the record, not by length.
  const fortune = [];
  const covered = new Set();
  for (const sectionText of documentLines) {
    const text = String(sectionText ?? "").toLowerCase();
    for (const p of props) {
      const lab = NORM(p.label);
      if (!lab || covered.has(lab)) continue;
      if (lab.length > 2 && text.includes(lab)) covered.add(lab);
    }
    fortune.push(covered.size);
  }
  const total = props.length || 1;
  const normalized = fortune.map((c) => (props.length ? c / total : 0));
  const n = normalized.length;
  const first = n ? normalized[0] : 0;
  const last = n ? normalized[n - 1] : 0;
  const mean = n ? normalized.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n ? normalized.reduce((a, b) => a + (b - mean) ** 2, 0) / n : 0;
  const min = n ? Math.min(...normalized) : 0;
  const minIdx = n ? normalized.indexOf(min) : 0;
  // The classic read, from the shape of the curve alone.
  let arc = "flatline";
  if (n && variance >= 0.02) {
    if (first < 0.5 && last > 0.5) {
      // The curve rose overall. Man-in-hole: it dipped at the start and the
      // climb is what carries the reader (the opening was the hole). Steady
      // creation: it rose without a hole.
      const dippedEarly = minIdx <= 1 && (normalized[1] ?? 0) > first;
      arc = (last - first >= 0.3 && !dippedEarly) ? "rags-to-riches" : "man-in-hole";
    } else if (first > 0.5 && last < 0.5) {
      arc = "from-bad-to-worse";
    } else {
      arc = "flatline";
    }
  }
  return {
    schema: "EOFortuneCurve@1",
    arc,
    fortune: normalized,
    claims: covered.size,
    of: props.length,
    slope: n > 1 ? (last - first) / (n - 1) : 0,
    variance,
    low: n ? { index: minIdx, value: min } : null,
    high: n ? { index: normalized.indexOf(Math.max(...normalized)), value: Math.max(...normalized) } : null,
    basis: arc === "flatline"
      ? `the piece re-states none of the record's ${total} proposition(s) — the reader's conviction never moves`
      : `the piece carries ${covered.size} of the record's ${total} proposition(s), conviction ${arc}`,
  };
}