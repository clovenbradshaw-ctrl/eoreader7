#!/usr/bin/env node
// date-normalize-integration.mjs — proves the full chain: regime.js's
// widened date-candidate SHAPE + the pyodide-backed dateutil parser,
// injected as `parseValidityWindow`'s own `parseDate` parameter, on real
// ordinance-shaped sentences that the default `Date.parse` cannot resolve.
//
// Kept OUT of regime.test.js on purpose: pyodide's own boot is ~9s, and
// the main suite stays a fast, pure, zero-network unit-test run. This is
// the heavier, real-dependency companion — the same posture this
// directory's own eval drivers take everywhere else (a re-runnable
// driver, not a committed regression test the fast suite must pay for).
//
//   node date-normalize-integration.mjs

import { parseValidityWindow, inValidityWindow, tagClaim, precedence } from "../../organs/regime.js";
import { createDateNormalizer } from "./date-normalize.mjs";

const CASES = [
  {
    name: "day-first date (31/12/2024) — Date.parse fails, dateutil succeeds",
    text: "This ordinance is effective as of 31/12/2024 and shall terminate on 31/12/2025.",
  },
  {
    name: "ordinal + abbreviation (Jan. 1st, 2020) — Date.parse fails, dateutil succeeds",
    text: "This ordinance is effective as of Jan. 1st, 2020 and expires on Dec. 31st, 2024.",
  },
  {
    name: "ISO dates — both parsers should agree (the zero-dependency floor stays correct)",
    text: "Effective as of 2015-01-01. This ordinance shall terminate on 2020-12-31.",
  },
];

async function main() {
  console.log("=== default Date.parse (regime.js's zero-dependency floor) ===");
  let defaultFailures = 0;
  for (const c of CASES) {
    const w = parseValidityWindow(c.text); // default parseDate = Date.parse
    const ok = !w.open;
    if (!ok) defaultFailures += 1;
    console.log(`  ${ok ? "PARSED" : "OPEN (failed to parse)"}  ${c.name}`);
    console.log(`    from=${w.from ? new Date(w.from).toISOString() : null}  until=${w.until ? new Date(w.until).toISOString() : null}`);
  }

  console.log("\n=== pyodide + dateutil, injected as parseDate ===");
  const { parseDate, shutdown } = await createDateNormalizer({ dayfirst: true }); // ordinance corpus convention, declared
  let pyodideFailures = 0;
  for (const c of CASES) {
    const w = parseValidityWindow(c.text, parseDate);
    const ok = !w.open;
    if (!ok) pyodideFailures += 1;
    console.log(`  ${ok ? "PARSED" : "OPEN (failed to parse)"}  ${c.name}`);
    console.log(`    from=${w.from ? new Date(w.from).toISOString() : null}  until=${w.until ? new Date(w.until).toISOString() : null}`);
  }
  shutdown();

  console.log("\n=== end-to-end: precedence() correctly excludes an expired obligation, dates parsed via pyodide ===");
  const { parseDate: pd2, shutdown: shutdown2 } = await createDateNormalizer({ dayfirst: true });
  const queryTime = Date.parse("2026-09-10"); // ISO, always fine natively — this is the QUERY time, not a corpus date
  const expiredMessy = {
    tag: tagClaim({}, {
      operator: "INS",
      validityText: "This ordinance is effective as of 01/01/2015 and shall terminate on 31/12/2020.",
      force: "O",
      queryTime,
      parseDate: pd2,
    }),
    grain: "Ground",
  };
  const liveDefault = { tag: tagClaim({}, { operator: "SYN", force: "default", queryTime }), grain: "Pattern" };
  const r = precedence(expiredMessy, liveDefault, { queryTime });
  const pass = r.winner === "b" && r.reason === "validity_window";
  console.log(`  ${pass ? "PASS" : "FAIL"}: expired day-first-dated obligation correctly excluded (winner=${r.winner}, reason=${r.reason})`);
  shutdown2();

  console.log("\n=== summary ===");
  console.log(`  default Date.parse: ${CASES.length - defaultFailures}/${CASES.length} parsed`);
  console.log(`  pyodide + dateutil: ${CASES.length - pyodideFailures}/${CASES.length} parsed`);
  console.log(`  end-to-end precedence with messy dates: ${pass ? "PASS" : "FAIL"}`);
  if (pyodideFailures > 0 || !pass) process.exit(1);
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
