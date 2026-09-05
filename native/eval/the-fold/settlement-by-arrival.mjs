// settlement-by-arrival.mjs — Pass 27: what a third source may and may not settle. Zero model calls.
import { runSettlementByArrival } from "./lib/settlement-by-arrival.mjs";
const r = await runSettlementByArrival();
for (const l of r.lines) console.log(l);
console.log("\nnumbers:", JSON.stringify(r.numbers));
