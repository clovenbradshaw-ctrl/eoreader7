// ═══ LOVELACE · TEACH IT TO FISH ═══ A SPREAD OF VERY DIFFERENT KINDS OF CODE — one small task per kind, drawn by a local small model, scored by something that RUNS where a toolchain exists.
//
// The operator, 2026-10-01: "Try this on really wide varieties of code, don't over-design to make ducks or penguins." So: ONE generic prompt builder for every task (a file comment with the task and two worked examples, then the
// opening line of the thing to write — the register of the file), no per-kind prompt, no species, nothing added after seeing a result. A kind whose toolchain is not on this box is drawn and checked STRUCTURALLY ONLY and is
// reported as `unverified`, never counted as a pass.
//   node native/the-fold/code-spread.mjs [--model qwen2.5-coder:1.5b] [--only a,b] [--out rows.jsonl]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OLLAMA = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "spread-"));
const run = (cmd, args, { input, cwd = TMP, timeout = 20000 } = {}) => { const r = spawnSync(cmd, args, { input, cwd, timeout, encoding: "utf8" }); return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim().slice(0, 300), timedOut: r.error?.code === "ETIMEDOUT" }; };
const write = (name, text) => { const f = path.join(TMP, name); fs.writeFileSync(f, text); return f; };
const COMMENT = { js: "//", py: "#", c: "//", rs: "//", go: "//", sh: "#", sql: "--", yaml: "#", json: "//", java: "//", lua: "--", tex: "%", md: "<!--", txt: "#", other: "//" };

/** the ONE prompt every task gets: what the file is for, two worked examples, then the opening of the thing to write */
export function promptOf(t) {
  const c = COMMENT[t.lang] ?? "//", lines = [t.task, ...t.examples.map((e) => `example: ${e}`)];
  return `${lines.map((l) => (t.lang === "md" ? `<!-- ${l.replace(/\n/g, " ")} -->` : `${c} ${l}`)).join("\n")}\n${t.cue}`;
}

const ok = (cond, detail = "") => ({ ok: !!cond, detail });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const wrapJs = (code, tests) => `${code}\nconst __t = ${tests};\nconst __bad = __t.filter(([g, w]) => JSON.stringify(g()) !== JSON.stringify(w));\nconsole.log(__bad.length ? "FAIL " + __bad.length : "PASS");`;
const jsRun = (code, tests) => { const r = run("node", [write("t.js", wrapJs(code, tests))]); return ok(r.out === "PASS", r.out || r.err); };
const pyRun = (code, tests) => { const r = run("python3", [write("t.py", `${code}\n\nimport json\n_t = ${tests}\n_bad = [1 for g, w in _t if json.dumps(g(), sort_keys=True) != json.dumps(w, sort_keys=True)]\nprint("FAIL %d" % len(_bad) if _bad else "PASS")`)]); return ok(r.out === "PASS", r.out || r.err); };
const cRun = (code, main) => { const f = write("t.c", `#include <stdio.h>\n#include <stdint.h>\n#include <string.h>\n#include <stdlib.h>\n${code}\nint main(void){ ${main} }`); const b = run("gcc", [f, "-o", path.join(TMP, "t.out"), "-lm"]); if (!b.ok) return ok(false, "compile: " + b.err); const r = run(path.join(TMP, "t.out"), []); return ok(r.out === "PASS", r.out || r.err); };
const sqlRun = (code, setup, want) => { const f = write("t.py", `import sqlite3, json, sys\nd = sqlite3.connect(":memory:")\nd.executescript(${JSON.stringify(setup)})\nq = ${JSON.stringify(code)}\nprint(json.dumps([list(r) for r in d.execute(q.strip().rstrip(";")).fetchall()]))`); const r = run("python3", [f]); return ok(r.out === JSON.stringify(want), r.out || r.err); };
const structural = (code, re, why) => ({ ok: null, unverified: true, detail: re.test(code) ? `structure only (${why}): looks like the thing, NOT run` : `structure only (${why}): does not even look like it` , looks: re.test(code) });

// every task: kind, lang, task (one plain sentence), examples (two), cue (the opening of what to write), close (what ends the draft), verify(code)
export const TASKS = [
  { kind: "web frontend", lang: "js", task: "Return an HTML <ul> list for the items, one <li> each, with & < > escaped.", examples: ["renderList(['a','b']) -> <ul><li>a</li><li>b</li></ul>", "renderList(['x<y']) -> <ul><li>x&lt;y</li></ul>"], cue: "function renderList(items) {", close: "\n}",
    verify: (c) => jsRun(c, `[[() => renderList(['a','b']), '<ul><li>a</li><li>b</li></ul>'], [() => renderList(['x<y & z']), '<ul><li>x&lt;y &amp; z</li></ul>'], [() => renderList([]), '<ul></ul>']]`) },
  { kind: "backend / auth", lang: "py", task: "Sign a message with HMAC-SHA256 (hex) and verify a signature in constant time.", examples: ["sign('k','hello') -> 64 hex characters", "verify('k','hello',sign('k','hello')) -> True"], cue: "import hmac, hashlib\n\ndef sign(key, msg):", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: len(sign('k','hello')), 64), (lambda: verify('k','hello',sign('k','hello')), True), (lambda: verify('k','hello',sign('k','HELLO')), False), (lambda: sign('k','a') == sign('k','a'), True)]`) },
  { kind: "systems (C)", lang: "c", task: "Count the set bits in an unsigned 32-bit value.", examples: ["popcount(7) -> 3", "popcount(0xFFFFFFFF) -> 32"], cue: "int popcount(uint32_t x) {", close: "\n}",
    verify: (c) => cRun(c, `if (popcount(0)==0 && popcount(7)==3 && popcount(0xFFFFFFFFu)==32 && popcount(0x80000001u)==2) printf("PASS"); else printf("FAIL"); return 0;`) },
  { kind: "embedded", lang: "c", task: "Compare-match register value for a timer: f_cpu / (prescaler * hz) - 1.", examples: ["ocr_for(16000000, 64, 1000) -> 249", "ocr_for(8000000, 8, 100) -> 9999"], cue: "uint32_t ocr_for(uint32_t f_cpu, uint32_t prescaler, uint32_t hz) {", close: "\n}",
    verify: (c) => cRun(c, `if (ocr_for(16000000,64,1000)==249 && ocr_for(8000000,8,100)==9999 && ocr_for(16000000,1024,1)==15624) printf("PASS"); else printf("FAIL"); return 0;`) },
  { kind: "game dev", lang: "js", task: "One physics step: apply gravity to the velocity, move the position, and bounce off the floor when y reaches 0 or below by setting y to 0 and reversing and halving the velocity.", examples: ["step({y:10,v:0},1,-10) -> {y:0,v:5}", "step({y:5,v:2},0.5,-10) -> {y:3.5,v:-3}"], cue: "function step(s, dt, g) {", close: "\n}",
    verify: (c) => jsRun(c, `[[() => step({y:5,v:2},0.5,-10), {y:3.5,v:-3}], [() => step({y:10,v:0},1,-10), {y:0,v:5}], [() => step({y:1,v:-4},0.5,0), {y:0,v:2}]]`) },
  { kind: "data science", lang: "py", task: "Population standard deviation of a list of numbers (0 for an empty list), without any library.", examples: ["pstdev([2,4,4,4,5,5,7,9]) -> 2.0", "pstdev([]) -> 0"], cue: "def pstdev(xs):", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: round(pstdev([2,4,4,4,5,5,7,9]),6), 2.0), (lambda: pstdev([]), 0), (lambda: round(pstdev([1,1,1]),6), 0.0)]`) },
  { kind: "data engineering (SQL)", lang: "sql", task: "The three customers with the highest total order amount, highest first: customer then total.", examples: ["-- orders(customer, amount)", "-- result rows: ('ann', 90), ('bo', 40)"], cue: "SELECT", close: ";",
    verify: (c) => sqlRun("SELECT" + c, "create table orders(customer text, amount int); insert into orders values('ann',50),('bo',40),('ann',40),('cy',10),('di',5),('cy',25),('di',60);", [["ann", 90], ["di", 65], ["cy", 35]]) },
  { kind: "mobile (Swift)", lang: "other", task: "Return the first letters of each word of a name, uppercased.", examples: ["initials(\"ada lovelace\") -> \"AL\"", "initials(\"x\") -> \"X\""], cue: "func initials(_ name: String) -> String {", close: "\n}", verify: (c) => structural(c, /return|\.map|reduce/, "no swiftc here") },
  { kind: "devops (k8s)", lang: "yaml", task: "A Kubernetes Deployment named web with 3 replicas of image nginx:1.25 exposing container port 80.", examples: ["kind: Deployment", "spec.replicas: 3"], cue: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\nspec:", close: "\n\n\n",
    verify: (c) => { const f = write("d.yaml", "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\nspec:" + c); const r = run("yq", [".", f]); if (!r.ok) return ok(false, "yaml: " + r.err); try { const d = JSON.parse(r.out), ct = d.spec?.template?.spec?.containers?.[0]; return ok(d.spec.replicas === 3 && ct?.image === "nginx:1.25" && (ct.ports?.[0]?.containerPort === 80), JSON.stringify({ r: d.spec.replicas, i: ct?.image })); } catch (e) { return ok(false, String(e.message)); } } },
  { kind: "shell", lang: "sh", task: "Read lines on stdin and print how many contain the word ERROR (case-sensitive).", examples: ["printf 'ERROR a\\nok\\nERROR b\\n' | ./count.sh -> 2", "printf '' | ./count.sh -> 0"], cue: "#!/bin/bash\n", close: "\n\n\n",
    verify: (c) => { const f = write("count.sh", "#!/bin/bash\n" + c); const a = run("bash", [f], { input: "ERROR a\nok\nERROR b\nerror c\n" }), b = run("bash", [f], { input: "" }); return ok(a.out === "2" && b.out === "0", a.out + "|" + b.out + a.err); } },
  { kind: "spreadsheet", lang: "other", task: "A spreadsheet formula: the sum of B2:B20 where A2:A20 equals \"North\".", examples: ["=SUMIF(A2:A20,\"East\",B2:B20)", "=SUMIF(A:A,\"x\",C:C)"], cue: "=", close: "\n", verify: (c) => structural("=" + c, /^=\s*SUMIF\(\s*A2:A20\s*,\s*"North"\s*,\s*B2:B20\s*\)\s*$/i, "no spreadsheet engine here; the one correct form is matched exactly") },
  { kind: "scientific", lang: "py", task: "Trapezoid-rule integral of f over [a, b] with n equal slices.", examples: ["trapz(lambda x: x, 0, 1, 100) -> 0.5", "trapz(lambda x: x*x, 0, 3, 3000) -> about 9.0"], cue: "def trapz(f, a, b, n):", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: round(trapz(lambda x: x, 0, 1, 100),6), 0.5), (lambda: round(trapz(lambda x: x*x, 0, 3, 3000),3), 9.0), (lambda: round(trapz(lambda x: 2, 1, 4, 7),6), 6.0)]`) },
  { kind: "creative coding (p5)", lang: "js", task: "A p5.js draw() that draws one circle at each x = 50, 100, 150 (y = 80, diameter 20) and nothing else.", examples: ["draw() calls circle(50,80,20), circle(100,80,20), circle(150,80,20)", "no background() call"], cue: "function draw() {", close: "\n}",
    verify: (c) => { const r = run("node", [write("p.js", `const calls=[];const circle=(...a)=>calls.push(['c',...a]);const ellipse=(x,y,w,h)=>calls.push(['c',x,y,w]);const background=()=>calls.push(['bg']);const fill=()=>{};const noStroke=()=>{};const stroke=()=>{};const rect=()=>calls.push(['rect']);const width=400,height=400;\n${c}\ndraw();const cs=calls.filter(x=>x[0]==='c').map(x=>x.slice(1).join(','));console.log(JSON.stringify(cs)==='["50,80,20","100,80,20","150,80,20"]'&&!calls.some(x=>x[0]==='bg'||x[0]==='rect')?'PASS':'FAIL '+JSON.stringify(calls));`)]); return ok(r.out === "PASS", r.out || r.err); } },
  { kind: "live coding music", lang: "other", task: "A Sonic Pi loop that plays notes :c4 :e4 :g4 in turn, 0.5 beats apart, forever.", examples: ["live_loop :arp do", "  play :c4; sleep 0.5"], cue: "live_loop :arp do", close: "\nend", verify: (c) => structural("live_loop :arp do" + c, /play[\s\S]*sleep\s+0?\.5/, "no Sonic Pi here") },
  { kind: "smart contract", lang: "other", task: "A Solidity function that adds an amount to a mapping(address => uint256) balance and reverts on overflow.", examples: ["function deposit(uint256 amount) public", "balances[msg.sender] += amount;"], cue: "function deposit(uint256 amount) public {", close: "\n}", verify: (c) => structural(c, /balances\s*\[\s*msg\.sender\s*\]/, "no solc here") },
  { kind: "security / CTF", lang: "py", task: "Decode a hex string that was XOR-ed with a single repeating byte key; return the text.", examples: ["decode('0b0a', 0x42) -> 'Il'", "decode('', 7) -> ''"], cue: "def decode(hexstr, key):", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: decode('0b0a', 0x42), 'Il'), (lambda: decode('', 7), ''), (lambda: decode(bytes([ord(ch) ^ 0x2a for ch in 'flag{x}']).hex(), 0x2a), 'flag{x}')]`) },
  { kind: "compiler", lang: "py", task: "Evaluate an arithmetic expression of non-negative integers with + - * / and parentheses, / being true division; no eval().", examples: ["calc('2+3*4') -> 14", "calc('(1+2)*3') -> 9"], cue: "def calc(s):", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: calc('2+3*4'), 14), (lambda: calc('(1+2)*3'), 9), (lambda: calc('10/4-1'), 1.5), (lambda: calc(' 7 '), 7), (lambda: calc('2*(3+(4-1))'), 12)]`) },
  { kind: "formal verification", lang: "other", task: "A Lean 4 theorem that addition of natural numbers is commutative, proved by the library lemma.", examples: ["theorem foo (a b : Nat) : a + b = b + a := by", "  exact Nat.add_comm a b"], cue: "theorem add_comm' (a b : Nat) : a + b = b + a := by", close: "\n\n", verify: (c) => structural(c, /add_comm|omega|simp|induction/, "no Lean here") },
  { kind: "hardware (Verilog)", lang: "other", task: "A Verilog module `and2` with inputs a, b and output y that is a AND b.", examples: ["module or2(input a, input b, output y);", "  assign y = a | b;"], cue: "module and2(input a, input b, output y);", close: "\nendmodule", verify: (c) => structural(c, /assign\s+y\s*=\s*a\s*&\s*b|and\s*\(/, "no Verilog simulator here") },
  { kind: "GPU / parallel", lang: "other", task: "A CUDA kernel that adds two float arrays element-wise into a third, guarding the array bound n.", examples: ["__global__ void add(const float* a, const float* b, float* c, int n)", "int i = blockIdx.x * blockDim.x + threadIdx.x;"], cue: "__global__ void add(const float* a, const float* b, float* c, int n) {", close: "\n}", verify: (c) => structural(c, /threadIdx[\s\S]*if\s*\(\s*i\s*<\s*n/, "no nvcc here") },
  { kind: "quantum", lang: "py", task: "The state vector (two real amplitudes) after a Hadamard gate on |0>, no library.", examples: ["hadamard_zero() -> [0.7071, 0.7071]", "amplitudes are rounded to 4 places"], cue: "def hadamard_zero():", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: [round(x,4) for x in hadamard_zero()], [0.7071, 0.7071])]`) },
  { kind: "robotics / PLC", lang: "py", task: "Ladder-logic seal-in latch: the motor runs when start is pressed, keeps running until stop is pressed; stop wins.", examples: ["motor(start=True, stop=False, was_on=False) -> True", "motor(start=False, stop=False, was_on=True) -> True"], cue: "def motor(start, stop, was_on):", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: motor(True,False,False), True), (lambda: motor(False,False,True), True), (lambda: motor(False,False,False), False), (lambda: motor(True,True,True), False), (lambda: motor(False,True,True), False)]`) },
  { kind: "esoteric (Brainfuck)", lang: "other", task: "A Brainfuck program that prints the single letter A (ASCII 65).", examples: ["+++++ prints nothing; . prints the cell", "[-] clears a cell"], cue: "", close: "\n",
    verify: (c) => { const code = c.replace(/[^+\-<>.,\[\]]/g, "").slice(0, 2000); const f = write("bf.py", `import sys\ncode=${JSON.stringify(code)}\nt=[0]*30000;p=0;i=0;out='';steps=0\nj={};st=[]\nfor k,ch in enumerate(code):\n    if ch=='[':st.append(k)\n    elif ch==']':\n        if not st:print('BAD');sys.exit()\n        a=st.pop();j[a]=k;j[k]=a\nif st:print('BAD');sys.exit()\nwhile i<len(code) and steps<2000000:\n    ch=code[i];steps+=1\n    if ch=='+':t[p]=(t[p]+1)%256\n    elif ch=='-':t[p]=(t[p]-1)%256\n    elif ch=='>':p+=1\n    elif ch=='<':p-=1\n    elif ch=='.':out+=chr(t[p])\n    elif ch=='[' and t[p]==0:i=j[i]\n    elif ch==']' and t[p]!=0:i=j[i]\n    i+=1\nprint('PASS' if out=='A' else 'FAIL '+repr(out))`); const r = run("python3", [f]); return ok(r.out === "PASS", r.out || r.err); } },
  { kind: "logic / declarative (SQL)", lang: "sql", task: "All ancestors of 'eve' (every person reachable by following parent links upward), alphabetically, one column.", examples: ["-- parent(child, parent)", "-- WITH RECURSIVE ... "], cue: "WITH RECURSIVE", close: ";",
    verify: (c) => sqlRun("WITH RECURSIVE" + c, "create table parent(child text, parent text); insert into parent values('eve','dan'),('dan','cy'),('cy','bo'),('bo','ann'),('zed','ann'),('fay','eve');", [["ann"], ["bo"], ["cy"], ["dan"]]) },
  { kind: "low-code workflow", lang: "json", task: "An n8n-style workflow as JSON: a Webhook node, then an HTTP Request node, connected in that order.", examples: ["{\"nodes\":[{\"name\":\"A\",\"type\":\"n8n-nodes-base.webhook\"}],\"connections\":{}}", "connections: {\"A\":{\"main\":[[{\"node\":\"B\",\"type\":\"main\",\"index\":0}]]}}"], cue: "{", close: "\n}\n",
    verify: (c) => { try { const d = JSON.parse("{" + c.replace(/\n*$/, "") + (c.trim().endsWith("}") ? "" : "")); const types = (d.nodes ?? []).map((n) => String(n.type)); const names = (d.nodes ?? []).map((n) => n.name); const first = names.find((_, i) => /webhook/i.test(types[i])), second = names.find((_, i) => /httpRequest/i.test(types[i])); const link = d.connections?.[first]?.main?.[0]?.[0]?.node; return ok(first && second && link === second, JSON.stringify({ types, link })); } catch (e) { return ok(false, "json: " + String(e.message).slice(0, 80)); } } },
  { kind: "prompt engineering", lang: "txt", task: "A prompt template for summarising a support ticket in one sentence; it must contain the placeholders {customer} and {ticket_text}.", examples: ["Summarise {x} in one sentence.", "placeholders are in curly braces"], cue: "Summarise", close: "\n\n\n", verify: (c) => structural("Summarise" + c, /\{customer\}[\s\S]*\{ticket_text\}|\{ticket_text\}[\s\S]*\{customer\}/, "a prompt has no run; both placeholders present") },
  { kind: "game modding (Lua)", lang: "lua", task: "A Lua function that returns the player's score after adding 10 per coin and subtracting 5 per hit, never below 0.", examples: ["score(3, 0) -> 30", "score(1, 5) -> 0"], cue: "function score(coins, hits)", close: "\nend", verify: (c) => structural(c, /return/, "no lua here") },
  { kind: "markup (Markdown table)", lang: "md", task: "A Markdown table with the header Name | Age and two rows: Ada | 36 and Alan | 41.", examples: ["| A | B |\n|---|---|\n| 1 | 2 |", "the separator row has three dashes per column"], cue: "| Name | Age |", close: "\n\n\n",
    verify: (c) => { const L = ("| Name | Age |" + c).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4), cells = (l) => l.replace(/^\||\|$/g, "").split("|").map((x) => x.trim()); return ok(L.length === 4 && /^[-: |]+$/.test(L[1]) && eq(cells(L[2]), ["Ada", "36"]) && eq(cells(L[3]), ["Alan", "41"]), L.join(" / ")); } },
  { kind: "civic tech", lang: "py", task: "Count requests per category from rows of 'id,category,status' CSV text (header first), most common first, ties alphabetical.", examples: ["count('id,category,status\\n1,pothole,open\\n2,pothole,closed\\n3,noise,open') -> [('pothole',2),('noise',1)]", "header only -> []"], cue: "def count(csv_text):", close: "\n\n\n",
    verify: (c) => pyRun(c, `[(lambda: [tuple(x) for x in count('id,category,status\\n1,pothole,open\\n2,pothole,closed\\n3,noise,open')], [('pothole',2),('noise',1)]), (lambda: count('id,category,status\\n'), []), (lambda: [tuple(x) for x in count('id,category,status\\n1,b,x\\n2,a,x\\n3,c,x\\n4,c,y')], [('c',2),('a',1),('b',1)])]`) },
];

const STOPS = { py: ["\n\n\n", "\nif __name__", "\nprint(", "\n# ", "\nassert "], sql: [";"], other: ["\n\n\n"], md: ["\n\n\n"], txt: ["\n\n\n"], sh: ["\n\n\n"], yaml: ["\n\n\n"] };
async function draw(model, prompt, t) {
  const stop = STOPS[t.lang] ?? ["\n}\n", "\n\n\n"];
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(240000), body: JSON.stringify({ model, prompt, raw: true, stream: false, options: { temperature: 0, num_predict: 420, stop } }) });
  if (!r.ok) throw new Error(`generate ${r.status}`);
  return (await r.json()).response ?? "";
}
/** the file the draw makes: the cue plus the completion, closed the way the task says (the stop removed it) */
const assemble = (t, text) => (t.lang === "sql" || t.kind === "esoteric (Brainfuck)" || t.kind === "spreadsheet" || t.lang === "yaml" || t.lang === "json" || t.lang === "md" || t.lang === "txt" || t.lang === "sh" ? text : `${t.cue}${text}${/^(c|js|rs|go|java)$/.test(t.lang) && !/\}\s*$/.test(text) ? t.close : t.lang === "other" || t.lang === "lua" ? t.close : ""}`);

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const model = arg("model", "qwen2.5-coder:1.5b"), only = arg("only", null)?.split(","), out = arg("out", null), rows = [];
  for (const t of TASKS) {
    if (only && !only.includes(t.kind)) continue;
    let text = "", v;
    try { text = await draw(model, promptOf(t), t); } catch (e) { v = { ok: false, detail: "draw failed: " + e.message }; }
    const code = t.lang === "sql" ? text : t.kind === "devops (k8s)" ? text : assemble(t, text);
    if (!v) { try { v = t.verify(t.lang === "sql" || ["yaml", "json", "md", "txt", "sh"].includes(t.lang) || ["esoteric (Brainfuck)", "spreadsheet"].includes(t.kind) ? text : code); } catch (e) { v = { ok: false, detail: "oracle error: " + String(e.message).slice(0, 100) }; } }
    const row = { kind: t.kind, lang: t.lang, model, verdict: v.unverified ? (v.looks ? "unverified-looks-right" : "unverified-wrong-looking") : v.ok ? "pass" : "fail", detail: String(v.detail).slice(0, 140), code: code.slice(0, 600) };
    rows.push(row); console.log(row.verdict.padEnd(26), t.kind.padEnd(26), row.detail.slice(0, 90).replace(/\n/g, " "));
    if (out) fs.appendFileSync(out, JSON.stringify(row) + "\n");
  }
  const c = (f) => rows.filter(f).length, run_ = rows.filter((r) => !r.verdict.startsWith("unverified"));
  console.log(`\n${model}: ${c((r) => r.verdict === "pass")}/${run_.length} pass among the ${run_.length} kinds with a toolchain that RUNS; ${c((r) => r.verdict.startsWith("unverified"))} kinds have no toolchain here (structure only: ${c((r) => r.verdict === "unverified-looks-right")} look right, NOT run)`);
}
