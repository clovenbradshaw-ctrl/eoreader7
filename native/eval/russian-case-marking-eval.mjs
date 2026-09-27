// native/eval/russian-case-marking-eval.mjs — prints the Russian case-reader
// measurement (russian-case-marking-lib.mjs). Developed on "dev", reported on
// "test" once; tests/russian-case-marking.test.js reads the test split on every
// run, so the headline numbers are enforced, not only printed.
//   node eval/russian-case-marking-eval.mjs [dev|test]
import { writeFileSync } from "node:fs";
import { runRussianCaseEval } from "./russian-case-marking-lib.mjs";
const SPLIT = process.argv[2] ?? "test";
const report = runRussianCaseEval(SPLIT);
console.log(JSON.stringify(report, null, 1));
writeFileSync(new URL(`./results/russian-case-marking-eval-${SPLIT}.json`, import.meta.url), JSON.stringify(report, null, 2));
