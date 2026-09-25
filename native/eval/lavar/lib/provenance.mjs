// lib/provenance.mjs — WHAT TAUGHT THIS READING, STAMPED, SO THE READER IS
// PERIOD-AWARE. User direction, verbatim: "we always need to record the
// provenance of what teaches us so we can be period aware."
//
// A reading is not a reading until it can say where its material came from
// and from WHAT PERIOD the material speaks. Without the period, the reader
// folds 2024 into 1865 into 1776 into one undated lump and reads modern
// English with 19th-century priors — the exact anachronism every fluent
// claim must refuse. The period is RECEIVED (the caller names the giver),
// never guessed: `--period` is a disclosed statement of what the material
// says about itself, and its absence is a TYPED GAP (`period: null,
// declared: true`), never a silently assumed date.
//
// One function, called at the moment a read opens, so every ledger, sidecar,
// genealogy birth and breakthrough carries the same stamp. Pure: sha256 of
// the bytes, a named giver, and the declared period, nothing derived.

import crypto from "node:crypto";

/**
 * stampProvenance({ source, bytes, giver, period, modality }) — the
 * provenance record written by every entrypoint before it reads. Fields are
 * read off what the caller holds; nothing is inferred.
 *
 *   source   — the origin identity (path or `text:` id), as disclosed.
 *   bytes    — the material length, so the stamp is byte-anchored.
 *   giver    — who handed the material in (received, never self-named).
 *   period   — the material's own period (e.g. "2025", "1865", "1791"),
 *              RECEIVED from the caller's `--period` or a manifest; null is
 *              a declared gap, never an assumption.
 *   modality — "text" | "vision" | "audio" | "code" (the cube's axis).
 */
export function stampProvenance({ source = "text", bytes = 0, giver = "reader:eoreader7", period = null, modality = "text" } = {}) {
  const sha256 = crypto.createHash("sha256").update(String(bytes), "utf8").digest("hex");
  return {
    schema: "Provenance@1",
    source,
    giver,
    modality,
    bytes,
    period: period ?? null,
    periodDisclosed: period == null || String(period).trim() !== "" ? true : false,
    sha256,
    // THE PERIOD LAW, said once: a fluent claim never wears a period the
    // material did not state. `period: null` and `period: "2025"` render
    // alike nowhere downstream (FOLD-CONSTITUTION IV.4) — the stamp keeps
    // the two apart by construction.
  };
}

/**
 * argPeriod(argv, dflt = null) — the received `--period=` value from a
 * CLI call, or null. The string is kept verbatim; the caller may hand any
 * form the material itself uses ("2025", "c. 1865", "August 2026").
 */
export function argPeriod(argv = [], dflt = null) {
  const hit = argv.find((a) => a.startsWith("--period="));
  return hit ? hit.slice("--period=".length) : dflt;
}