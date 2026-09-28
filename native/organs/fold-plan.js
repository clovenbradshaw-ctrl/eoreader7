// organs/fold-plan.js — WHICH FOLD, FOR WHOM (2026-09-28). The capacity to
// decide how to fold a piece of material from what is being asked of it.
//
// The user's framing: the whole program is defining the perspective and the
// "for whom". Folding is not one act — an entity fold, a link fold, a kind
// fold and a lens fold answer different questions — so WHICH fold runs is a
// function of what the person wants out, never of what the text looks like.
// (The cube is not a content classifier: CLAUDE.md, measured 95.7% surviving
// a word shuffle. The wants are DECLARED by the asker; nothing here reads the
// material to guess them.)
//
// PURE. It reads the assembly registry's own contracts (kernel/assembly.js,
// assemblies.js): an assembly answers a want when the want is a terrain in its
// contract. It runs nothing, spends nothing, and loads no organ.
//
// THE WALLS (each a typed gap, never a default fold):
//   - an INTERPRETIVE want (Lens, Paradigm, Atmosphere) with no `forWhom` is
//     refused `no_for_whom`: meaning always has a for-whom, even if that whom
//     is the named empty hub. No view from nowhere.
//   - a want no registered assembly answers is `no_assembly_for` — an honest
//     hole in the map, not a nearest guess.
//   - a want answered only by an assembly whose measurement has not run is
//     planned, and carries `measured: false` with the assembly's own
//     stagesNotRun — the plan never claims more than the registry does.
//   - a consumed WITNESS artifact (same-read) pulls in an assembly that
//     produces it; if none does, `unmet_witness` — never silently skipped.
import { nativeRegistry } from "../assemblies.js";
import { registeredAssemblies } from "../kernel/assembly.js";

/** Terrains whose reading is a standpoint's: the for-whom is required. */
export const INTERPRETIVE = Object.freeze(["Lens", "Paradigm", "Atmosphere"]);

const isUnmeasured = (asm) => asm.stagesNotRun.some((s) => /measure|not run|no native run|unmeasured/i.test(s));

/**
 * planFold({ wants, forWhom, registry }) →
 *   { forWhom, steps: [{ assembly, layer, answers, measured, stagesNotRun }], gaps: [{ want, gap, why }] }
 * `wants` are terrain names the asker declares. `forWhom` is a named standpoint
 * (string) or null. Steps are dependency-first, then registry order.
 */
export function planFold({ wants = [], forWhom = null, registry = nativeRegistry() } = {}) {
  const all = registeredAssemblies(registry);
  const gaps = [];
  const chosen = new Map(); // id → { asm, answers:Set }
  const take = (asm, want) => {
    const row = chosen.get(asm.id) ?? { asm, answers: new Set() };
    if (want) row.answers.add(want);
    chosen.set(asm.id, row);
  };
  const who = typeof forWhom === "string" && forWhom.trim() ? forWhom.trim() : null;

  for (const want of [...new Set(wants)]) {
    if (INTERPRETIVE.includes(want) && !who) {
      gaps.push({ want, gap: "no_for_whom", why: `${want} is a standpoint's reading; name whom it is for (even the empty hub) — there is no view from nowhere` });
      continue;
    }
    // answered by what an assembly is FOR (declared), not by what its cells touch; the
    // baseline measuring stick is never planned as a reading
    const answering = all.filter((a) => a.layer !== "baseline" && (a.declaredTerrains ?? a.contract.terrains).includes(want));
    if (!answering.length) {
      gaps.push({ want, gap: "no_assembly_for", why: `no registered assembly answers ${want}` });
      continue;
    }
    for (const asm of answering) take(asm, want);
  }

  // same-read witness artifacts are only lawful from a producer in the plan
  for (let grew = true; grew; ) {
    grew = false;
    for (const { asm } of [...chosen.values()]) {
      for (const need of asm.consumes.filter((c) => c.as === "witness")) {
        if ([...chosen.values()].some((r) => r.asm.produces.includes(need.kind))) continue;
        const producer = all.find((a) => a.produces.includes(need.kind));
        if (producer) { take(producer, null); grew = true; }
        else gaps.push({ want: asm.id, gap: "unmet_witness", why: `${asm.id} consumes ${need.kind} as a witness and no registered assembly produces it` });
      }
    }
  }

  const producesFor = (asm) => asm.consumes.filter((c) => c.as === "witness").map((c) => c.kind);
  const rank = new Map(all.map((a, i) => [a.id, i]));
  const steps = [...chosen.values()]
    .sort((x, y) => {
      const xNeedsY = producesFor(x.asm).some((k) => y.asm.produces.includes(k));
      const yNeedsX = producesFor(y.asm).some((k) => x.asm.produces.includes(k));
      if (xNeedsY !== yNeedsX) return xNeedsY ? 1 : -1;
      return rank.get(x.asm.id) - rank.get(y.asm.id);
    })
    .map(({ asm, answers }) => ({
      assembly: asm.id,
      layer: asm.layer,
      answers: [...answers],
      measured: !isUnmeasured(asm),
      stagesNotRun: [...asm.stagesNotRun],
    }));
  return { forWhom: who, steps, gaps };
}
