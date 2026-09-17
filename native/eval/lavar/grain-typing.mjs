// grain-typing.mjs — re-export shim. The logic moved to the production
// adapter (native/adapters/text/grain-typing.js) on 2026-09-16 so the
// production reading path types GFP cells with the identical logic LaVar
// uses; this file stays so eot-jsonl.mjs and field-lens-boost.mjs (which
// predate the move) keep importing the same name from the same place.
export { GRAIN_BY_THRAX, cellLabelOf, makeGrainTyper } from "../../adapters/text/grain-typing.js";