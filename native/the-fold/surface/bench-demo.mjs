#!/usr/bin/env node
// bench-demo.mjs — build a working bench page: node bench-demo.mjs OUTDIR
// Three real cases run in the fold's sandbox and land on the ledger; the page
// is the generic dock plus the rename-your-handles settings panel.
// Serve OUTDIR over http (module imports do not load from file://).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyBench, addCard, promote, statusOf, phrase, verifyChain } from "./bench.mjs";
import { runOnBench } from "./bench-run.mjs";
import { renderDock, renderSettings, SETTINGS_SCRIPT } from "./dock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? "bench-out";
fs.mkdirSync(out, { recursive: true });

let log = emptyBench();
const human = "human:you";
log = addCard(log, { id: "moser", text: "The Moser spindle (7 vertices, 11 unit edges) is not 3-colourable.", author: human }).log;
log = addCard(log, { id: "es", text: "Every n >= 2 has 4/n = 1/x + 1/y + 1/z in positive integers.", author: human }).log;
log = addCard(log, { id: "tension", text: "SH0ES and Planck H0 differ by about 5 sigma.", author: human }).log;

const col = `const col=(n,E,k)=>{const c=Array(n).fill(-1);const go=(i)=>{if(i==n)return true;for(let x=0;x<k;x++){if(E.every(([p,q])=>!((p==i&&c[q]==x)||(q==i&&c[p]==x)))){c[i]=x;if(go(i+1))return true;c[i]=-1;}}return false;};return go(0);};`;
const spindle = `${col}
const a=Math.acos(5/6);const rh=(t)=>{const r=(x,y)=>[x*Math.cos(t)-y*Math.sin(t),x*Math.sin(t)+y*Math.cos(t)];const u=r(1,0),v=r(0.5,Math.sqrt(3)/2);return [u,v,[u[0]+v[0],u[1]+v[1]]];};
const V=[[0,0],...rh(0),...rh(a)];const E=[];for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)if(Math.abs(Math.hypot(V[i][0]-V[j][0],V[i][1]-V[j][1])-1)<1e-9)E.push([i,j]);
console.log('#scope {"kind":"instance","label":"Moser spindle, 7 vertices, 11 unit edges"}');console.log('#result '+(E.length===11&&!col(7,E,3)));`;
const triangle = `${col}const T=[[0,1],[1,2],[0,2]];console.log('#scope {"kind":"instance","label":"triangle"}');console.log('#result '+(!col(3,T,3)));`;
const FULL = `(n)=>{for(let x=Math.ceil(n/4);x<=Math.floor(3*n/4)+1;x++){const m=4*x-n;if(m<=0)continue;const d=n*x;for(let y=Math.ceil(d/m);y<=Math.floor(2*d/m);y++){if((m*y-d)>0&&(d*y)%(m*y-d)==0)return true;}}return false;}`;
const BROKEN = `(n)=>{const x=Math.ceil(n/4);const m=4*x-n;if(m<=0)return true;const d=n*x;const y=Math.ceil(d/m);return (m*y-d)>0&&(d*y)%(m*y-d)==0;}`;
const es = (f) => `const sol=${f};let bad=0;for(let n=2;n<=2000;n++)if(!sol(n))bad++;console.log('#scope {"kind":"range","lo":2,"hi":2000}');console.log('#result '+(bad===0));`;
const tension = `const a=73.04,sa=1.04,b=67.4,sb=0.5,s=(a-b)/Math.hypot(sa,sb);console.log('#scope {"kind":"instance","label":"the two published values, treated as independent Gaussians"}');console.log('#result '+(s>4.5&&s<5.5));`;

for (const [id, card, role, code, inputs] of [
  ["r-moser", "moser", "check", spindle, []], ["c-moser", "moser", "control", triangle, []],
  ["r-es", "es", "check", es(FULL), []], ["c-es", "es", "control", es(BROKEN), []],
  ["r-t", "tension", "check", tension, [{ ref: "2112.04510v3#1447", quote: "H0=73.04+-1.04" }, { ref: "1807.06209v4#1104", quote: "H_0 = (67.4\\pm 0.5)" }]],
  ["c-t", "tension", "control", `console.log('#scope {"kind":"instance","label":"identical values"}');console.log('#result '+(Math.abs(70-70)/Math.hypot(1,1)>4.5));`, []],
]) log = runOnBench(log, { id, card, role, code, inputs }).log;
for (const c of ["moser", "es", "tension"]) { const r = promote(log, { card: c, to: "computed_in_range", by: human }); if (r.log) log = r.log; else console.error(c, r.error); }

const claims = ["moser", "es", "tension"].map((id) => ({ id, title: id, body: phrase(log, id), status: statusOf(log, id), address: `bench#${log.entries.find((e) => e.kind === "card" && e.id === id).seq}` }));
const rows = log.entries.filter((e) => e.kind === "run").map((r) => ({ id: r.id, title: `${r.role} · ${r.card}`, body: `result ${r.result} · ${r.ms}ms · scope ${r.scope.kind}`, address: `code sha256 ${r.codeSha.slice(0, 12)}`, chips: r.inputs.map((i) => `${i.ref} “${i.quote}”`) }));
const { html } = renderDock({
  title: "Bench",
  content: {
    subject: { items: claims, note: `chain ${verifyChain(log).ok ? "verified" : "BROKEN"} · ${log.entries.length} entries` },
    measures: { items: [{ id: "h0-a", title: "H0 (SH0ES)", body: "73.04 ± 1.04 km/s/Mpc", address: "2112.04510v3#1447-1452" }, { id: "h0-b", title: "H0 (Planck)", body: "67.4 ± 0.5 km/s/Mpc", address: "1807.06209v4#1104-1108" }] },
    rows: { items: rows },
  },
});
const page = `<!doctype html><meta charset=utf-8><title>Bench</title><style>body{font:15px system-ui;margin:2rem auto;max-width:60rem;padding:0 1rem}.slot{border-top:1px solid #8884;margin-top:1rem}.item{margin:.5rem 0}.addr,.chip{font:12px ui-monospace,monospace;margin-right:.5rem}.refused{color:#b00}.st{font-size:12px;padding:0 .4rem;border:1px solid #8886;border-radius:4px}details{margin:1rem 0}label{display:flex;gap:.5rem;margin:.2rem 0}input{flex:1}</style>
<details><summary>Settings — rename handles</summary>${renderSettings({})}</details>${html}<script type=module>${SETTINGS_SCRIPT}</script>`;
fs.writeFileSync(path.join(out, "index.html"), page);
fs.copyFileSync(path.join(HERE, "handles.mjs"), path.join(out, "handles.mjs"));
fs.writeFileSync(path.join(out, "bench-log.json"), JSON.stringify(log, null, 1));
console.log(`wrote ${out}/index.html  entries=${log.entries.length}  chain=${verifyChain(log).ok}`);
