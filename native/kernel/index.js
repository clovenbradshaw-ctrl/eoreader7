export {
  MODES,
  DOMAINS,
  GRAINS,
  TERRAIN_BY_DOMAIN,
  STANCE_BY_MODE,
  cellOf,
  cubeAddresses,
} from "./cube.js";

export {
  receivedGround,
  eoOperation,
  deltaFold,
  applyObservation,
  applyDelta,
  reconstruct,
} from "./fold.js";

export { deriveOrientation } from "./orientation.js";
export { perceive } from "./perception.js";
export { witness } from "./witness.js";

export {
  hyperedge,
  graphObject,
  indexHypergraphEntries,
  buildHypergraph,
  graphEntriesForIds,
  graphEdgesForRelation,
  graphEdgesAtSequence,
  relevantHypergraphNeighborhood,
} from "./hypergraph.js";

export {
  addressOf,
  relevantNeighborhood,
  interrogateCube,
  deriveEOTransformations,
} from "./interrogation.js";
