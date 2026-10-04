// native/eval/guardians/maat.mjs — the doorway's guardian: every door is a
// real route, and nothing falls to a model turn silently.
//
// Maat — Egyptian goddess of truth, justice, and cosmic order. Her feather
// weighs the heart at the threshold: a crossing is either measured and true,
// or it is refused. Her duty here: the khora's doorways (proxy.mjs /v1/*)
// must be real routes that do what they name — a build door builds, a read
// door reads model-free, a swarm door swarms — and a task that matches a
// mechanical shape must never silently fall through to a model turn.
//
// THE SUITOR: forgetfulness of duties — a door that routes to the wrong
// handler, or a mechanical task that slips past the machine to the mouth.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

export function audit() {
  const proxy = readFileSync(path.join(ROOT, "proxy.mjs"), "utf8");
  // every POST /v1/* route that names a handler must reach one (GET routes
  // like /v1/models and /v1/sessions are reads — rosters, not turns — and
  // are not Maat's concern; she guards the DOORWAYS that carry a task).
  const doors = [...proxy.matchAll(/req\.url === "(\/v1\/[a-z/]+)"/g)].map((m) => m[1]).filter((d) => !["/v1/models", "/v1/sessions", "/v1/search"].includes(d));
  const named = new Set();
  for (const d of doors) {
    // find the handler block after the route guard (widen for long handlers
    // like /v1/documents whose body runs past 4000 chars)
    const at = proxy.indexOf(`req.url === "${d}"`);
    const block = proxy.slice(at, at + 20000);
    const handlers = ["runProxyTurn", "buildCodeTask", "runSwarmTurn", "sessionReferents", "runDrawDoor", "runCodeLoop", "runMechanical", "buildCodeTask", "documents", "askDocument", "runDocument"];
    const reached = handlers.find((h) => block.includes(h));
    named.add(d);
    if (!reached) return { schema: "Guardian@1", member: "maat", ok: false, door: d, finding: `${d} names no handler in its block` };
  }
  return { schema: "Guardian@1", member: "maat", ok: true, doors: doors.length, duty: "every door is a real route", suitor: "forgetfulness of duties", falsifying: "a door that routes to the wrong handler or lets a mechanical task slip to the mouth" };
}