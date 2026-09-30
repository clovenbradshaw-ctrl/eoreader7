// native/eval/long-form/where.mjs — "where is the being now?" asked of a
// book on the record (organs/narrative-arc.js). With --at=k, the answer at
// part k; without, the whole trajectory, one part a line, and the arc's
// findings (Gebser, the being).
//
//   node native/eval/long-form/where.mjs <dir> [--state=ledger-edited] [--at=37]
import fs from "node:fs";
import path from "node:path";
import { sentences } from "../../adapters/text/english-parser.js";
import { makeLongForm, makeTextStore } from "../../organs/long-form.js";
import { makeBookEditor } from "../../organs/book-editor.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";

const dir = process.argv[2];
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const name = arg("state", fs.existsSync(path.join(dir, "ledger-edited.state.json")) ? "ledger-edited" : "ledger");
const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
const state = JSON.parse(fs.readFileSync(path.join(dir, `${name}.state.json`), "utf8"));
const none = async () => { throw new Error("where.mjs asks nothing"); };
const lf = makeLongForm({ ask: none, sentences, medium: PROSE_MEDIUM, castDetails: outline.castDetails });
const ed = makeBookEditor({ lf, ask: none, medium: PROSE_MEDIUM, castDetails: outline.castDetails });
const store = makeTextStore(state.store);
const read = ed.readBook({ notes: state.notes, store, task: outline.request });
const f = read.frame;
if (!f?.p) { console.log("the telling follows no one: no being on the record"); process.exit(0); }
console.log(`the being: ${f.p} · home: ${f.home ?? "(not on the record)"} · missing: ${f.lack ?? "(not on the record)"} · becomes: ${f.becomes ?? "(not on the record)"}`);
const at = arg("at", null);
if (at != null) { console.log(ed.whereIsBeing({ notes: state.notes, store, task: outline.request, k: Number(at) - 1 }).answer); process.exit(0); }
const mark = (x) => (x.at === "home" ? "HOME" : x.at === "away" ? "away" : x.at === "there" ? "here" : "  - ") + (x.changed ? " changed" : "");
read.path.forEach((x, k) => console.log(`${String(k + 1).padStart(4)} ch${String(x.chapter + 1).padStart(3)}  ${mark(x).padEnd(13)} ${x.line ? x.line.text.slice(0, 110) : ""}`));
const arc = read.findings.filter((x) => ["Jean Gebser", "Odysseus (the being)"].includes(x.editor));
if (!f.home || !f.lack || !f.becomes) console.log(`\nno arc: the record does not say where ${f.p} starts, what is missing, and what ${f.p} becomes`);
else console.log(`\narc findings: ${arc.length ? arc.map((x) => `${x.editor}: ${x.kind}${x.licenses ? ` (${x.licenses})` : ""}`).join("; ") : "none — out from the void, back to it, changed"}`);
console.log(ed.whereIsBeing({ notes: state.notes, store, task: outline.request, k: read.path.length - 1 }).answer);
