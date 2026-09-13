// organs/void-holarchy.js — the artifact as an OMNIMODAL HOLARCHY (S6).
//
// A void is not a flat checklist — it is a HOLARCHY. Every level of a built
// artifact is itself a VOID: a WHOLE (its own nine-operator DEF) and a PART
// (a filler covering an extent in the level above). The structure is
// medium-blind (S6): the text 'sentence' is the music 'bar' is the film
// 'shot' is the code 'statement'; only the adapters name the levels. A
// melody, a screenplay, and an essay DEF the same holarchy.
//
// The law of holons, for voids: low sets possibility for high, high
// probability for low — the smallest void bounds what the level above can
// assert. A level left under-specified is a VISIBLE GAP, never hidden.

// The nine canonical operators, in the chain's own order (cube.js) — the
// surface every level is DEF'd across.
import { OPERATOR_CHAIN } from "../kernel/cube.js";

// A level as a void: the caller's declared fields are mapped onto the nine
// operators. An operator with no declared field stays present as an honest
// gap — the void is under-specified, visibly, never silently complete.
function levelAsVoid(fields = {}) {
  const fieldOf = {
    NUL: { label: "the void itself", value: fields.slot ?? null },
    SIG: { label: "what must resolve", value: fields.anchor ?? null },
    INS: { label: "what kind of part fills it", value: fields.admits ?? null },
    SEG: { label: "extent", value: fields.extent ?? null },
    CON: { label: "what binds a part to the whole", value: fields.relation ?? null },
    SYN: { label: "how parts compose", value: fields.composition ?? null },
    DEF: { label: "cardinality", value: fields.cardinality ?? null },
    EVA: { label: "admission test", value: fields.admission ?? null },
    REC: { label: "reopens on", value: fields.reopensOn ?? null },
  };
  const operators = OPERATOR_CHAIN.map((op) => ({ op, ...fieldOf[op] ?? { label: null, value: null }, declared: (fieldOf[op]?.value ?? null) != null }));
  return { slot: fields.slot ?? null, operators };
}

// The whole→part holarchy: each level is a WHOLE (its own void) and — except
// the top — a PART (a filler covering an extent in the level above). The
// lowest level bounds what the level above can assert; the top level's
// declared shape spawns the part-voids.
export function voidHolarchy({ modality = "text", fieldsByLevel = {} } = {}) {
  const names = Object.keys(fieldsByLevel);
  const levels = names.map((name, i) => ({
    level: name,
    modality,
    whole: levelAsVoid(fieldsByLevel[name]),
    part: i === 0
      ? null
      : { covers: names[i - 1], extent: fieldsByLevel[name].extent ?? null },
    children: i === names.length - 1 ? [] : [names[i + 1]],
  }));
  return {
    schema: "EOVoidHolarchy@1",
    modality,
    law: "low sets possibility for high, high probability for low",
    levels,
    underSpecified: levels
      .map((l) => ({ level: l.level, gaps: l.whole.operators.filter((o) => !o.declared).map((o) => o.op) }))
      .filter((l) => l.gaps.length),
  };
}