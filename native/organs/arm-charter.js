// native/organs/arm-charter.js — arm charter.js's grammar adapter (GFP)
// from this repo's OWN committed priors, once, idempotently.
//
// charter.js's own header is explicit about why this matters: WITHOUT a
// configured GFP adapter, `charterGate` on a prescriptive clause reports
// `unknown-gfp-missing` and FAILS CLOSED rather than silently passing — a
// correct, honest design, but one that means a caller who never arms the
// adapter is not "getting a lenient check," it is getting every prescriptive
// sentence refused as ungovernable. `native/priors/role-config-eng.json` and
// `native/priors/pos-en.json` are ALREADY committed here (the same files
// `tests/charter.test.js` and the conformance suites read) — this file is
// only the one-line composition that every real caller otherwise has to
// repeat, kept in one place so it cannot drift between callers.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { configureGfp, isGfpConfigured } from "./charter.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));

let armed = false;
export function armCharter() {
  if (armed || isGfpConfigured()) { armed = true; return; }
  configureGfp({
    roleConfig: JSON.parse(fs.readFileSync(`${HERE}../priors/role-config-eng.json`, "utf8")),
    posPrior: JSON.parse(fs.readFileSync(`${HERE}../priors/pos-en.json`, "utf8")),
  });
  armed = true;
}
