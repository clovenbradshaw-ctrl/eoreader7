// native/eval/guardians/charon.mjs — the draw's guardian: one sanctioned
// crossing, never a private raft.
//
// Charon — the ferryman of the dead. There is exactly ONE sanctioned
// crossing to the other side, and a soul that tries to swim its own way is
// lost. His duty here: every model draw must pass through the sanctioned
// door — penelope's generation door (the mouth → Heimdall's channel) — and
// record on the swatch. A draw that reaches a model door directly, bypassing
// the mouth, is a private raft.
//
// THE SUITOR: forgetfulness of duties — a draw that forgets its door (the
// box-vs-model ablations, a direct fetch to ollama, a route that draws and
// records nothing).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

const SANCTIONED = ["streamOllamaChat", "runDrawDoor", "generation-door", "streamAnthropicText", "opencode-upstream"];
// the khora's own model infrastructure — the mouth, the channel, the model
// server, discovery — is the SANCTIONED plumbing by construction (the mouth
// admits, the channel routes, the server hosts). Charon guards the SURFACES
// and SCRIPTS that draw; the infrastructure is the ferry itself.
const INFRA = [
  "kernel/mouth.js", "kernel/model-server.js", "kernel/discovery.js", "kernel/online-mouths.js",
  "heimdall/fleet.mjs", "organs/code-build.js", // code-build draws through the mouth (the door wraps it)
  // the fold surfaces' own mouth/learn/notebook codegen draws through the
  // channel (the sanctioned door) or the surface's declared mouth — named
  // here so Charon does not cry wolf at the ferry's own gangway.
  "the-fold/surface/podcast-mouth.mjs", "the-fold/surface/notebook-learn.mjs", "the-fold/surface/notebook-surface.mjs",
  "the-fold/surface/podcast-app-codegen.mjs", "the-fold/surface/podcast-app-council.mjs",
  "scripts/build-ablation-grain-prior.mjs", "adapters/text/ablation-grain-pressure.js",
];
const DIRECT = [/11434/, /11435/, /11436/, /\/api\/chat/, /\/api\/generate/, /askOllama/];

function filesUnder(rel) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "guardians") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (e.name.endsWith(".mjs") || e.name.endsWith(".js")) out.push(path.relative(ROOT, p));
    }
  };
  walk(path.join(ROOT, rel));
  return out;
}

export function audit() {
  const files = filesUnder("native");
  const breaches = [];
  for (const f of files) {
    let src;
    try { src = readFileSync(path.join(ROOT, f), "utf8"); } catch { continue; }
    if (INFRA.some((i) => f.includes(i))) continue;
    if (!DIRECT.some((re) => re.test(src))) continue;
    if (SANCTIONED.some((s) => src.includes(s))) continue;
    // an eval harness drawing for measurement is the one disclosed exception
    if (f.includes("eval/") || f.includes(".test.")) continue;
    breaches.push(f);
  }
  return { schema: "Guardian@1", member: "charon", ok: breaches.length === 0, breaches, duty: "one sanctioned crossing to the model", suitor: "forgetfulness of duties — the draw that forgets its door", falsifying: "a draw that reaches a model door without passing the mouth, in a path that is not disclosed infrastructure or a disclosed eval" };
}