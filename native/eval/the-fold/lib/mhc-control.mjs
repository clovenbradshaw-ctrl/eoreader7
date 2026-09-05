// lib/mhc-control.mjs — which material controls for which, in the MHC
// battery, as ONE rule the driver runs and a test reads.
//
// The battery's control is "another material from the same run" (S64:
// `built.find((b) => b.key !== materials[i].key)`). Invoked with ONE
// material there is no other, `control` was null, every arm that needs one
// reported its typed gap, and the stage read "none readable" — a statement
// about the invocation dressed as one about the material (P41; the-fold
// NEXT-PASSES Pass 13, "also carried"). The rule now refuses up front.

/**
 * @param {string[]} keys — the materials chosen for this run, in order
 * @returns {{ ok: true, controlFor: (i:number) => string } |
 *           { ok: false, gap: { type: "control_absent", chosen: string[], detail: string } }}
 */
export function controlRule(keys) {
  // Distinct keys: `war-and-peace war-and-peace` names one material twice,
  // and a control that is the same content is no control (chorus, Diaconis).
  if (!Array.isArray(keys) || new Set(keys).size < 2) {
    return {
      ok: false,
      gap: {
        type: "control_absent",
        chosen: Array.isArray(keys) ? [...keys] : [],
        detail:
          `the battery's control is another material from the same run; ${new Set(keys ?? []).size} distinct chosen, so no arm that needs ` +
          `a control can be measured. Name at least two materials. (A one-material run used to read "none readable" — ` +
          `that was the invocation, not the material.)`,
      },
    };
  }
  return { ok: true, controlFor: (i) => keys.find((k, j) => j !== i && k !== keys[i]) ?? keys.find((k) => k !== keys[i]) };
}
