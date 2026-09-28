// reader-bundle.test.mjs — the engine's OWN relation-reader bundle
// (native/the-fold/reader-bundle.js), which this repo's own
// ORGAN-CONSOLIDATION-2026-09.md #7 found was missing `objectSpecificity:
// true` — the-fold's app.js has carried it since P36/P100 (the "wall 6"
// false-binding fix: hypergraph.js's own disclosed fallback below
// CORPUS_MINIMUM binds a claim to an edge sharing just ONE object token,
// e.g. "the Royal Society in 1887" binding to "the Northgate Observatory
// in 1887" on the shared token "in 1887" alone — and any live turn's
// retrieved passages are always sub-floor, so this reader hits that
// fallback on every real turn). This is the first dedicated test file for
// reader-bundle.js; none existed before this entry.
//
// DISCLOSED LIMIT: this pins the WIRING (the option genuinely reaches
// makeRelationReader), not a full end-to-end reproduction of the wall-6
// specimen through this bundle's own "dispatch"/GFP extraction mode —
// attempted directly (a real two-sentence and a real four-sentence
// northgate-shaped corpus, matching product-assay.mjs's own fixture),
// but GFP dispatch's own vocabulary-discovery floor did not clear inside
// this pass's time budget, for reasons unrelated to objectSpecificity
// itself (confirmed by removing the try/catch around extractRelations()
// in hypergraph.js and finding it throws nothing — the candidate
// vocabulary itself came back empty). hypergraph.js's own mechanism
// (lines ~2076-2093) was read in full and is a strict narrowing filter —
// it can only ever move a verdict FROM `bound` TO `unbound`, never the
// reverse — which is what makes wiring-level verification a sound,
// if lighter, guard here.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { makeEngineRelationReader, engineRelationsFor, chunkSource } from "./reader-bundle.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));

test("reader-bundle.js's own source wires objectSpecificity: true into the options it builds", () => {
  // ESM named-export bindings are read-only (monkey-patching
  // hypergraph.js's own makeRelationReader from outside throws
  // ERR_INVALID_ARG_TYPE / a read-only-property TypeError), so this reads
  // reader-bundle.js's own source rather than intercepting the call —
  // the same posture the second test below already takes against
  // hypergraph.js's own source.
  const src = fs.readFileSync(`${HERE}reader-bundle.js`, "utf8");
  assert.match(src, /objectSpecificity:\s*true/, "the P36/P100 fix, matching the-fold's own app.js:1083 — must not silently regress to the shared organ's own `false` default");
});

test("makeEngineRelationReader()/engineRelationsFor() build and run without throwing, against real material — the wiring is exercised, not merely declared", () => {
  // A live behavioral reproduction of the wall-6 specimen through this
  // bundle's own "dispatch"/GFP extraction mode was attempted (a real
  // northgate-shaped corpus, matching product-assay.mjs's fixture) and is
  // NOT included here: GFP dispatch's own vocabulary-discovery floor did
  // not clear inside this pass's time budget, for reasons unrelated to
  // objectSpecificity itself (confirmed live — removing the try/catch
  // around extractRelations() in hypergraph.js and re-running showed it
  // throws nothing; the candidate vocabulary itself came back empty).
  // What IS verified here: the bundle's actual production entry points
  // run end to end against real prose without throwing, so the option
  // above is reaching a reader that actually executes, not dead wiring.
  const material = "Amelia Hartley founded the Northgate Observatory in 1887. Amelia Hartley repaired the clocktower in 1889.";
  const reader = makeEngineRelationReader();
  const built = reader(chunkSource("material", material, {}));
  assert.ok(built && typeof built.read === "function");
  assert.doesNotThrow(() => built.read(material));
  assert.doesNotThrow(() => engineRelationsFor([material]));
});

test("makeRelationReader's own objectSpecificity option (organs/hypergraph.js) is a strict narrowing filter — reading its source, not asserting it", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../organs/hypergraph.js", import.meta.url), "utf8");
  // The two lines this fix depends on staying true: the option defaults
  // false (so an un-wired caller like reader-bundle.js used to be, before
  // this fix, silently got the WEAKER behavior), and it only ever
  // computes a NARROWER `specific` set from `agree`, never a wider one.
  assert.match(src, /objectSpecificity\s*=\s*false/, "objectSpecificity must still default false in the shared organ — if this ever flips, reader-bundle.js's own explicit `true` becomes a no-op worth re-examining, not silently redundant");
  assert.match(src, /objectSpecificity\s*\?\s*agree\.filter/, "objectSpecificity must still narrow `agree` down to `specific`, never widen it — the property this whole fix's safety argument rests on");
});
