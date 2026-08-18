// ledger-harness.mjs — the rehearsal witness: runs the ledger fold's ACTUAL
// bytes (pasted node-side from the live browser's localStorage) against a
// stub document, fires the events a reader would fire, and asserts each
// stage's own observable. This is deliberately a SECOND, independent witness
// from witness.js::witnessCode — that one reads the artifact structurally
// (does it compile, do ids resolve); this one reads it BEHAVIORALLY (does
// clicking a cell actually write the status bar). Where the two disagree is
// itself the finding this run exists to produce — never merged into one
// verdict (CLAUDE.md's parliament-of-witnesses discipline).
//
// Usage:
//   node eval/ledger-harness.mjs <html-file> [stageName ...]
// With no stage names, every stage registered so far runs and a scoreboard
// prints. `html-file` holds the fold's current projection (paste it there
// with the Browser pane's javascript_tool — see the brief).

import { readFileSync } from "node:fs";
import { scriptBodies, witnessCode } from "../witness.js";
import { loadHTML, fire, typeInto } from "./ledger-dom.mjs";

/** Run every <script> the fold's html carries against a fresh stub document.
 * Returns {document, window, errors} — errors are execution exceptions,
 * kept (never thrown) so a broken script still reports a scoreboard instead
 * of crashing the harness. */
export function runFold(html) {
  const document = loadHTML(html);
  const listeners = new Map();
  const window = {
    document,
    addEventListener: (t, h) => {
      if (!listeners.has(t)) listeners.set(t, []);
      listeners.get(t).push(h);
    },
    removeEventListener: (t, h) => {
      const l = listeners.get(t);
      if (l) {
        const i = l.indexOf(h);
        if (i >= 0) l.splice(i, 1);
      }
    },
    dispatchEvent: () => true,
    localStorage: makeLocalStorage(),
    console,
    setTimeout: (fn, ms, ...a) => fn(...a), // synchronous: the harness reads state immediately after firing
    clearTimeout: () => {},
    Math,
    location: { href: "http://localhost/" },
  };
  const errors = [];
  const scripts = scriptBodies(html);
  for (const body of scripts) {
    try {
      const fn = new Function(
        "document",
        "window",
        "alert",
        "confirm",
        "prompt",
        "localStorage",
        "console",
        body,
      );
      fn(document, window, () => {}, () => true, () => "", window.localStorage, console);
    } catch (err) {
      errors.push(String(err && err.stack ? err.stack : err));
    }
  }
  // a script that only wires up on DOMContentLoaded needs that fired once
  // execution finishes, the way a real page's parser would.
  fire(document, "DOMContentLoaded");
  for (const h of listeners.get("DOMContentLoaded") ?? []) h.call(window, { type: "DOMContentLoaded" });
  for (const h of listeners.get("load") ?? []) h.call(window, { type: "load" });
  return { document, window, errors, scriptCount: scripts.length };
}

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

/** Find the cell for a spreadsheet address like "B3", trying the shapes a
 * small model is likely to have produced, cheapest/most-specific first. */
export function findCell(document, addr) {
  const m = /^([A-Za-z])(\d+)$/.exec(addr);
  if (!m) return null;
  const [, col, row] = m;
  const tries = [
    () => document.getElementById(addr),
    () => document.getElementById(addr.toLowerCase()),
    () => document.querySelector(`[data-address="${addr}"]`),
    () => document.querySelector(`[data-cell="${addr}"]`),
    () => document.querySelector(`[data-addr="${addr}"]`),
    () => document.querySelector(`[data-col="${col}"][data-row="${row}"]`),
    () => document.querySelector(`#cell-${addr}`),
    () => document.querySelector(`#cell_${addr}`),
  ];
  for (const t of tries) {
    const hit = t();
    if (hit) return hit;
  }
  // positional fallback: Nth editable cell in Nth grid row, 1-indexed by
  // column letter and numeric row — only used once the grid's own shape is
  // known; left as a documented gap until stage 1 lands and the real
  // structure is visible.
  return null;
}

/** Every editable cell the artifact declares — input/textarea elements or
 * anything carrying contenteditable, inside whatever the grid's own root
 * turns out to be. Broad on purpose at this stage of the harness's life. */
export function editableCells(document) {
  const inputs = document.querySelectorAll("input, textarea");
  const editable = document.querySelectorAll('[contenteditable], [contenteditable="true"]');
  return [...inputs, ...editable];
}

/** Simulate typing into a contenteditable cell and blurring it — the shape
 * every stage 3+ observable actually needs (grid cells are contenteditable
 * <td>s, not <input>s, so typeInto's `.value` assignment doesn't apply). */
export function editCell(cell, value) {
  cell.textContent = String(value);
  fire(cell, "blur");
}

export function text(el) {
  return (el?.textContent ?? "").trim();
}
export function val(el) {
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" ? el.value : text(el);
}

// ── stage checks ─────────────────────────────────────────────────────────
// Each stage function takes {document, window} (a fresh runFold() result,
// re-run per check so stages don't leak state into each other) and returns
// an array of {name, pass, detail}. Filled in as each stage's real code
// lands — this is the harness's own append-only growth, one stage at a time.

export const STAGES = {
  1: function stage1_birth({ document }) {
    const out = [];
    const headerText = [...document.querySelectorAll("th")].map(text);
    const hasHeaders = ["A", "B", "C", "D", "E"].every((h) => headerText.includes(h));
    out.push({ name: "column headers A–E present", pass: hasHeaders, detail: headerText.join(",") });

    const rowText = [...document.querySelectorAll("th, .rownum, .row-header, [data-role='row-header']")].map(text);
    const hasRows = ["1", "2", "3", "4", "5"].every((r) => rowText.includes(r));
    out.push({ name: "row numbers 1–5 present", pass: hasRows, detail: rowText.join(",") });

    const cells = editableCells(document);
    out.push({ name: "25 editable cells present", pass: cells.length === 25, detail: `found ${cells.length}` });

    const addressed = ["A1", "B3", "E5"].every((a) => !!findCell(document, a));
    out.push({ name: "cells addressable by A1-style id", pass: addressed, detail: addressed ? "ok" : "findCell() misses A1/B3/E5" });
    return out;
  },

  2: function stage2_selection({ document }) {
    const out = [];
    const status = document.getElementById("status");
    out.push({ name: "#status element exists", pass: !!status, detail: status ? "found" : "missing" });
    if (status) {
      const b3 = findCell(document, "B3");
      fire(b3, "click");
      out.push({ name: "clicking B3 writes 'B3' into #status", pass: text(status) === "B3", detail: `status now "${text(status)}"` });
      const d1 = findCell(document, "D1");
      fire(d1, "click");
      out.push({ name: "clicking D1 updates #status to 'D1'", pass: text(status) === "D1", detail: `status now "${text(status)}"` });
    }
    return out;
  },

  3: function stage3_values({ document }, rawHtml) {
    // window.data is NOT observable here even when the store works exactly
    // as asked: a script's top-level `const`/`let` is scoped to the script,
    // never to `window`, in a real browser too (only classic top-level
    // `var` would attach to window) — so this stage's own observable is
    // structural (does an assignment into a keyed store exist, gated on a
    // change/blur listener) rather than externally reachable state. Full
    // BEHAVIORAL confirmation is what stage 4 gives for free: a formula
    // reading back a value only just-typed proves the store held it.
    const out = [];
    const scripts = scriptBodies(rawHtml).join("\n");
    const hasKeyedWrite = /data\[[^\]]+\]\s*=/.test(scripts);
    out.push({ name: "script writes into a keyed data store (data[addr] = …)", pass: hasKeyedWrite, detail: hasKeyedWrite ? "found" : "no data[...] = assignment in script" });
    const hasChangeOrBlur = /addEventListener\(\s*["'](change|blur|input)["']/.test(scripts);
    out.push({ name: "write is gated on a change/blur/input listener", pass: hasChangeOrBlur, detail: hasChangeOrBlur ? "found" : "no change/blur/input listener" });
    return out;
  },

  4: function stage4_formulas({ document }) {
    const out = [];
    const a1 = findCell(document, "A1");
    const b1 = findCell(document, "B1");
    const c1 = findCell(document, "C1");
    editCell(a1, "5");
    editCell(b1, "7");
    editCell(c1, "=A1+B1");
    out.push({ name: "C1 set to =A1+B1 (with A1=5, B1=7) displays 12", pass: text(c1) === "12", detail: `C1 shows "${text(c1)}"` });
    return out;
  },

  5: function stage5_recompute({ document }) {
    const out = [];
    const a1 = findCell(document, "A1");
    const b1 = findCell(document, "B1");
    const c1 = findCell(document, "C1");
    editCell(a1, "5");
    editCell(b1, "7");
    editCell(c1, "=A1+B1");
    editCell(a1, "10");
    out.push({ name: "editing A1 to 10 afterwards updates C1 to 17", pass: text(c1) === "17", detail: `C1 shows "${text(c1)}"` });
    return out;
  },

  6: function stage6_chained({ document }) {
    const out = [];
    const a1 = findCell(document, "A1");
    const b1 = findCell(document, "B1");
    const c1 = findCell(document, "C1");
    const d1 = findCell(document, "D1");
    editCell(a1, "5");
    editCell(b1, "7");
    editCell(c1, "=A1+B1");
    editCell(a1, "10");
    editCell(d1, "=C1*2");
    out.push({ name: "D1 = C1*2 displays 34 (C1=17 at this point)", pass: text(d1) === "34", detail: `D1 shows "${text(d1)}"` });
    editCell(a1, "1");
    out.push({ name: "then A1=1 → C1 becomes 8", pass: text(c1) === "8", detail: `C1 shows "${text(c1)}"` });
    out.push({ name: "then A1=1 → D1 becomes 16 (chained through C1)", pass: text(d1) === "16", detail: `D1 shows "${text(d1)}"` });
    return out;
  },

  8: function stage8_clear_export({ document }) {
    const out = [];
    const a1 = findCell(document, "A1");
    const b1 = findCell(document, "B1");
    const c1 = findCell(document, "C1");
    const d1 = findCell(document, "D1");
    editCell(a1, "5");
    editCell(b1, "7");
    editCell(c1, "=A1+B1");
    editCell(d1, "=C1*2");
    const exportBtn = document.getElementById("exportBtn");
    const csvOut = document.getElementById("csvOut");
    out.push({ name: "clear + export buttons exist", pass: !!document.getElementById("clearBtn") && !!exportBtn, detail: "checked" });
    if (exportBtn && csvOut) {
      fire(exportBtn, "click");
      const row1 = text(csvOut).split("\n")[0];
      // 5 columns A-E; E1 was never set, so the row ends in a trailing comma
      // for its empty field — that's a correct CSV, not a missing value.
      out.push({ name: "export produces row1 = 5,7,12,24, (A1,B1,C1,D1,E1)", pass: row1 === "5,7,12,24,", detail: `row1 = "${row1}"` });
    }
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      fire(clearBtn, "click");
      const allEmpty = ["A1", "B1", "C1", "D1"].every((a) => text(findCell(document, a)) === "");
      out.push({ name: "clear empties every cell", pass: allEmpty, detail: allEmpty ? "ok" : "some cell still has text" });
    }
    return out;
  },
};

export function runStage(n, html) {
  const check = STAGES[n];
  if (!check) return { stage: n, results: [], note: "no checks registered yet for this stage" };
  const { document, window, errors } = runFold(html);
  const structuralWitness = witnessCode("html", html);
  const results = check({ document, window }, html);
  return { stage: n, results, execErrors: errors, structuralWitness };
}

function printScoreboard(html, stages) {
  for (const n of stages) {
    const { results, execErrors, structuralWitness, note } = runStage(n, html);
    if (note) {
      console.log(`stage ${n}: ${note}`);
      continue;
    }
    const pass = results.filter((r) => r.pass).length;
    console.log(`stage ${n}: ${pass}/${results.length}`);
    for (const r of results) console.log(`  ${r.pass ? "✓" : "✗"} ${r.name}${r.pass ? "" : `  (${r.detail})`}`);
    if (execErrors.length) console.log(`  ⚠ ${execErrors.length} script execution error(s): ${execErrors[0].split("\n")[0]}`);
    const rehearsalOk = results.length > 0 && results.every((r) => r.pass) && execErrors.length === 0;
    const structOk = structuralWitness.ok !== false;
    if (rehearsalOk !== structOk) {
      console.log(`  ⚠ DISAGREEMENT: rehearsal witness says ${rehearsalOk ? "clean" : "dirty"}, witnessCode says ${structOk ? "clean" : "dirty"} (${JSON.stringify(structuralWitness.findings)})`);
    }
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node eval/ledger-harness.mjs <html-file> [stage ...]");
    process.exit(1);
  }
  const html = readFileSync(file, "utf8");
  const requested = process.argv.slice(3).map(Number);
  const stages = requested.length ? requested : Object.keys(STAGES).map(Number);
  printScoreboard(html, stages);
}
