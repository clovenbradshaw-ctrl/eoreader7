// eval/the-fold/lib/sympy-math-oracle.mjs — SHIM. The sympy-only oracle was
// generalized (2026-09-11) into lib/pyodide-oracle.mjs: the same pyodide
// boot, one verdict vocabulary, five engines (sympy, scipy, numpy, networkx,
// code execution). This file forwards so a stale importer keeps resolving;
// new code imports lib/pyodide-oracle.mjs, never this file.
export * from "./pyodide-oracle.mjs";