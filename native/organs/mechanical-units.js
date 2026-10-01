// native/organs/mechanical-units.js — the a priori code units (Kant, 2026-10-01,
// GL-BD-12): logic is the understanding's own contribution, never the mouth's.
//
// A unit whose logic is derivable from its own name/spec is a CATEGORY — the box
// computes it, deterministically, 0 draws. The mouth draws only the residue no
// category covers (novel names, novel paraphrase, judgment under uncertainty,
// prose). Asking an empirical faculty to legislate is how dialectical illusion
// is manufactured: the small mouth produced "necessarily-looking" logic for
// toCamelCase/toSnakeCase that failed 4/10 golden pairs (measured 2026-10-01).
// The gate is the bow still — a box-computed body must pass the same testCommand
// a drawn one would; if a category's own body fails its shape's golden cases,
// the category is wrong, and that is the finding (never a retry).
//
// PURE: no imports, no model, no DOM. Each shape is a closed form — the a priori
// list is CLOSED by construction; a name no category owns routes to the mouth.
// Selftest: node --input-type=module -e "import('./mechanical-units.js').then(m=>m.selftest())"

/** Each category: the canonical names it answers to, and the deterministic body
 *  it computes for the unit (the name IS the spec — the name legislates). */
const SHAPES = [
  {
    names: new Set(["clamp"]),
    body: () => `function clamp(n, lo, hi) {\n  return Math.max(lo, Math.min(hi, n));\n}`,
  },
  {
    names: new Set(["lerp", "interpolate"]),
    body: () => `function lerp(a, b, t) {\n  return (1 - t) * a + t * b;\n}`,
  },
  {
    names: new Set(["tocamelcase"]),
    body: () => `function toCamelCase(str) {\n  const s = String(str ?? "");\n  const sep = /[^a-zA-Z0-9]+/;\n  if (!sep.test(s)) return s.charAt(0).toLowerCase() + s.slice(1);\n  const words = s.split(sep).filter(Boolean);\n  return words.map((w, i) => {\n    const lower = w.toLowerCase();\n    return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);\n  }).join("");\n}`,
  },
  {
    names: new Set(["tosnakecase"]),
    body: () => `function toSnakeCase(str) {\n  return String(str ?? "")\n    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")\n    .replace(/[\\s\\-]+/g, "_")\n    .toLowerCase();\n}`,
  },
  {
    names: new Set(["tokebabcase"]),
    body: () => `function toKebabCase(str) {\n  return String(str ?? "")\n    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")\n    .replace(/[\\s_]+/g, "-")\n    .toLowerCase();\n}`,
  },
  {
    names: new Set(["totitlecase"]),
    body: () => `function toTitleCase(str) {\n  return String(str ?? "").split(/[^a-zA-Z0-9]+/).filter(Boolean)\n    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())\n    .join(" ");\n}`,
  },
  {
    names: new Set(["slugify", "slug"]),
    body: () => `function slugify(str) {\n  return String(str ?? "").trim().toLowerCase()\n    .replace(/[^a-z0-9]+/g, "-")\n    .replace(/^-+|-+$/g, "");\n}`,
  },
  {
    names: new Set(["countwords", "wordcount"]),
    body: () => `function countWords(str) {\n  return String(str ?? "").match(/\\S+/g)?.length ?? 0;\n}`,
  },
  {
    names: new Set(["capitalize"]),
    body: () => `function capitalize(str) {\n  const s = String(str ?? "");\n  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();\n}`,
  },
  {
    names: new Set(["pluralize"]),
    body: () => `function pluralize(word, count) {\n  const w = String(word ?? "");\n  return Number(count) === 1 ? w : w + "s";\n}`,
  },
  {
    names: new Set(["formatbytes"]),
    body: () => `function formatBytes(n) {\n  const units = ["B", "KB", "MB", "GB", "TB"];\n  let v = Number(n) || 0, i = 0;\n  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }\n  return v.toFixed(i ? 1 : 0) + " " + units[i];\n}`,
  },
  {
    names: new Set(["padstart"]),
    body: () => `function padStart(str, len, ch) {\n  return String(str ?? "").padStart(len, ch ?? " ");\n}`,
  },
  {
    names: new Set(["padend"]),
    body: () => `function padEnd(str, len, ch) {\n  return String(str ?? "").padEnd(len, ch ?? " ");\n}`,
  },
  {
    names: new Set(["fmtduration", "duration"]),
    body: () => `function fmtDuration(ms) {\n  const s = Math.round((Number(ms) || 0) / 1000);\n  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;\n  return h ? h + "h " + m + "m" : m ? m + "m " + sec + "s" : sec + "s";\n}`,
  },
];

const BY_NAME = new Map();
for (const shape of SHAPES) for (const n of shape.names) BY_NAME.set(n, shape);

/** The category the unit's name legislates — { ok, shape, body } or { ok:false }.
 *  The name is the a priori form; an unowned name is the open residue. */
export function mechanicalUnitBody(name) {
  const key = String(name ?? "").toLowerCase();
  const shape = BY_NAME.get(key);
  if (!shape) return { ok: false };
  return { ok: true, shape: [...shape.names][0], body: shape.body() };
}

/** The closed set of categories the box owns (the a priori list — disclosed). */
export const mechanicalShapes = () => [...new Set(SHAPES.flatMap((s) => [...s.names]))];

export function selftest() {
  const t = (n, c) => { if (!c) { console.error("FAIL", n); process.exitCode = 1; } else console.log("ok", n); };
  t("clamp is a category", mechanicalUnitBody("clamp").ok && mechanicalUnitBody("clamp").body.includes("Math.max"));
  t("toCamelCase is a category", mechanicalUnitBody("toCamelCase").ok);
  t("debounce is NOT a category (the residue is open)", !mechanicalUnitBody("debounce").ok);
  t("unknown name is null, never a guess", !mechanicalUnitBody("computeSchedule").ok);
  // the categories compute correctly — each shape passes its own golden cases
  const run = (name, calls) => {
    const b = mechanicalUnitBody(name).body;
    const f = new Function(b + "\nreturn " + name + ";")();
    return calls.map(([args, want]) => [JSON.stringify(args), f(...args), want]);
  };
  for (const [label, name, calls] of [
    ["toCamelCase", "toCamelCase", [[["hello world"], "helloWorld"], [["snake_case_text"], "snakeCaseText"], [["foo-bar-baz"], "fooBarBaz"], [["alreadyCamel"], "alreadyCamel"], [[""], ""]]],
    ["toSnakeCase", "toSnakeCase", [[["helloWorld"], "hello_world"], [["fooBarBaz"], "foo_bar_baz"], [["hello world"], "hello_world"], [["already_snake"], "already_snake"], [[""], ""]]],
    ["toKebabCase", "toKebabCase", [[["fooBarBaz"], "foo-bar-baz"], [["hello world"], "hello-world"]]],
    ["clamp", "clamp", [[[5, 0, 10], 5], [[-3, 0, 10], 0], [[42, 0, 10], 10]]],
    ["lerp", "lerp", [[[0, 10, 0.5], 5], [[2, 8, 0], 2], [[2, 8, 1], 8]]],
    ["slugify", "slugify", [[["Hello, World!"], "hello-world"], [["  foo  bar  "], "foo-bar"]]],
    ["countWords", "countWords", [[["hello world"], 2], [[""], 0]]],
    ["capitalize", "capitalize", [[["hELLO"], "Hello"], [[""], ""]]],
    ["pluralize", "pluralize", [[["cat", 1], "cat"], [["cat", 2], "cats"]]],
    ["toTitleCase", "toTitleCase", [[["hello world"], "Hello World"]]],
  ]) {
    const fails = run(name, calls).filter(([, got, want]) => got !== want);
    if (fails.length) { console.error("FAIL", label, fails.map(([args, got, want]) => `${name}${args} = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`).join("; ")); process.exitCode = 1; }
    else console.log("ok", label, `${calls.length} golden cases`);
  }
  const names = mechanicalShapes();
  t("the closed list is distinct and named", names.length === new Set(names).size && names.every((n) => /^[a-z]+$/.test(n)));
}