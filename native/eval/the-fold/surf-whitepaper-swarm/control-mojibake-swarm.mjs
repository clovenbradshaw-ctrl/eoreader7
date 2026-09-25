// control-mojibake-swarm.mjs — synthetic control for the ant-swarm
// hard-meaning mechanism ("Wilson's swarm"), run against a deliberately
// mojibake-mangled sample. Real detectHardMeaning + real runSwarmTurn,
// no model call, no fixture stand-in. Written for the surf-wp-fwd-b forward
// run's report; creates no new dependency on any other agent's file.
import { detectHardMeaning } from "../../lavar/hard-meaning.mjs";
import { runSwarmTurn } from "../../../../swarm-server.mjs";

// Deliberately hard: 5 distinct mojibake byte-mangled runs (â€™, Ã©, Â·,
// â€œ, â€ ), well over the module's own floor of "2+ mojibake runs" and
// "3+ garbled tokens".
const sample = [
  "The caféâ€™s owner said itâ€™s a naÃ¯ve Â· idea â€” but the crowd loved",
  "the â€œsoufflÃ©â€ anyway, and no one asked for a refund.",
].join(" ");

const detectResult = detectHardMeaning({ task: "read this", texts: [{ text: sample }] });

const t0 = Date.now();
const swarmResult = runSwarmTurn({ task: "read this", texts: [{ text: sample }] });
const elapsedMs = Date.now() - t0;

console.log(JSON.stringify({
  sample,
  detectHardMeaning: detectResult,
  runSwarmTurn: swarmResult,
  elapsedMs,
}, null, 2));
