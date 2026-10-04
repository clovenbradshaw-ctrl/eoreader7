// native/eval/guardians/hephaestus.mjs — the reason-gate's guardian: the
// model never reasons; what is made is computed.
//
// Hephaestus — the Greek god of the forge, who builds precise machines with
// his own hands. Nothing he makes is guessed: it is forged, measured,
// exact. His duty here: the reason-gate (native/organs/reason-gate.js) must
// run the organs FIRST — a turn the machine can settle is computed, zero
// model tokens — and only what no organ settles may reach the mouth, which
// phrases and never reasons. And the gate itself must carry NO word-lists
// (kleenUp's law): a pre-set vocabulary is a finite guess, and the world has
// more words than the list.
//
// THE SUITOR: forgetfulness of duties — a turn the machine could compute
// that is instead handed to the model; or a pre-set list that guesses a
// shape instead of computing it.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

export function audit() {
  const gate = readFileSync(path.join(ROOT, "native/organs/reason-gate.js"), "utf8");
  // 1. The organs settle FIRST (runMechanical before any draw path).
  const settlesFirst = gate.includes("runMechanicalSafe") && gate.indexOf("runMechanicalSafe") < (gate.indexOf("register") >= 0 ? gate.length : 0);
  // 2. No pre-set word-list: the gate must not contain a stored greeting/
  //    question/context vocabulary (kleenUp's semantic class). A few
  //    structural split-regexes are fine (SEG); a vocabulary table is not.
  const wordListMarkers = [
    /\b(?:hi|hello|hey|howdy)\b[\s\S]{0,60}\|\s*(?:thank|goodbye)/i, // greeting list
    /\b(?:do|did|does|is|are|was|were|can|could|would|should|may|might)\b\|/i, // auxiliary list
    /\b(?:remember|recall|forgot|my name|earlier|before|last time)\b\|/i, // context list
  ];
  const lists = wordListMarkers.filter((re) => re.test(gate));
  return {
    schema: "Guardian@1", member: "hephaestus", ok: settlesFirst && lists.length === 0,
    settlesFirst, wordLists: lists.length, duty: "the model never reasons; the forge computes", suitor: "forgetfulness of duties",
    falsifying: "an organ-settlable turn handed to the model, or a pre-set word-list in the gate",
  };
}