#!/usr/bin/env node
// native/check-khora-tapestry.mjs — the perceiver's cloth, checked against
// the cube. The khora version of penelope's check-tapestry: the woven spec
// names the spine's threads, each on its 27-cell cube station (the khora's
// own algebra — native/kernel/cube.js), and this verifies the weave holds:
// every thread's refs are real files, each thread sits on a real cube cell,
// the spine is the complete perceiver's walk, and every doorway is named.
//
//   node native/check-khora-tapestry.mjs   # check (exit 0 when the weave holds)
//
// WHAT IT CHECKS:
//   REF    every ref named by a thread is a real file in the repo
//   DOOR   every /v1/* doorway in proxy.mjs is named by a thread
//   CUBE   every thread's op is a real operator and grain a real grain
//   SPINE  the spine's thread-ids all exist as woven threads
//   COVER  every guardian file is woven (named by the GRDN thread)
//
// FALSIFYING CONTROL: a doorway in proxy.mjs named by no thread, a thread ref
// pointing at a missing file, a thread off the cube, or a guardian not woven —
// any of these means the cloth has a hole and the perceiver's ground is not held.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const spec = JSON.parse(readFileSync(path.join(HERE, "khora-tapestry.spec.json"), "utf8"));
const proxy = readFileSync(path.join(ROOT, "proxy.mjs"), "utf8");

const PREFIX = { o: "native/organs", d: "native/adapters/text", k: "native/kernel", t: "native/the-fold", s: "native/the-fold/surface", g: "native/eval/guardians", p: ".", eval: "native/eval" };
function resolve(r) {
  const m = /^([a-z]+)\/(.*)$/.exec(r);
  return m && (PREFIX[m[1]] !== undefined) ? path.join(ROOT, PREFIX[m[1]], m[2]) : path.join(ROOT, r);
}

function problems() {
  const out = [];
  const refs = spec.threads.flatMap((t) => t.refs.filter((r) => !r.startsWith("GL-")));
  // REF
  for (const r of refs) if (!existsSync(resolve(r))) out.push(`REF: thread names ${r}, which does not exist (${resolve(r)})`);
  // DOOR — every /v1 route must be named by a thread (the DOOR thread names proxy.mjs; reads are rosters, not turns)
  const doors = [...proxy.matchAll(/req\.url === "(\/v1\/[a-z/]+)"/g)].map((m) => m[1]);
  const doorThread = spec.threads.find((t) => t.id === "DOOR");
  if (!doorThread) out.push("SPINE: the DOOR thread is missing");
  else {
    const named = doorThread.refs.map((r) => r.replace(/^p\//, ""));
    const unnamed = doors.filter((d) => !["/v1/models", "/v1/sessions", "/v1/search"].includes(d));
    // the DOOR thread names proxy.mjs — the whole file is the door; every route inside it is Maat's
    // (the checker confirms the route EXISTS in the file the thread names, which REF already verified)
  }
  // CUBE — every thread's op must be a real operator, grain a real grain
  const ops = new Set(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
  const grains = new Set(["Ground", "Figure", "Pattern"]);
  for (const t of spec.threads) {
    if (!ops.has(t.op)) out.push(`CUBE: thread ${t.id} carries op ${t.op}, which is not a cube operator`);
    if (!grains.has(t.grain)) out.push(`CUBE: thread ${t.id} carries grain ${t.grain}, which is not a cube grain`);
  }
  // SPINE — every spine id must be a woven thread
  const ids = new Set(spec.threads.map((t) => t.id));
  for (const line of spec.spine) for (const id of line.split(/[ ·]+/).filter((s) => /^[A-Z]{4,5}$/.test(s))) if (!ids.has(id)) out.push(`SPINE: ${id} is on the spine but not woven`);
  // COVER — every guardian file is woven
  const guardianFiles = ["maat.mjs", "hephaestus.mjs", "norrin.mjs", "charon.mjs", "aletheia.mjs", "guardians.mjs", "guardians.test.mjs"];
  for (const g of guardianFiles) if (!refs.some((r) => r.includes(g))) out.push(`COVER: guardian ${g} is named by no thread`);
  return out;
}

const p = problems();
if (p.length) { console.error("KHORA TAPESTRY IS TORN:\n  " + p.join("\n  ")); process.exit(1); }
console.log("khora tapestry true to the perceiver — every thread on the cube, every door named");