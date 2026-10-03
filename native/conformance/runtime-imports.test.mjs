import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
// Only actual statement-position static imports; fixture strings and optional
// dynamic imports (the explicitly retired Matrix archon) are not dependencies.
const imports = /^[ \t]*(?:import|export)\b[^'"`;]*?\bfrom\s*(["'])(\.{1,2}\/[^"'\n]+)\1|^[ \t]*import\s*(["'])(\.{1,2}\/[^"'\n]+)\3/gm;

test("the reader, proxy and coding loop have a closed static production module graph", () => {
  const seen = new Set(), missing = [];
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const m of fs.readFileSync(file, "utf8").matchAll(imports)) {
      const spec = m[2] ?? m[4], target = path.resolve(path.dirname(file), spec);
      if (!fs.existsSync(target)) missing.push(`${path.relative(root, file)} → ${spec}`);
      else if (/\.(?:mjs|js)$/.test(target)) visit(target);
    }
  };
  for (const entry of ["kernel.js", "proxy.mjs", "native/the-fold/code-loop.js", "native/adapters/text/recursive.js"])
    visit(path.join(root, entry));
  assert.ok(seen.size > 50, "the check traverses the real transitive graph");
  assert.deepEqual(missing, []);
});
