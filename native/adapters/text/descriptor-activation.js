import { tokens, codeOf, recall, encodeFrame } from "../../memory/activation.js";
import { directDescriptorOccurrences } from "./individuation.js";

const DEFAULT_COMPLETION = 0.5;
const DEFAULT_TOP_EDGES = 6;
const DEFAULT_EDGE_SLOTS = 24;

const eligible = (occ) => occ?.determination === "definite" || occ?.determination === "possessive";
const pairKey = (a, b) => `${a}\u0000${b}`;

/**
 * Read descriptor identity through the same causal associative memory used by
 * pronoun resolution. Every frame recalls BEFORE it is encoded; future text
 * therefore cannot alter an earlier activation decision.
 *
 * This opens identity alternatives only from reciprocal reactivation. If B's
 * later frames reactivate A's prior frames, that is one directional vote. A/B
 * becomes an alternative only when the reverse direction is independently
 * witnessed later as well. No synonym list and no whole-document similarity.
 */
export function readDescriptorActivation(encounters = [], {
  completion = DEFAULT_COMPLETION,
  topEdges = DEFAULT_TOP_EDGES,
  edgeSlots = DEFAULT_EDGE_SLOTS,
  minLen,
  idfFloor,
} = {}) {
  const state = { df: new Map(), gramDf: new Map(), posting: new Map(), edges: new Map(), read: 0 };
  const descriptorsByFrame = new Map();
  const votes = new Map();
  const events = [];

  for (let order = 0; order < encounters.length; order += 1) {
    const encounter = encounters[order];
    const text = String(encounter?.material ?? encounter?.text ?? "");
    const ws = tokens(text);
    const { trace, cue } = codeOf(ws, state, { minLen, idfFloor });
    const activation = recall(cue, state, { completion, topEdges, selfOrder: order });
    const current = directDescriptorOccurrences(text, { encounterRef: `encounter:${order}` }).filter(eligible);
    const currentSurfaces = [...new Set(current.map((x) => x.canonicalSurface))];

    if (currentSurfaces.length && activation.size) {
      const priorScore = new Map();
      for (const [priorOrder, amount] of activation) {
        for (const priorSurface of descriptorsByFrame.get(priorOrder) ?? []) {
          const prior = priorScore.get(priorSurface);
          if (!prior || amount > prior.amount) priorScore.set(priorSurface, { amount, priorOrder });
        }
      }
      const ranked = [...priorScore.entries()].sort((a, b) => b[1].amount - a[1].amount);
      const top = ranked[0];
      if (top) {
        for (const surface of currentSurfaces) {
          if (surface === top[0]) continue;
          const key = pairKey(surface, top[0]);
          const record = votes.get(key) ?? { from: surface, to: top[0], count: 0, examples: [] };
          record.count += 1;
          if (record.examples.length < 5) record.examples.push({ order, priorOrder: top[1].priorOrder, activation: top[1].amount });
          votes.set(key, record);
          events.push(Object.freeze({ schema: "EODescriptorReactivation@1", from: surface, to: top[0], order, priorOrder: top[1].priorOrder, activation: top[1].amount }));
        }
      }
    }

    descriptorsByFrame.set(order, currentSurfaces);
    encodeFrame(state, order, ws, trace, { edgeSlots });
  }

  const alternatives = [];
  const seen = new Set();
  for (const vote of votes.values()) {
    const reverse = votes.get(pairKey(vote.to, vote.from));
    if (!reverse) continue;
    const sorted = [vote.from, vote.to].sort();
    const undirected = pairKey(sorted[0], sorted[1]);
    if (seen.has(undirected)) continue;
    seen.add(undirected);
    alternatives.push(Object.freeze({
      schema: "EOIdentityAlternative@1",
      id: `identity-alt:activation:${sorted[0].replace(/\W+/g, "_")}:${sorted[1].replace(/\W+/g, "_")}`,
      leftSurface: sorted[0],
      rightSurface: sorted[1],
      forwardVotes: vote.count,
      reverseVotes: reverse.count,
      evidence: Object.freeze([...vote.examples, ...reverse.examples]),
      standing: "unresolved",
      provenance: Object.freeze({
        giver: "text/descriptor-activation::readDescriptorActivation",
        basis: "reciprocal causal one-hop reactivation across independently read frames; not yet SYN",
      }),
    }));
  }
  alternatives.sort((a, b) => (b.forwardVotes + b.reverseVotes) - (a.forwardVotes + a.reverseVotes));
  return Object.freeze({
    schema: "EODescriptorActivationFrontier@1",
    events: Object.freeze(events),
    directionalVotes: Object.freeze([...votes.values()].map((x) => Object.freeze({ ...x, examples: Object.freeze(x.examples) }))),
    alternatives: Object.freeze(alternatives),
  });
}
