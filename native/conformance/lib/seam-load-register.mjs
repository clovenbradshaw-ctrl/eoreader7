// conformance/lib/seam-load-register.mjs — `node --import` target for seam-browser-safe.test.mjs. It does two things before anything else loads:
//   1. installs seam-load-hooks.mjs, which records every built-in and bare package the real resolver is asked for;
//   2. takes `process` away from module code, because a browser has none — organs/grounding.js and kernel/self.js gate their canon-ground import
//      on `typeof process !== "undefined"`, and that gate is only honest if the test can see it close. A module that touches `process` unguarded
//      at load now throws ReferenceError here exactly as it would in the page.
// `Buffer` is deliberately left in place. A browser has no `Buffer` either, but node's own lazily-loaded web globals (`fetch` and its kin — which a
// browser DOES have) read it when first touched, so removing it turned a browser-safe `typeof fetch` at load into a crash in the harness (found by
// running the guard against the unmodified seam, where it hid the offenders behind an undici stack). No module in native/ gates on `typeof Buffer`;
// the cost is that one that reads `Buffer` unguarded at load is not caught here.
// (Node's own loader keeps its internal references; only the global binding module code sees is removed.)
import { register } from "node:module";

register("./seam-load-hooks.mjs", import.meta.url);
delete globalThis.process;
