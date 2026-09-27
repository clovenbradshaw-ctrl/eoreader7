// node eval/russian-role-cues-eval.mjs [split=test] [out.json]
import { writeFileSync } from "node:fs";
import { runRussianRoleCuesEval } from "./russian-role-cues-lib.mjs";
const [SPLIT = "test", OUT] = process.argv.slice(2);
const o = runRussianRoleCuesEval(SPLIT);
console.log(JSON.stringify(o, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(o));
