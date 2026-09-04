import { readFileSync } from "node:fs";
const H="/private/tmp/claude-501/-Users-mlacy-Documents-3-0/4efc7373-bf70-4d94-a100-172a687266e5/scratchpad/wt2/native/";
const w=JSON.parse(readFileSync(H+"eval/the-fold/results/ranke-backwards.json","utf8"));
const parse=(r)=>{const m=String(r.note).match(/^(.*?) —(.*?)→ (.*)$/);return m?{...r,e1:m[1],lab:m[2],e2:m[3]}:null;};
const rows=w.real.rows.map(parse).filter(Boolean);
// A QUANTITY: a number with a unit, or a clock time, or a date. Objectively
// measured, subjectively reported.
const NUM=/(\d[\d,]*\.?\d*)\s*(pounds|lb|kg|kilograms|feet|ft|m|metres|meters|miles|km|seconds|minutes|hours|days)\b/gi;
const CLOCK=/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(UTC|EDT|EST|GMT|a\.m\.|p\.m\.|am|pm)?/g;
let withNum=0, withClock=0; const quants=[];
for(const r of rows){
  const t=`${r.e1} ${r.lab} ${r.e2}`;
  const ns=[...t.matchAll(NUM)], cs=[...t.matchAll(CLOCK)];
  if(ns.length) withNum++;
  if(cs.length) withClock++;
  for(const m of ns) quants.push({kind:"measure",value:m[1],unit:m[2].toLowerCase(),host:r.host,note:r.note,face:r.facePath});
  for(const m of cs) quants.push({kind:"clock",value:m[0].trim(),unit:"time",host:r.host,note:r.note,face:r.facePath});
}
console.log(`notes ${rows.length}: with a measured quantity ${withNum}, with a clock time ${withClock}`);
console.log(`quantity mentions total: ${quants.length}`);
const byUnit={}; for(const q of quants) byUnit[q.unit]=(byUnit[q.unit]??0)+1;
console.log("by unit:",JSON.stringify(byUnit));
const hosts=new Set(quants.map(q=>q.host).filter(Boolean));
console.log("distinct hosts carrying a quantity:",hosts.size);
console.log("\nsample:");
for(const q of quants.slice(0,12)) console.log(`  [${q.unit}] ${q.value.padEnd(12)} ${String(q.host).slice(0,26).padEnd(28)} ${q.note.slice(0,74)}`);
// THE DECISIVE NUMBER: is any single quantity reported by two or more DISTINCT sources?
const norm=(v)=>String(v).replace(/[, ]/g,"").toLowerCase();
const byVal=new Map();
for(const q of quants){ const k=`${q.unit}|${norm(q.value)}`; if(!byVal.has(k))byVal.set(k,new Set()); byVal.get(k).add(q.host??q.face); }
const multi=[...byVal.entries()].filter(([,s])=>s.size>1);
console.log(`\ndistinct quantity VALUES: ${byVal.size}`);
console.log(`values reported by 2+ distinct sources: ${multi.length}`);
for(const [k,s] of multi) console.log(`  ${k}  <- ${[...s].join(", ")}`);
