// eval/capacity-map/lib/plays.mjs — the plays of the Complete Works, as turn sequences.
//
// Identity is GIVEN by the markup: a speech header is an ALL-CAPS line ending in a period, on
// its own line, unindented ("BARNARDO."). A speaker is a being; the unit is the turn; a being's
// arrivals are the turn indices at which it speaks. `ALL` is removed (it is a collective label,
// not a being — declared in THE-CAPACITY-MAP.md F4). A play runs from its title line in the
// body to the next play's title line; the Contents list (indented) is skipped by requiring an
// unindented exact match. The non-dramatic works are not plays and are not read.
import fs from "node:fs";

const NOT_PLAYS = new Set(["THE SONNETS", "A LOVER’S COMPLAINT", "THE PASSIONATE PILGRIM", "THE PHOENIX AND THE TURTLE", "THE RAPE OF LUCRECE", "VENUS AND ADONIS"]);
const HEADER = /^([A-Z][A-Z .'’-]*[A-Z])\.$/;
const COLLECTIVE = new Set(["ALL"]);

export function loadPlays(path) {
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
  // titles: indented lines in the Contents block, before the first body title
  const contentsEnd = lines.findIndex((l, i) => i > 5 && /^THE SONNETS$/.test(l));
  const titles = [];
  for (let i = 0; i < contentsEnd; i++) {
    const t = lines[i].trim();
    if (lines[i].startsWith("    ") && t && t === t.toUpperCase() && !NOT_PLAYS.has(t) && t !== "CONTENTS") titles.push(t);
  }
  const starts = [];
  for (const t of titles) {
    const at = lines.findIndex((l, i) => i > contentsEnd && l === t);
    if (at >= 0) starts.push({ title: t, at });
  }
  starts.sort((a, b) => a.at - b.at);
  // the last non-play (poems) title bounds the final play if it follows
  const afterTitles = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l, i }) => i > contentsEnd && (NOT_PLAYS.has(l)))
    .map(({ i }) => i);
  const plays = [];
  starts.forEach((s, k) => {
    const nextPlay = starts[k + 1]?.at ?? Infinity;
    const nextPoem = afterTitles.find((i) => i > s.at) ?? Infinity;
    const end = Math.min(nextPlay, nextPoem, lines.length);
    const turns = [];
    for (let i = s.at; i < end; i++) {
      const m = HEADER.exec(lines[i]);
      if (m && !COLLECTIVE.has(m[1])) turns.push(m[1]);
    }
    if (turns.length) plays.push({ title: s.title, turns });
  });
  return plays;
}

/** A play's beings: speakers with >= 2 turns; arrivals are turn indices. */
export function playBeings(play) {
  const m = new Map();
  play.turns.forEach((sp, i) => { const a = m.get(sp) ?? []; a.push(i); m.set(sp, a); });
  return {
    N: play.turns.length,
    beings: [...m].map(([id, arrivals]) => ({ id, arrivals })).filter((b) => b.arrivals.length >= 2)
      .sort((a, b) => b.arrivals.length - a.arrivals.length || (a.id < b.id ? -1 : 1)),
  };
}
