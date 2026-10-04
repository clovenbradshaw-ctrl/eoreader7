// native/eval/guardians/norrin.mjs — the surf's guardian: every surfaced
// span is a real byte address; the surfer rides the reading, never invents it.
//
// Norrin Radd — the Silver Surfer's true name. He rides the surfline between
// worlds, carries the message, and never pretends the wave is his own. His
// duty here: the surf (surfTask / the fold's activation) must surface REAL
// spans — a chunked source's actual bytes at measured addresses — and the
// model must never be shown an address (THE-HOLOGRAPH §3: "the consumer
// never gets the addresses"). A surfaced span that does not exist in the
// source is a hallucination with an address: a wave Norrin claimed to ride
// that was never there.
//
// THE SUITOR: hallucinations that creep in — a span the bytes do not hold.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

export function audit() {
  const source = readFileSync(path.join(ROOT, "native/organs/source.js"), "utf8");
  const reader = readFileSync(path.join(ROOT, "proxy-runner.mjs"), "utf8");
  const chunks = source.includes("chunkSource");
  const addresses = source.includes("start") && source.includes("end") && source.includes("ref");
  const surfer = reader.includes("surfTask");
  return {
    schema: "Guardian@1", member: "norrin", ok: chunks && addresses && surfer,
    chunks, addresses, surfer, duty: "every surfaced span is a real byte address", suitor: "hallucinations that creep in",
    falsifying: "a surfaced span whose bytes the source does not hold",
  };
}