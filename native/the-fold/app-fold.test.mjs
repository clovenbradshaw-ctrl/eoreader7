import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openFold, verify, project } from "./app-fold.mjs";

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fold-")), "fold.jsonl");

test("a landed leaf is a passing check; an open one stays open until it lands; the past is kept", () => {
  const f = openFold(tmp());
  f.append("propose", { needs: [{ need: "weather" }] });
  f.append("land", { leaf: "a", code: "function a(){}", by: "m" });
  f.append("open", { leaf: "b", failures: ["x"] });
  let p = project(f.entries(), null, ["a", "b", "c"]);
  assert.deepEqual([p.passing, p.total, Object.keys(p.open)], [1, 3, ["b"]]);
  f.append("land", { leaf: "b", code: "function b(){}" });
  f.append("supersede", { leaf: "a", code: "function a(){return 1}" });
  p = project(f.entries(), null, ["a", "b", "c"]);
  assert.deepEqual([p.passing, Object.keys(p.open)], [2, []]);
  assert.equal(p.landed.a.code, "function a(){return 1}", "the superseding entry is the current one");
  assert.equal(f.entries().filter((e) => e.leaf === "a").length, 2, "the old entry is still in the log");
});

test("the projection at an earlier cursor is the fold as it stood then", () => {
  const f = openFold(tmp());
  f.append("land", { leaf: "a", code: "1" }); f.append("land", { leaf: "b", code: "2" });
  assert.equal(project(f.entries(), 0, ["a", "b"]).passing, 1);
  assert.equal(project(f.entries(), 1, ["a", "b"]).passing, 2);
});

test("a later failed retry never reopens a leaf that has landed", () => {
  const f = openFold(tmp());
  f.append("land", { leaf: "a", code: "1" }); f.append("open", { leaf: "a", failures: ["retry failed"] });
  const p = project(f.entries(), null, ["a"]);
  assert.deepEqual([p.passing, Object.keys(p.open)], [1, []]);
});

test("CONTROL built to fail: an edited or removed line breaks the chain and says where", () => {
  const file = tmp(), f = openFold(file);
  f.append("land", { leaf: "a", code: "1" }); f.append("land", { leaf: "b", code: "2" }); f.append("land", { leaf: "c", code: "3" });
  assert.equal(verify(f.entries()).ok, true);
  const lines = fs.readFileSync(file, "utf8").trim().split("\n"), edited = JSON.parse(lines[1]); edited.code = "TAMPERED";
  lines[1] = JSON.stringify(edited); fs.writeFileSync(file, lines.join("\n") + "\n");
  assert.deepEqual(verify(f.entries()), { ok: false, brokenAt: 1 });
  fs.writeFileSync(file, [lines[0], lines[2]].join("\n") + "\n");
  assert.equal(verify(f.entries()).ok, false, "a removed entry is a hole");
  assert.throws(() => f.append("bogus", {}), /unknown fold entry kind/);
});
