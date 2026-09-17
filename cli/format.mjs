// format.mjs — pure terminal-formatting helpers shared by the TUI and its
// tests. No Ink, no React, no I/O: anything here must be testable directly
// under `node` even while the machine is under heavy load.

// Word-wrap a block to `width` columns, preserving explicit newlines and
// wrapping long words (URLs, hex addresses) that overflow a single line.
// The transcript pane never truncates a line silently again.
export function wrapText(text, width) {
  const out = [];
  for (const rawLine of String(text).split("\n")) {
    if (rawLine.length <= width || width <= 0) {
      out.push(rawLine);
      continue;
    }
    const words = rawLine.split(" ");
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length <= width) {
        line = candidate;
      } else {
        if (line) { out.push(line.trimEnd()); line = ""; }
        // A single word longer than the width still gets hard-wrapped.
        let rest = w;
        while (rest.length > width) {
          out.push(rest.slice(0, width));
          rest = rest.slice(width);
        }
        line = rest;
      }
    }
    if (line) out.push(line.trimEnd());
  }
  return out;
}

// ── Facing page row model (a "full response" rendered as a book spread) ──
// Left page: the SOURCES — each material fact with its permanent address and
// the VERBATIM SNIP resolved from the real file. Right page: the RESPONSE,
// each sentence tagged [S#] to the fact it draws from, or [M] for the mouth's
// own prose. Merged into shared rows (with a gutter) so one scroll moves both
// pages in sync.
export function facingRows(holo, cols) {
  const avail = Math.max(30, cols - 6);
  const gutter = 1;
  const leftW = Math.floor((avail - gutter) / 2);
  const rightW = avail - gutter - leftW;

  const left = [];
  const right = [];

  left.push("THE SOURCES — what inspired it");
  left.push("  ");
  const facts = holo.inspiredBy?.material ?? [];
  if (!facts.length) {
    left.push("  (no sources recorded for this artifact)");
  }
  facts.forEach((f) => {
    const cite = holo.prose.filter((s) => s.factIndex === f.index).length;
    left.push(...wrapText(`S${f.index} · “${f.fact}”${cite ? `  — cited ×${cite}` : ""}`, leftW).map((l, i) => (i === 0 ? l : `  ${l}`)));
    const addr = f.snip?.address ?? f.ref ?? "(no address)";
    left.push(...wrapText(`    ${addr}`, leftW));
    if (f.snip?.verbatim) {
      left.push(...wrapText(`    ↳ ${f.snip.verbatim}`, leftW).map((l) => `    ${l}`));
    } else if (f.snip && !f.snip.resolved) {
      left.push(`    ↳ (source file not found here — address kept)`);
    }
    left.push("  ");
  });

  const dir = holo.inspiredBy?.direction;
  if (dir) {
    left.push(`direction · ${dir.giver ?? "?"}`);
    left.push(...wrapText(`    ${dir.source ?? ""}`, leftW));
    if (dir.quote) left.push(...wrapText(`    ↳ ${dir.quote}`, leftW).map((l) => `    ${l}`));
    if (dir.snip?.verbatim) left.push(...wrapText(`    ↳ ${dir.snip.verbatim}`, leftW).map((l) => `    ${l}`));
    left.push("  ");
  }

  right.push("THE RESPONSE — sentence · source");
  right.push("  ");
  const prose = holo.prose ?? [];
  if (!prose.length) {
    right.push("  (no prose in this artifact)");
  }
  prose.forEach((s) => {
    const grounded = s.ground === "material" && s.factIndex != null;
    const tag = grounded ? `S${s.factIndex}` : "M";
    const lines = wrapText(s.text ?? "", rightW - 5);
    lines.forEach((l, li) => {
      const prefix = li === 0 ? `[${tag}] ` : "     ";
      right.push(`${prefix}${l}`);
    });
    if (!grounded) right.push(`     (the mouth's own prose — self:model)`);
    else if (s.groundedOn) right.push(`     grounded on “${s.groundedOn}”`);
    right.push("  ");
  });

  const n = Math.max(left.length, right.length);
  const merged = [];
  for (let i = 0; i < n; i++) {
    merged.push({ left: left[i] ?? "", right: right[i] ?? "" });
  }
  return { merged, leftW, rightW };
}