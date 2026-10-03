// eval/eot-summary.mjs — THE MECHANICAL SUMMARY: fold the material at its own
// subject and hand back the fold's own discourse, no model — the-fold's
// resolutions.js applied to a register's EOT records.
import { lensBlock, paradigmBlock } from "../the-fold/resolutions.js";
import { dmdWindow } from "../kernel/activation.js";

/** Notes from the register's EOT records: each arc, with its address. */
export function notesFrom(store) {
  const notes = [];
  for (const [ref, entry] of store) {
    for (const rec of entry.records ?? []) {
      const byKey = new Map((rec.meaning?.nodes ?? []).map((n) => [n.key, n]));
      for (const arc of rec.meaning?.arcs ?? []) {
        const dep = byKey.get(arc.to);
        if (!dep) continue;
        const head = arc.from ? byKey.get(arc.from) : null;
        notes.push({ end1: head?.lemma ?? null, verb: arc.rel, end2: dep.lemma, witnesses: [ref], sources: 1 });
      }
    }
  }
  return notes;
}

export function subjectReferents(index, notes, k = 4) {
  const degree = new Map();
  for (const n of notes) for (const name of [n.end1, n.end2]) { if (!name) continue; for (const id of index?.resolve?.(String(name)) ?? []) degree.set(id, (degree.get(id) ?? 0) + 1); }
  return new Set([...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([id]) => id));
}

export function mechanicalSummary({ store, referents, question = "" }) {
  const index = referents?.index ?? referents;
  const notes = notesFrom(store);
  const active = subjectReferents(index, notes);
  if (!active.size) return { text: "", subject: [], lens: null, paradigm: null, basis: "the material's notes name no being" };
  const lens = lensBlock({ question, active, index, notes, dmdWindow });
  const paradigm = paradigmBlock({ active, index, notes, dmdWindow });
  const subject = [...active].map((id) => index?.represent?.(id) ?? id);
  const text = [lens.text, paradigm.text].filter(Boolean).join("\n\n");
  return { text, subject, lens, paradigm, basis: { lens: lens.basis, paradigm: paradigm.basis } };
}
