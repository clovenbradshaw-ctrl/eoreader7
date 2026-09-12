// speaker-model.js — the instrument's durable theory of mind of the person.
// Vendored at the proxy's native/the-fold seam. PURE logic (extractClaim,
// durableFacts, updateSpeakerModel) with a thin file store (load/save), so
// the theory of mind survives across sessions while conversation SPECIFICS
// stay in the per-session history.
//
// THE SPLIT, deliberately:
//   durable (this file)  — the TYPES of things about how the person thinks:
//     what they have asserted and its standing, how often they push back,
//     how often they correct the instrument. Never a transcript.
//   per-session           — the specifics: what was said, the chat history,
//     the reading of this conversation. Never persisted cross-session.
//
// Every durable row is ATTRIBUTED (a hypothesis the instrument holds about
// the person, revisable) and phrased, when it reaches the mouth, at the
// object level — firewall-clean, covert-clean, no cast names, no apparatus
// nouns, and never another conversation's verbatim detail.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SPEAKER_MODEL_DIR = () => path.join(HERE, "speaker-models");
export const speakerModelPath = (userId) => path.join(SPEAKER_MODEL_DIR(), `${sanitizeId(userId)}.json`);

export function sanitizeId(userId) {
  return String(userId ?? "anon").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "anon";
}

export const EMPTY_MODEL = Object.freeze({
  schema: "SpeakerModel@1",
  claims: Object.freeze([]), // { phrase, standing, times, first, last }
  corrections: 0, // the person corrected the instrument
  pushbacks: 0, // the person pushed back / escalated
  assertions: 0, // assertions the person has made
  lastSeen: null,
});

// ── pure: extract the claim the person just asserted ─────────────────────
// A normalized, type-level phrase — the belief itself, never the
// conversation around it. Best effort: the assertion after "that" / "I'm
// sure / think / believe", or the bare sentence, lowercased, bounded.
export function extractClaim(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  let claim = t;
  const after = /\b(?:i'?m\s+(?:pretty\s+)?sure|i\s+(?:think|believe|know|maintain|assert))\b[:\s]+([^.!?]+)/i.exec(t)?.[1]
    ?? /\b(?:the\s+)?(?:thing|point|truth)\s+is\s+([^.!?]+)/i.exec(t)?.[1]
    ?? null;
  if (after) claim = after;
  const norm = claim
    .replace(/\s+/g, " ")
    .replace(/^(?:that|so)\s+/i, "")
    .trim()
    .replace(/[.!?]+$/, "")
    .toLowerCase();
  if (norm.length < 4 || norm.length > 140) return null;
  return norm;
}

// ── pure: the standing the instrument's record earned for the claim ──────
// "contested" — the surf came up empty or the reading found disagreement.
// "established" — surfaced material stated it. "unexamined" — nothing
// checked it yet. Never stronger than the record.
export function standingOfTurn({ surfVoid = false, surfaced = 0 } = {}) {
  if (surfVoid) return "contested";
  if (surfaced > 0) return "established";
  return "unexamined";
}

// ── pure: update the model with one turn's signals ───────────────────────
export function updateSpeakerModel(model, { task = "", classification = null, surfVoid = false, surfaced = 0 } = {}) {
  const m = model && model.schema === "SpeakerModel@1" ? model : { ...EMPTY_MODEL };
  const claim = extractClaim(task);
  const out = {
    ...m,
    claims: [...m.claims],
    corrections: m.corrections,
    pushbacks: m.pushbacks,
    assertions: m.assertions,
    lastSeen: new Date().toISOString(),
  };
  if (classification === "escalation") out.pushbacks += 1;
  if (classification === "assertion") {
    out.assertions += 1;
    if (claim) {
      const standing = standingOfTurn({ surfVoid, surfaced });
      const existing = out.claims.findIndex((c) => c.phrase === claim);
      const now = new Date().toISOString();
      if (existing >= 0) {
        out.claims[existing] = {
          ...out.claims[existing],
          times: out.claims[existing].times + 1,
          standing,
          last: now,
        };
      } else {
        out.claims.push({ phrase: claim, standing, times: 1, first: now, last: now });
      }
      out.claims = out.claims.slice(-24); // bounded — the durable model is type-level, not a transcript
    }
  }
  return out;
}

// ── pure: the durable facts, phrased for the mouth ───────────────────────
// Object-level, firewall-clean, covert-clean, and type-level: what the
// person holds and its standing, never another conversation's specifics.
const STANDING_PHRASE = Object.freeze({
  contested: "it has been contested — not settled",
  established: "it has been supported by what has come up",
  unexamined: "nothing has checked it yet",
});

export function durableFacts(model) {
  const m = model && model.schema === "SpeakerModel@1" ? model : EMPTY_MODEL;
  const facts = [];
  for (const c of m.claims ?? []) {
    facts.push(`you've said before that ${c.phrase} — ${STANDING_PHRASE[c.standing] ?? STANDING_PHRASE.unexamined}.`);
  }
  if (m.pushbacks > 1) facts.push("you've pushed back before when something didn't hold. If I'm wrong, say so.");
  if (m.corrections > 0) facts.push("you've corrected me before, and you were right to. I'll hold what you've given me.");
  return facts;
}

// ── thin store ───────────────────────────────────────────────────────────
export function loadSpeakerModel(userId) {
  try {
    const p = speakerModelPath(userId);
    if (!fs.existsSync(p)) return { ...EMPTY_MODEL, claims: [] };
    const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
    if (parsed?.schema !== "SpeakerModel@1") return { ...EMPTY_MODEL, claims: [] };
    return parsed;
  } catch {
    return { ...EMPTY_MODEL, claims: [] };
  }
}

export function saveSpeakerModel(userId, model) {
  try {
    fs.mkdirSync(SPEAKER_MODEL_DIR(), { recursive: true });
    fs.writeFileSync(speakerModelPath(userId), JSON.stringify(model, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}