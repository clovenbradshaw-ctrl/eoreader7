// A hand-written reference solution: proves the EVA ground (engine.test.js)
// is satisfiable. Never shown to the mouth, never scored as an arm.
export function tokenize(src) {
  const isDigit = (c) => c >= "0" && c <= "9";
  const isAlpha = (c) => (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
  const OPS = new Set(["+", "-", "*", "/", "^", ":", ",", "(", ")"]);
  const out = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (isDigit(c) || (c === "." && isDigit(src[i + 1] ?? ""))) { let j = i; while (j < src.length && (isDigit(src[j]) || src[j] === ".")) j++; out.push({ type: "number", value: Number(src.slice(i, j)) }); i = j; continue; }
    if (isAlpha(c)) {
      let j = i; while (j < src.length && isAlpha(src[j])) j++;
      let k = j; while (k < src.length && isDigit(src[k])) k++;
      if (k > j) { out.push({ type: "ref", value: src.slice(i, k).toUpperCase() }); i = k; continue; }
      out.push({ type: "name", value: src.slice(i, j).toUpperCase() }); i = j; continue;
    }
    if (OPS.has(c)) { out.push({ type: "op", value: c }); i++; continue; }
    throw new Error(`unknown character: ${c}`);
  }
  return out;
}

export function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v) => peek() && peek().type === "op" && peek().value === v;
  const expect = (v) => { if (!isOp(v)) throw new Error(`expected ${v}`); p++; };
  const atom = () => {
    const t = peek(); if (!t) throw new Error("unexpected end");
    if (t.type === "number") { p++; return { type: "num", value: t.value }; }
    if (t.type === "ref") { p++; if (isOp(":")) { p++; const to = peek(); if (!to || to.type !== "ref") throw new Error("bad range"); p++; return { type: "range", from: t.value, to: to.value }; } return { type: "ref", ref: t.value }; }
    if (t.type === "name") { p++; expect("("); const args = []; if (!isOp(")")) { args.push(expr()); while (isOp(",")) { p++; args.push(expr()); } } expect(")"); return { type: "call", name: t.value, args }; }
    if (isOp("(")) { p++; const e = expr(); expect(")"); return e; }
    throw new Error(`unexpected token ${t.value}`);
  };
  const unary = () => { if (isOp("-")) { p++; return { type: "neg", expr: unary() }; } return atom(); };
  const power = () => { const left = unary(); if (isOp("^")) { p++; return { type: "bin", op: "^", left, right: power() }; } return left; };
  const term = () => { let left = power(); while (isOp("*") || isOp("/")) { const op = peek().value; p++; left = { type: "bin", op, left, right: power() }; } return left; };
  const expr = () => { let left = term(); while (isOp("+") || isOp("-")) { const op = peek().value; p++; left = { type: "bin", op, left, right: term() }; } return left; };
  const e = expr();
  if (p < tokens.length) throw new Error(`unexpected token ${tokens[p].value}`);
  return e;
}

export function parseRef(ref) {
  const isUpper = (c) => c >= "A" && c <= "Z", isDigit = (c) => c >= "0" && c <= "9";
  let i = 0; let col = 0;
  while (i < ref.length && isUpper(ref[i])) { col = col * 26 + (ref.charCodeAt(i) - 64); i++; }
  if (i === 0 || i >= ref.length) throw new Error(`bad reference: ${ref}`);
  let row = 0; while (i < ref.length) { if (!isDigit(ref[i])) throw new Error(`bad reference: ${ref}`); row = row * 10 + Number(ref[i]); i++; }
  if (row < 1) throw new Error(`bad reference: ${ref}`);
  return { col: col - 1, row: row - 1 };
}
export function expandRange(from, to) {
  const colName = (c) => { let n = c + 1, s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const a = parseRef(from), b = parseRef(to);
  const out = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) out.push(`${colName(c)}${r + 1}`);
  return out;
}

export function evaluate(node, lookup, fns) {
  switch (node.type) {
    case "num": return node.value;
    case "ref": return lookup(node.ref);
    case "range": return expandRange(node.from, node.to).map(lookup);
    case "neg": return -evaluate(node.expr, lookup, fns);
    case "bin": {
      const a = evaluate(node.left, lookup, fns), b = evaluate(node.right, lookup, fns);
      if (node.op === "+") return a + b; if (node.op === "-") return a - b; if (node.op === "*") return a * b;
      if (node.op === "/") { if (b === 0) throw new Error("division by zero"); return a / b; }
      return a ** b;
    }
    case "call": {
      const f = fns[node.name]; if (typeof f !== "function") throw new Error(`unknown function ${node.name}`);
      return f(...node.args.flatMap((x) => { const v = evaluate(x, lookup, fns); return Array.isArray(v) ? v : [v]; }));
    }
    default: throw new Error(`bad node ${node.type}`);
  }
}

export function dependencies(formula) {
  const walk = (n, out) => { if (n.type === "ref") { if (!out.includes(n.ref)) out.push(n.ref); } else if (n.type === "range") { for (const r of expandRange(n.from, n.to)) if (!out.includes(r)) out.push(r); } else if (n.type === "neg") walk(n.expr, out); else if (n.type === "bin") { walk(n.left, out); walk(n.right, out); } else if (n.type === "call") for (const a of n.args) walk(a, out); };
  if (!String(formula).startsWith("=")) return [];
  const out = []; walk(parse(tokenize(formula.slice(1))), out); return out;
}

export function evaluationOrder(cells) {
  const keys = Object.keys(cells); const deps = new Map(keys.map((k) => [k, dependencies(cells[k]).filter((d) => d in cells)]));
  const state = new Map(); const out = []; const stack = [];
  const visit = (k) => {
    if (state.get(k) === 2) return;
    if (state.get(k) === 1) { const at = stack.indexOf(k); throw new Error(`cycle: ${[...stack.slice(at), k].join(" -> ")}`); }
    state.set(k, 1); stack.push(k);
    for (const d of deps.get(k)) visit(d);
    stack.pop(); state.set(k, 2); out.push(k);
  };
  for (const k of keys) visit(k);
  return out;
}

export function computeGrid(cells, fns) {
  fns = fns ?? { SUM: (...xs) => xs.reduce((a, b) => a + b, 0), MIN: (...xs) => Math.min(...xs), MAX: (...xs) => Math.max(...xs), AVG: (...xs) => xs.reduce((a, b) => a + b, 0) / xs.length, IF: (c, a, b) => (c !== 0 ? a : b) };
  const values = {};
  const lookup = (r) => { const v = values[r]; return typeof v === "number" ? v : 0; };
  for (const k of evaluationOrder(cells)) {
    const text = String(cells[k]);
    if (text.startsWith("=")) values[k] = evaluate(parse(tokenize(text.slice(1))), lookup, fns);
    else { const n = Number(text); values[k] = text.trim() !== "" && Number.isFinite(n) ? n : text; }
  }
  return values;
}

export function formatGrid(values) {
  const fmt = (v) => (typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v));
  const colName = (c) => { let n = c + 1, s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const refs = Object.keys(values).map((k) => ({ k, ...parseRef(k) }));
  const cols = [...new Set(refs.map((r) => r.col))].sort((a, b) => a - b);
  const rows = [...new Set(refs.map((r) => r.row))].sort((a, b) => a - b);
  const table = [["", ...cols.map(colName)], ...rows.map((r) => [String(r + 1), ...cols.map((c) => { const hit = refs.find((x) => x.row === r && x.col === c); return hit ? fmt(values[hit.k]) : ""; })])];
  const widths = table[0].map((_, i) => Math.max(...table.map((row) => row[i].length)));
  return table.map((row) => row.map((cell, i) => cell.padStart(widths[i])).join(" ").trimEnd()).join("\n");
}
