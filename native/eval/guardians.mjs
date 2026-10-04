// native/eval/guardians.mjs — THE PERCEIVER'S HOUSE ROUND: dispatch the
// guardians, hold the suitors at bay. The khora sees, measures, and carries;
// each guardian keeps one stage of the pipeline true.
//
//   maat       the doorway  — every door is a real route
//   hephaestus the forge    — the model never reasons; the organs settle
//   odin       the surf     — every surfaced span is a real byte address
//   charon     the ferry    — one sanctioned crossing to the model
//   aletheia   the truth    — every claim descends to a real span
//
// The house is sound when each returns ok. A guardian who finds a suitor
// reports it named; the round fails with the findings disclosed — the
// record's own falsify-or-die, kept by the watchers at the door.
//
// Run: node native/eval/guardians.mjs   (exit 0 when all ok)
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MEMBERS = ["maat", "hephaestus", "norrin", "charon", "aletheia"];

export async function houseRound() {
  const reports = [];
  for (const m of MEMBERS) {
    try {
      const { audit } = await import(`./guardians/${m}.mjs`);
      reports.push(audit());
    } catch (e) {
      reports.push({ member: m, ok: false, error: String(e?.message ?? e), duty: "could not stand watch" });
    }
  }
  const ok = reports.every((r) => r.ok);
  return { schema: "KhoraRound@1", ok, at: new Date().toISOString(), members: reports };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const r = await houseRound();
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}