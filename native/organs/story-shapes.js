// organs/story-shapes.js — the writer's arc, all 27 EO story shapes.
//
// Vonnegut's eight shapes are the READER's fortune curves; EO's cube is
// richer. This organ enumerates the complete taxonomy DERIVED from the
// kernel's cube algebra (native/kernel/cube.js) — 3 domains (Existence /
// Structure / Interpretation) x 3 modes (Differentiate / Relate / Generate)
// x 3 grains (Ground / Figure / Pattern) = 27 cells, each a named arc:
//
//   NUL·Ground  The Clearing    SEG·Ground  The Extent    DEF·Ground  The Frame
//   NUL·Figure  The One         SEG·Figure  The Cut       DEF·Figure  The Thesis
//   NUL·Pattern The Kind        SEG·Pattern The Seams     DEF·Pattern The Frames
//   SIG·Ground  The Absence     CON·Ground  The Field     EVA·Ground  The Owed
//   SIG·Figure  The Named       CON·Figure  The Binding   EVA·Figure  The Test
//   SIG·Pattern The Recurrence  CON·Pattern The Cycle     EVA·Pattern The Standing
//   INS·Ground  The Baseline    SYN·Ground  The Ground    REC·Ground  The Rezero
//   INS·Figure  The Portrait    SYN·Figure  The Witness   REC·Figure  The Retraction
//   INS·Pattern The Account     SYN·Pattern The Chain     REC·Pattern The Revision
//
// classifyArc maps a MEASURED arc (organs/vonnegut.js) into the EO spine
// cell + the cells it visited, and names the classic Vonnegut read.
import { cellOf, OPERATOR_CHAIN, GRAINS } from "../kernel/cube.js";

// The 27 named arcs, one per (op, grain) cell in the cube.
const ARC_NAMES = Object.freeze({
  "NUL:Ground": "The Clearing",
  "NUL:Figure": "The One",
  "NUL:Pattern": "The Kind",
  "SIG:Ground": "The Absence",
  "SIG:Figure": "The Named",
  "SIG:Pattern": "The Recurrence",
  "INS:Ground": "The Baseline",
  "INS:Figure": "The Portrait",
  "INS:Pattern": "The Account",
  "SEG:Ground": "The Extent",
  "SEG:Figure": "The Cut",
  "SEG:Pattern": "The Seams",
  "CON:Ground": "The Field",
  "CON:Figure": "The Binding",
  "CON:Pattern": "The Cycle",
  "SYN:Ground": "The Ground",
  "SYN:Figure": "The Witness",
  "SYN:Pattern": "The Chain",
  "DEF:Ground": "The Frame",
  "DEF:Figure": "The Thesis",
  "DEF:Pattern": "The Frames",
  "EVA:Ground": "The Owed",
  "EVA:Figure": "The Test",
  "EVA:Pattern": "The Standing",
  "REC:Ground": "The Rezero",
  "REC:Figure": "The Retraction",
  "REC:Pattern": "The Revision",
});

export const STORY_TAXONOMY = Object.freeze(
  OPERATOR_CHAIN.flatMap((op) =>
    GRAINS.map((grain) => {
      const c = cellOf(op, grain);
      return { ...c, name: ARC_NAMES[`${op}:${grain}`] ?? `${op}·${grain}` };
    })
  )
);

export const storyArcName = (op, grain) => ARC_NAMES[`${op}:${grain}`] ?? `${op}·${grain}`;

// The classic Vonnegut read → the EO spine cell. The spine is the cell the
// arc's TURN lives in — the writer's signature move:
//   man-in-hole     the thesis surprises, the body climbs  → The Thesis
//   rags-to-riches  steady creation of the one             → The Portrait
//   from-bad-to-worse  the descending cut                  → The Cut
//   flatline        argues nothing, records no move        → The Clearing
const SPINE_BY_ARC = Object.freeze({
  "man-in-hole": { op: "DEF", grain: "Figure" },
  "rags-to-riches": { op: "INS", grain: "Figure" },
  "from-bad-to-worse": { op: "SEG", grain: "Figure" },
  flatline: { op: "NUL", grain: "Ground" },
});

const VISITED_BY_ARC = Object.freeze({
  "man-in-hole": [["NUL", "Ground"], ["SIG", "Ground"], ["DEF", "Figure"], ["SYN", "Figure"], ["REC", "Pattern"]],
  "rags-to-riches": [["NUL", "Figure"], ["INS", "Figure"], ["INS", "Pattern"]],
  "from-bad-to-worse": [["SYN", "Ground"], ["SEG", "Figure"], ["SEG", "Pattern"]],
  flatline: [["NUL", "Ground"]],
});

// classifyArc: the MEASURED fortune arc (vonnegut.js) → the reader-facing
// story read: the Vonnegut shape, the EO spine cell (named), and the cells
// the arc visited. Never a judgment — a reading, at the story grain.
export function classifyArc(shape = {}) {
  const arc = shape?.arc ?? "flatline";
  const spine = SPINE_BY_ARC[arc] ?? SPINE_BY_ARC.flatline;
  const spineCell = cellOf(spine.op, spine.grain);
  const visited = (VISITED_BY_ARC[arc] ?? VISITED_BY_ARC.flatline).map(([op, grain]) => cellOf(op, grain));
  return {
    schema: "EOStoryArc@1",
    vonnegut: arc,
    spine: storyArcName(spine.op, spine.grain),
    spineCell,
    visited: visited.map((c) => c.name ?? storyArcName(c.op, c.grain)),
    visitedCells: visited,
    fortune: shape?.fortune ?? [],
    slope: shape?.slope ?? null,
    basis: arc === "flatline"
      ? "the piece argues nothing — its reader's conviction never moves"
      : arc === "man-in-hole"
        ? "the thesis surprises, the body climbs — the reader is in a hole and the piece carries them out"
        : arc === "rags-to-riches"
          ? "steady creation — the reader's conviction rises from near nothing"
          : "from-bad-to-worse — the reader's conviction falls as the piece goes on",
  };
}