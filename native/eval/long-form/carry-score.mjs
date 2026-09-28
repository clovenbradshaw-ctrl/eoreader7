// native/eval/long-form/carry-score.mjs — the ground row, scored live
// (ONE-PIPELINE.md, "The missing elements", family A). The same frozen
// outline written three ways: as the ledger writes it, with the carried
// ground (organs/carried-ground.js), and with the stale control (the ground
// as it stood at a random earlier part). Read from the text alone:
//
//   CON·Ground  seams — adjacent parts sharing no being (fewer is carried)
//   NUL·Figure  strangers: distinct names and mentions per 1,000 words
//   REC·Ground  "tomorrow" kept — a part saying tomorrow whose next part
//               moves to a later day
//   SYN·Ground  particulars carried — recurring strangers seen in two or
//               more chapters
//   EVA·Ground  the note's size: prompt tokens, mean and max
//
//   node native/eval/long-form/carry-score.mjs <dir> [--arms=ledger,field,stale]
import fs from "node:fs";
import path from "node:path";
import { sentences } from "../../adapters/text/english-parser.js";
import { makeLongForm, makeTextStore, outlineOf } from "../../organs/long-form.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { makeNotes } from "../../kernel/notes.js";
import { readBack, clearance, seams } from "../../organs/read-back.js";
import { NEXT_DAY } from "../../organs/carried-ground.js";

const dir = process.argv[2];
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const arms = arg("arms", "ledger,field,stale").split(",");
const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
const none = async () => { throw new Error("carry-score asks nothing"); };
const rows = [];
for (const arm of arms) {
  const f = path.join(dir, `${arm}.state.json`);
  if (!fs.existsSync(f)) { console.log(`${arm.padEnd(7)} (not written)`); continue; }
  const state = JSON.parse(fs.readFileSync(f, "utf8"));
  const lf = makeLongForm({ ask: none, sentences, medium: PROSE_MEDIUM, castDetails: outline.castDetails });
  const store = makeTextStore(state.store);
  const o = outlineOf(makeNotes().fold(state.notes), PROSE_MEDIUM);
  const cast = o.cast.map((c) => ({ id: c.id, name: c.name }));
  const known = o.cast.flatMap((c) => c.props.filter((p) => (outline.castDetails ?? []).includes(p.label) || ["home", "lacks", "becomes"].includes(p.label)).map((p) => p.value));
  const groups = [];
  const parts = o.leaves.map((leaf) => { const g = leaf.within.at(-1)?.id ?? "whole"; if (groups.at(-1) !== g) groups.push(g); const cur = lf.currentLines(state.notes, store, leaf.part.id); return { id: leaf.part.id, chapter: groups.length - 1, lines: (cur?.lines ?? []).map((l) => ({ text: l.text, addr: l.addr })) }; }).filter((p) => p.lines.length);
  const read = readBack({ parts, cast, sentences, known });
  const cl = clearance(read);
  const words = parts.reduce((a, p) => a + p.lines.reduce((b, l) => b + l.text.split(" ").length, 0), 0);
  const strangerMentions = read.parts.reduce((a, p) => a + Object.values(p.strangers).reduce((b, n) => b + n, 0), 0);
  const distinct = new Set(read.parts.flatMap((p) => Object.keys(p.strangers))).size;
  const textOf = (p) => p.lines.map((l) => l.text).join(" ").toLowerCase();
  const tomorrow = parts.map((p, k) => (textOf(p).includes("tomorrow") ? k : -1)).filter((k) => k >= 0 && k + 1 < parts.length);
  const kept = tomorrow.filter((k) => NEXT_DAY.some((ph) => textOf(parts[k + 1]).includes(ph))).length;
  const across = cl.established.filter((e) => new Set(read.parts.map((p, k) => (p.strangers[e.name] ? parts[k].chapter : null)).filter((c) => c != null)).size >= 2).length;
  const log = path.join(dir, `${arm}.log.jsonl`);
  const toks = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((x) => x?.kind === "body_turn" && x.promptTokens).map((x) => x.promptTokens) : [];
  const row = { arm, parts: parts.length, words, seams: seams(read, cl).length, links: parts.length - 1, strangersDistinctPer1k: Number(((1000 * distinct) / Math.max(1, words)).toFixed(1)), strangerMentionsPer1k: Number(((1000 * strangerMentions) / Math.max(1, words)).toFixed(1)), recurringStrangers: cl.established.length, tomorrow: tomorrow.length, tomorrowKept: kept, particularsAcrossChapters: across, promptMean: toks.length ? Math.round(toks.reduce((a, b) => a + b, 0) / toks.length) : null, promptMax: toks.length ? Math.max(...toks) : null };
  rows.push(row);
  console.log(`${arm.padEnd(7)} ${row.parts} parts, ${words} words · seams ${row.seams}/${row.links} · strangers ${distinct} distinct (${row.strangersDistinctPer1k}/1k), ${strangerMentions} mentions (${row.strangerMentionsPer1k}/1k), ${cl.established.length} recurring · tomorrow ${kept}/${tomorrow.length} kept · particulars across chapters ${across} · prompt mean ${row.promptMean} max ${row.promptMax}`);
}
fs.writeFileSync(path.join(dir, "carry-score.json"), JSON.stringify(rows, null, 1));
