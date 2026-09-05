// null-census.mjs — Pass 26: a census of nulls through time. Zero model calls.
import { runNullCensus } from "./lib/null-census.mjs";
const r = await runNullCensus({ seeds: 12 });
for (const l of r.lines) console.log(l);
console.log("\nnumbers:", JSON.stringify(r.numbers));
