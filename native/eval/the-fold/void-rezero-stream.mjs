// void-rezero-stream.mjs — Pass 24: re-zero under a stream. Zero model calls.
//   node native/eval/the-fold/void-rezero-stream.mjs
import { runVoidRezeroStream } from "./lib/void-rezero-stream.mjs";
const r = await runVoidRezeroStream({ seeds: 20 });
for (const l of r.lines) console.log(l);
console.log("\nnumbers:", JSON.stringify(r.numbers));
