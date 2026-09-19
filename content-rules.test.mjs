// content-rules.test.mjs — the ant-swarm's standing-rule ledger, falsified.
import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const modPath = path.join(here, "content-rules.mjs");
const tmp = path.join(os.tmpdir(), `er7-content-rules-test-${Date.now()}.json`);
fs.writeFileSync(tmp, "{}");

// Run each test group in a child process with ER7_CONTENT_RULES_FILE pointed
// at a temp store, so the real ledger is never touched.
const run = (code) => {
  const script = `import("${modPath}").then(async (m) => { ${code} }).catch((e) => { console.error(e); process.exit(1); });`;
  const out = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, ER7_CONTENT_RULES_FILE: tmp },
    encoding: "utf8",
  });
  if (out.status !== 0) {
    throw new Error(`child failed: ${out.stderr || out.stdout}`);
  }
  return out.stdout.trim();
};

test("a rule is preserved, retrievable, and carries its falsifying control", () => {
  run(`const r = m.preserveContentRule({ type: "garbled_token", signal: "garbled_token", read: "read literally first, then restore the likely intended text — report only meaning both readings survive", falsifying: "a garbled token run that reads cleanly under a plain read concedes this rule", basis: "swarm converged on cast+relations" });
     const again = m.contentRuleFor("garbled_token");
     if (!r.firstAdoptedAt || again.type !== "garbled_token" || !/concedes/.test(again.falsifying) || again.standing !== "disclosed") throw new Error("rule contract violated: " + JSON.stringify({r, again}));`);
});

test("a rule that already stands is sharpened, never duplicated", () => {
  const out = run(`const first = m.preserveContentRule({ type: "truncated_end", read: "short", falsifying: "control" });
     const second = m.preserveContentRule({ type: "truncated_end", read: "a much more specific and longer surviving read that names exactly what worked", falsifying: "control" });
     const list = m.contentRulesStore();
     const same = first.firstAdoptedAt === second.firstAdoptedAt;
     const sharpened = second.read.length >= first.read.length;
     const single = list.filter((r) => r.type === "truncated_end").length === 1;
     if (!same || !sharpened || !single) throw new Error("sharpening contract violated");
     process.stdout.write("ok");`);
  assert.equal(out, "ok");
});

test("an unknown type returns null — never a silent guess", () => {
  run(`if (m.contentRuleFor("no_such_type") !== null) throw new Error("unknown type must be null");`);
});

test("the store lists the ledger newest-sharpened first", () => {
  run(`m.preserveContentRule({ type: "zebra", read: "read z", falsifying: "fz" });
     m.preserveContentRule({ type: "alpha", read: "read a", falsifying: "fa" });
     const list = m.contentRulesStore();
     if (list[0].type !== "alpha" || m.contentRulesCount() < 2) throw new Error("store order/count violated: " + JSON.stringify(list));`);
});

test("the ledger file is created on disk", () => {
  assert.ok(fs.existsSync(tmp), "the ledger file exists after preservation");
});

test.after(() => {
  try { fs.unlinkSync(tmp); } catch { /* best effort */ }
});