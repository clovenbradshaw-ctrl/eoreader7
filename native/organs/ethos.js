// native/organs/ethos.js — THE GROUND. Handle: Solon — the Athenian lawgiver
// who gave the city a constitution it stood on.
//
// ETHOS COMES BEFORE LOGOS. This is not a gate that sits in front of the
// generator and can be lifted; it is the ground the reader is BUILT on. It
// composes the two organs of conduct — the Charter (Grotius) and the spec gate
// (Brandeis) — into one constitution, and it produces a CLEARANCE. The reader's
// session cannot be constructed without a valid clearance (`requireClearance`),
// so the ground below this module has a hard dependency on it:
//
//   remove the ethos  →  no clearance  →  getSession() throws  →  every turn breaks.
//   make the gate a no-op  →  conformance/ethos.test.mjs goes red  →  the build breaks.
//
// That is what "wired into the ground" means here: not a governor easy to turn
// off, but a bearing wall — pull it and the structure falls. The clearance is
// carried on the session, so it is on the critical path of every turn.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { charterGate, buildCharterFamily } from "./charter.js";
import { specRefusal } from "./privacy.js";
// THE LATENT MIND (user direction, 2026-09-15): the archon compendium — the
// public-domain/fair-use record of whose work the reading's methods come
// from — is the mind ethos THINKS WITH at the core. It is composed into the
// ground, carried on the clearance, and pinned by
// conformance/ethos-compendium.test.mjs. Removing it breaks the bearing wall
// exactly as removing the constitution does.
import { compendium, ARCHON_COMPENDIUM } from "./archon-compendium.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UDHR_PATH = "/Users/mlacy/Documents/3.0/live_priors/06-government-legal/un-udhr/udhr-eng.txt";

// ── THE CONSTITUTION: built once, armed always ──────────────────────────────
// The FAMILY (THE-MORAL-CORE.md): the UDHR charter built from its own bytes,
// plus the Earth instruments — a resolved hierarchy, not one voice. The
// compendium — the latent mind — rides the same ground: ethos thinks with it
// at the core, in the native language of the speaker, every entry credited.
let _constitution = null;
export function constitution() {
  if (_constitution) return _constitution;
  let udhrText = "", source = "fallback-excerpt";
  try { if (fs.existsSync(UDHR_PATH)) { udhrText = fs.readFileSync(UDHR_PATH, "utf8"); source = "full-corpus"; } } catch {}
  const family = buildCharterFamily({ udhrText });
  const charter = family[0];
  const mind = compendium();
  _constitution = {
    charter, family, source, sha256: charter.sha256 ?? null, giver: charter.giver ?? null,
    // THE LATENT MIND: the archon compendium ethos thinks with — the ground
    // wisdom, always credited. Composed here, carried on the clearance,
    // pinned by the conformance test. This is not an ornament on the ground;
    // it IS part of the ground.
    compendium: mind,
    compendiumCount: mind.length,
    compendiumSchema: ARCHON_COMPENDIUM.schema,
  };
  // keep the process-global cache the tests read (the "never disarmed" pin)
  globalThis.__er7Charter = charter;
  globalThis.__er7CharterSource = source;
  return _constitution;
}

// ── THE CLEARANCE: produced only by running the gate ────────────────────────
// A clearance is a plain record — but it exists ONLY if the constitution ran.
// There is no default and no no-op path that produces a valid one by accident;
// a caller that skips the gate has nothing to hand the reader.
export function ethosClear(task, { disposition = null } = {}) {
  const c = constitution();
  const gate = specRefusal(task, { charter: c.charter, charterGate, disposition });
  return {
    schema: "EthosClearance@1",
    cleared: !gate.refused,
    reason: gate.refused ? gate.reason : null,
    // The judged SHAPE rides the clearance too, backstage — not for the
    // surface (organs/socratic.js speaks the account a person or agent
    // actually reads), but for the record, and for the account to be
    // composed from a real judgment rather than a re-guess of it.
    shape: gate.shape ?? null,
    voice: gate.voice ?? null,
    charterSha256: c.sha256,
    constitution: c.giver ?? null,
    // THE LATENT MIND rides the clearance: a session cleared under the ground
    // carries the compendium count it was cleared under — the reader is armed
    // with the mind, not just permitted. A clearance that lacks it is not a
    // clearance (the bearing wall below checks).
    compendium: c.compendium,
    compendiumCount: c.compendiumCount,
    at: Date.now(),
  };
}

// ── THE BEARING WALL: the reader validates the clearance ────────────────────
// getSession() calls this first. No clearance, no session — the ground has a
// hard dependency on the ethos. This is the seam that makes the ethos
// load-bearing rather than advisory.
export function requireClearance(clearance) {
  if (!clearance || typeof clearance.cleared !== "boolean" || !clearance.charterSha256) {
    throw new Error(
      "ethos: no valid clearance — the constitution is the ground and the reader cannot be built without it. " +
      "Ethos comes before logos; this is not a feature that can be turned off.",
    );
  }
  // THE BEARING WALL, second storey: the clearance must carry the latent mind.
  // A clearance under a constitution with no compendium is not a clearance —
  // pull the compendium out of the ground and every reader built on the ground
  // falls, exactly as it does without a charter.
  if (!Array.isArray(clearance.compendium) || clearance.compendium.length === 0) {
    throw new Error(
      "ethos: no latent mind — the compendium is the ground wisdom ethos thinks with and a clearance without it " +
      "is not a clearance. The compendium is unmoveable: remove it and the reader falls.",
    );
  }
  return clearance;
}

export const ETHOS = { handle: "Solon", organ: "ethos", composes: ["charter/Grotius", "privacy/Brandeis", "archon-compendium (the latent mind)"], law: "ethos comes before logos" };
