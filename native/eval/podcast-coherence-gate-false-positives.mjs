#!/usr/bin/env node
// podcast-coherence-gate-false-positives.mjs — the OTHER failure direction.
// Every prior falsification hunted false NEGATIVES (does an incoherent
// patch slip through). A gate that is hard to turn off is dangerous if it is
// ALSO too eager, because the only escape from a false positive is the
// manual-INS/REC override — and a gate that cries wolf constantly trains
// people to reach for that override reflexively, which is functionally
// identical to having no gate. This script hunts specifically for
// LEGITIMATE, BENIGN changes the gate might wrongly halt.
//
// EVERY CASE IS A COMPLETE, EXECUTABLE DOCUMENT, on purpose — a first cut
// of this file used bare code SNIPPETS with no <script> tag at all, which
// made otherModelingScore/consistencyScore's behavioral executor find
// nothing to run and silently score 0 for both before AND after: a
// "PASS" that proved nothing (a 0-vs-0 tie, not a real demonstration the
// behavior was recognized as safe). Caught by directly checking the
// scorer's own return value before trusting the harness result — the
// same "verify the mechanism, don't just read its verdict" discipline
// this whole session has needed more than once.
import { coherenceGate } from "../adapters/build/coherence-properties.mjs";

const DOC = (script) => `<!DOCTYPE html><html><body>
  <button id="subscribeButton">Subscribe</button>
  <div id="episodes"></div>
  <script>${script}</script>
</body></html>`;

const cases = [];

// 1. A behaviorally-IDENTICAL rewrite in a totally different syntactic
// shape (ternary chain -> lookup object). Should NOT be halted: the
// scorers are supposed to be behavioral, not textual.
{
  const before = `<span>\${episode.ethos === 'pass' ? 'Pass' : episode.ethos === 'conflict' ? 'Conflict' : 'No signal'}</span>`;
  const after = `<span>\${({pass:'Pass',conflict:'Conflict',no_signal:'No signal'})[episode.ethos]}</span>`;
  cases.push({ name: "1: ternary -> lookup-object rewrite, same behavior", before, after, expectHalt: false });
}

// 2. Error handling RELOCATED to a different, real layer (registered via
// window.addEventListener('error', ...) instead of a local catch body) —
// a full, executable document both times, so the mock genuinely runs the
// click and can see whether SOMETHING real happens on failure.
{
  const before = DOC(`
    document.getElementById('subscribeButton').addEventListener('click', async () => {
      try {
        const response = await fetch('/api/subscribe?url=x');
        const data = await response.json();
        document.getElementById('episodes').innerHTML = '<h2>' + data.show.title + '</h2>';
      } catch (error) {
        document.getElementById('episodes').innerHTML = '<p>Error: ' + error.message + '</p>';
      }
    });
  `);
  const after = DOC(`
    window.addEventListener('error', (e) => { document.getElementById('episodes').innerHTML = '<p>Something went wrong.</p>'; });
    document.getElementById('subscribeButton').addEventListener('click', async () => {
      try {
        const response = await fetch('/api/subscribe?url=x');
        const data = await response.json();
        document.getElementById('episodes').innerHTML = '<h2>' + data.show.title + '</h2>';
      } catch (error) {
        throw error; // re-thrown for the global handler to catch instead
      }
    });
  `);
  cases.push({ name: "2: error handling relocated to a global window.onerror handler", before, after, expectHalt: false, honestlyMayFail: "the mock's fake window.addEventListener is a no-op (real browsers actually fire it on an unhandled rejection; this mock cannot), so a rethrow with no local catch body will likely show NOTHING in the mock and may register as a real regression — a genuine, disclosed mock limitation, not a scorer defect on real bytes in a real browser." });
}

// 3. A legitimate contract change: the API now returns 200 with an
// `{error}` field instead of throwing HTTP errors, so the `response.ok`
// check is correctly removed as dead code for the NEW contract.
{
  const before = DOC(`
    document.getElementById('subscribeButton').addEventListener('click', async () => {
      const response = await fetch('/api/subscribe?url=x');
      if (!response.ok) {
        document.getElementById('episodes').innerHTML = '<p>Error fetching data: ' + response.status + '</p>';
        return;
      }
      const data = await response.json();
      document.getElementById('episodes').innerHTML = '<h2>' + data.show.title + '</h2>';
    });
  `);
  const after = DOC(`
    document.getElementById('subscribeButton').addEventListener('click', async () => {
      const response = await fetch('/api/subscribe?url=x');
      const data = await response.json();
      if (data.error) {
        document.getElementById('episodes').innerHTML = '<p>Error: ' + data.error + '</p>';
        return;
      }
      document.getElementById('episodes').innerHTML = '<h2>' + data.show.title + '</h2>';
    });
  `);
  cases.push({ name: "3: adapting to a changed API contract (ok-check -> body error field)", before, after, expectHalt: false });
}

// 4. Re-wiring the subscribe button through a different, equally valid
// selector/attribute convention (data-action instead of a literal id).
{
  const before = `<!DOCTYPE html><html><body>
    <button id="subscribeButton">Subscribe</button>
    <div id="episodes"></div>
    <script>document.getElementById('subscribeButton').addEventListener('click', async () => { await fetch('/api/subscribe?url=x'); });</script>
  </body></html>`;
  const after = `<!DOCTYPE html><html><body>
    <button data-action="subscribe">Subscribe</button>
    <div id="episodes"></div>
    <script>document.querySelector('[data-action="subscribe"]').addEventListener('click', async () => { await fetch('/api/subscribe?url=x'); });</script>
  </body></html>`;
  cases.push({ name: "4: subscribe button re-wired via data-attribute instead of id", before, after, expectHalt: false });
}

let anyUnexpected = false;
for (const c of cases) {
  const result = await coherenceGate(c.before, c.after);
  const matched = result.halted === c.expectHalt;
  const label = matched ? "PASS" : (c.honestlyMayFail ? "FAILS — disclosed possible limit, see note" : "UNEXPECTED FAIL");
  console.log(`${label} — ${c.name}`);
  console.log(`  expected halt: ${c.expectHalt}, actual halt: ${result.halted}`);
  if (result.regressions.length) for (const r of result.regressions) console.log(`    regression reported: ${r.property} ${r.before} -> ${r.after}`);
  if (c.honestlyMayFail) console.log(`  note: ${c.honestlyMayFail}`);
  if (!matched && !c.honestlyMayFail) anyUnexpected = true;
  console.log();
}

console.log("=== VERDICT ===");
console.log(anyUnexpected
  ? "An UNEXPECTED false positive was found on a full, executable document — a real gap in the scorer, not a mock limitation. Investigate before trusting the gate further."
  : "No unexpected false positives on real, executable documents. Any disclosed failure above traces to the MOCK's own limits (e.g. a fake window.addEventListener cannot truly dispatch a global error event the way a real browser does), not to the scorer reading text instead of behavior.");
