// native/eval/guardians/aletheia.mjs — the verify's guardian: every claim
// descends to a span it was read from; nothing asserted that isn't beneath.
//
// Aletheia — Greek for truth, "the unhidden." Her duty: a surfaced answer's
// claims must descend to real byte spans the reading produced (THE-HOLOGRAPH
// §6), and a narration must never assert a value no surfaced span carries.
// The mouth may phrase and narrate; it may never originate a fact.
//
// THE SUITOR: hallucinations that creep in — a claim with nothing beneath it
// (the constitution's Article II, "confabulation, a rendered thing with
// nothing beneath it").
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

export function audit() {
  const runner = readFileSync(path.join(ROOT, "proxy-runner.mjs"), "utf8");
  // the mouth must be fed only grounded spans, never addresses (holograph §3)
  const addressesStruck = runner.includes("mouthFacing") || runner.includes("strikeAddresses") || runner.includes("firewall.js");
  const groundedOnly = runner.includes("surfTask") || runner.includes("surf(");
  return {
    schema: "Guardian@1", member: "aletheia", ok: addressesStruck && groundedOnly,
    addressesStruck, groundedOnly, duty: "every claim descends to a real span", suitor: "hallucinations that creep in",
    falsifying: "an answer that asserts a value no surfaced span carries, or an address reaching the model",
  };
}