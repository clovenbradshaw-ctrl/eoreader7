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

// TUI TRIPWIRE (2026-09-17): the chat message is the prose and nothing
// else. The artifact's citation apparatus (a Sources appendix, APA
// footnotes) renders in the BROWSER, folded client-side from the ledger —
// never in the transcript. The producer (proxy-runner.mjs) already keeps
// it out of the message; this is the defense-in-depth cut so even a
// regression cannot print it in the terminal. A `## Sources (verbatim)`
// or `## Footnotes` section — and anything under it until the next
// heading — is dropped mechanically, with the message re-joined.
export const stripCitationAppendix = (text) => {
  const lines = String(text ?? "").split("\n");
  const kept = [];
  let dropping = false;
  for (const line of lines) {
    if (/^\s*#{1,3}\s+(Sources\s*\(verbatim\)|Footnotes)/i.test(line)) { dropping = true; continue; }
    if (dropping) {
      if (/^\s*#{1,3}\s+\S/.test(line)) dropping = false;
      else continue;
    }
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

// ── Snipped-verbatim provenance line ──
// A mechanical quote (the snip hand's cut) is non-model prose: the TUI
// renders it in its own kind + color, and this line — never a [model] tag —
// says where the words came from. Pure, so the contract is unit-testable:
// the line must name the non-model standing with or without a URL.
export function snipLine(url) {
  const u = String(url ?? "").trim();
  return u
    ? `[snipped — non-model verbatim · ${u}]`
    : `[snipped — non-model verbatim]`;
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
  // A3: a ledger void is an explicit record (holo.voids / holo.void) — its
  // absence beside a voidClaim sentence is the finding, stated mechanically.
  const ledgerVoid = Array.isArray(holo.voids) ? holo.voids.length > 0 : Boolean(holo.void ?? holo.inspiredBy?.void);
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
    // A3: [M]-as-void vs [M]-as-prose — a self:model sentence claiming
    // emptiness with no void on the ledger is tagged, never promoted.
    if (!grounded && s.voidClaim && !ledgerVoid) right.push(`     (unclaimed emptiness — no void on ledger)`);
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
// A territory answer (POST /v1/territory) as plain lines: the map with the price of each split, or the answer to a question with
// the passage each document was found in. Pure, so the TUI and its tests share it.
export function territoryLines(a) {
  const n = (x) => Number(x).toLocaleString("en-US");
  const out = [];
  if (!a || a.error) return [`territory: ${a?.error ?? "no answer"}`];
  if (Array.isArray(a.hits)) {
    out.push(`${n(a.matched)} documents match "${a.q}" (${a.ms} ms)${a.absent?.length ? `; the folder never says: ${a.absent.join(", ")}` : ""}`);
    for (const h of a.hits.slice(0, 8)) out.push(`  ${h.name}  [territory ${h.territory}]`, `      ${String(h.snippet || h.title || "").slice(0, 140)}`);
    if (a.territories?.length) out.push(`the best answers fall in territories ${a.territories.slice(0, 5).map((t) => `${t.id} (${t.hits})`).join(", ")}`);
    return out;
  }
  if (Array.isArray(a.documents)) return [`territory ${a.territory}: ${a.documents.map((d) => d.name).join(", ")}`];
  const S = a.map?.stats, files = a.files ?? {};
  if (!S) return ["territory: nothing to show"];
  out.push(`${a.root}`, `${n(S.docs)} documents of ${n(files.found)} files, ${n(S.words)} words, ${n(S.redundant)} near-duplicates${files.truncated ? ", crawl stopped at its budget" : ""}`);
  const walk = (node, depth) => {
    const pad = "  ".repeat(depth);
    if (node.split) { out.push(`${pad}${n(node.docs)} docs: a split saves ${n(Math.round(node.split.gain))} bits, halves ${node.split.jsd.toFixed(2)} apart (0 same, 1 nothing shared)`); node.children.forEach((c) => walk(c, depth + 1)); }
    else out.push(`${pad}[${node.leaf.id}] ${n(node.leaf.docs)} docs${node.leaf.coherent ? ", coherent" : ""}: ${node.leaf.terms.slice(0, 5).join(", ") || "(no distinctive words)"}`);
  };
  if (a.map.tree) walk(a.map.tree, 0);
  out.push(`${a.map.K} territories${a.map.exhausted ? ": every one is coherent" : ""}. /map <folder> ? <question> asks all of it.`);
  return out;
}
