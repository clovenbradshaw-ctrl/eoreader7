// conformance/lib/seam-load-hooks.mjs — a module-resolution hook that RECORDS every node built-in and every bare package a module graph asks
// the resolver for while it loads. It answers normally, so the graph keeps loading and every offender is found in one run.
// Used by seam-browser-safe.test.mjs, in a child process, to read what a browser would refuse — from the real resolver, not a regex over source.
import fs from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  const builtin = resolved.url.startsWith("node:");
  const bare = !builtin && !/^(\.|\/|file:|data:|https?:)/.test(specifier);
  if ((builtin || bare) && context.parentURL && process.env.SEAM_LOG) {
    fs.appendFileSync(process.env.SEAM_LOG, `${JSON.stringify({ specifier, kind: builtin ? "builtin" : "package", parent: context.parentURL })}\n`);
  }
  return resolved;
}
