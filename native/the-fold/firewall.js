// firewall.js — SHIM (2026-09-28). The real organ lives at
// native/organs/firewall.js and is exported through the project's own
// index.js seam (native/organs/index.js:133-134). This file was a
// byte-for-byte, same-repo duplicate of that organ — confirmed via `diff`
// before this change, not assumed — with exactly two real importers
// (tests/turn-standing.test.mjs, native/the-fold/resolutions.js), neither
// of which needs anything this copy had that organs/firewall.js lacks.
// Kept as a shim rather than deleted so both importers keep resolving
// without an edit; new code should import native/organs/firewall.js (or
// the index.js seam) directly, never this path.
export * from "../organs/firewall.js";
