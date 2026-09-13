// organs/pacing.js — Murch's pacing: the blink of an eye.
//
// Handle: Murch — after Walter Murch's editing rule that a film is cut where
// the blink falls. The reader's eye rests at a sentence boundary; the blink
// is where a thought or emotion turns. This organ grades a piece's RHYTHM:
// sentence-length variance, BLINK POINTS (a short sentence landing after
// long ones — the eye resting where the thought turns), and DENSE sentences
// (the swells). A flatline piece (variance below a floor of its mean, no
// blinks) is Murch's boredom at the rhythm grain — the editor's flag, which
// the rewrite carries: dense information reads slow, release it with a short
// sentence.

// Split prose into sentences, each with its word count.
function sentencesOf(text) {
  return String(text ?? "")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ text: s, words: s.split(/\s+/).filter(Boolean).length }));
}

export function pacingGrade(text = "") {
  const sents = sentencesOf(text);
  if (sents.length < 3) {
    return { flatline: false, basis: "fewer than three sentences — no rhythm to grade", n: sents.length };
  }
  const lengths = sents.map((s) => s.words);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const ratio = mean > 0 ? Math.sqrt(variance) / mean : 0;
  // BLINK POINTS: a short sentence (≤ 60% of the mean) landing after a long
  // one (≥ 120% of the mean) — the eye rests where the thought turns.
  const blinks = [];
  for (let i = 1; i < sents.length; i++) {
    const prev = lengths[i - 1], cur = lengths[i];
    if (prev >= mean * 1.2 && cur <= mean * 0.6) {
      blinks.push({ index: i, prevLength: prev, blinkLength: cur, text: sents[i].text.slice(0, 90) });
    }
  }
  // DENSE sentences: the swells — long sentences (≥ 150% of the mean) that
  // carry information the reader must unpack slowly.
  const dense = [];
  for (let i = 0; i < sents.length; i++) {
    if (lengths[i] >= mean * 1.5) dense.push({ index: i, words: lengths[i], text: sents[i].text.slice(0, 120) });
  }
  // FLATLINE: the rhythm never varies — variance below a floor of its mean
  // (Murch's rule: < 30% of mean) and no blinks.
  const flatline = ratio < 0.3 && blinks.length === 0;
  return {
    flatline,
    basis: flatline
      ? `the piece paces flat — sentence lengths never vary (sd ${ratio.toFixed(2)} of mean ${mean.toFixed(1)} words) and there is no blink, no cut`
      : `${blinks.length} blink(s), ${dense.length} dense sentence(s) — the rhythm cuts where the thought turns`,
    n: sents.length,
    mean: Number(mean.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    ratio: Number(ratio.toFixed(3)),
    blinks,
    dense,
  };
}