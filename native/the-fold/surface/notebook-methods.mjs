// notebook-methods.mjs — A METHODS PARAGRAPH WRITTEN FROM THE LEDGER, NEVER BY ANYONE.
//
// Fold invariant: EVERY NUMBER IN IT IS A FIELD OF A SEALED ENTRY. For each claim shown: the method (and who wrote it), the null its
// check was measured against, how many draws (n) and the seed, the same for its control, and the environment the check ran in
// (python / numpy / matplotlib versions and the helper library's content hash, recorded on the exec entry). Where a field is
// missing the paragraph says so in words — "the check did not state its null" — rather than leaving it out: a Methods section
// that omits what it does not know reads as if nothing were missing.
import { execsOf } from "./notebook.mjs";
import { statusOf } from "./bench.mjs";

const scopeWords = (s) => {
  if (!s || s.kind === "undeclared") return { nul: "not stated (the run declared no scope)", n: "not stated", seed: "not stated" };
  if (s.kind === "sample") return { nul: s.label ? s.label : "not stated (the run gave no label for its sample)", n: String(s.n), seed: String(s.seed) };
  if (s.kind === "range") return { nul: `none — exhaustive over every case from ${s.lo} to ${s.hi}${s.label ? ` (${s.label})` : ""}`, n: String(s.hi - s.lo + 1), seed: "none (exhaustive)" };
  return { nul: `none — the whole of one finite object (${s.label})`, n: "1 (the object itself)", seed: "none (exhaustive)" };
};
const envWords = (e) => (e ? (e.js ? "the fold's JavaScript vm" : `python ${e.python ?? "?"}, numpy ${e.numpy ?? "not installed"}, matplotlib ${e.matplotlib ?? "not installed"}, er7py library ${e.er7py ?? "?"}${e.isolated ? ", no network" : ", NOT network-isolated"}`) : "not recorded (the run predates environment recording)");

/** methodsOf(state, library) -> [{ claim, text, method, check, control, env }] — the structured rows; methodsText joins them. */
export function methodsOf(state, library = []) {
  const cells = state.nb.entries.filter((e) => e.kind === "cell");
  return cells.filter((c) => c.type === "claim").map((c) => {
    const chk = cells.find((x) => x.for === c.id && x.role === "check"), ctl = cells.find((x) => x.for === c.id && x.role === "control");
    const ec = chk && execsOf(state.nb, chk.id).at(-1), en = ctl && execsOf(state.nb, ctl.id).at(-1);
    const k = c.method ? library.find((x) => x.id === c.method.id) : null;
    return { claim: c.id, text: c.source, status: statusOf(state.bench, c.id), method: c.method ? { id: c.method.id, name: c.method.name, by: k?.lineage?.mouth ?? null, codeSha: c.method.codeSha ?? null } : null,
      check: ec ? { cell: chk.id, run: ec.n, hash: ec.hash, result: ec.result, ...scopeWords(ec.scope) } : null,
      control: en ? { cell: ctl.id, run: en.n, hash: en.hash, result: en.result, ...scopeWords(en.scope) } : null, env: ec?.env ?? null };
  });
}

export function methodsText(state, library = []) {
  const rows = methodsOf(state, library);
  if (!rows.length) return "No claims have been made in this conversation, so there is nothing to describe.";
  const envs = [...new Set(rows.map((r) => envWords(r.env)))];
  const per = rows.map((r) => {
    const who = r.method ? `the learned method “${r.method.name}” (${r.method.id}${r.method.by ? `, written by ${r.method.by}` : ""})` : "hand-written check and control cells";
    const chk = r.check ? `Its check (${r.check.cell}, run ${r.check.run}, seal ${r.check.hash.slice(0, 12)}) was measured against null: ${r.check.nul}; n = ${r.check.n}; seed = ${r.check.seed}; it returned ${r.check.result}.` : "Its check has not been run.";
    const ctl = r.control ? ` Its control (${r.control.cell}, run ${r.control.run}, seal ${r.control.hash.slice(0, 12)}) aims the same test at data where the claim is false by construction — null: ${r.control.nul}; n = ${r.control.n}; seed = ${r.control.seed}; it returned ${r.control.result}${r.control.result === false ? ", as a working control must" : " — a control that does not fail cannot support the claim"}.` : " It has no control run.";
    return `Claim ${r.claim} (${r.status}) — “${r.text}” — was tested by ${who}. ${chk}${ctl}`;
  });
  return `${per.join(" ")} Environment: ${envs.join("; ")}. Every value above is read from a sealed entry of this conversation's ledger; claims are single unadjusted tests and none is promoted by the tool.`;
}
