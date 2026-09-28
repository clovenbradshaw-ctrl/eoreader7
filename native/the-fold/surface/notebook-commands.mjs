// notebook-commands.mjs — the / commands of the notebook bar. PURE: a line in, an op (or a typed refusal) out.
// Anything without a leading slash is python — type code, press Enter, it becomes a cell and runs.
export const COMMANDS = Object.freeze([
  ["/py [code]", "add a python cell (and run it)"],
  ["/js [code]", "add a javascript cell (and run it)"],
  ["/md [text]", "add a markdown note"],
  ["/claim [text]", "add a claim — a bench card; it reads only as wide as what is checked"],
  ["/check <claim> [code]", "add a python CHECK cell bound to a claim; it must print its own #scope and #result (scope_*(), result())"],
  ["/control <claim> [code]", "add a CONTROL: a check that should fail — a check nobody has seen fail proves only that it runs"],
  ["/run <cell|all|stale>", "run one cell, every cell, or the cells whose code or data changed"],
  ["/ingest <path>", "read any file (pdf docx xlsx pptx csv ipynb image …) into the notebook; gaps are shown, never hidden"],
  ["/data", "list what has been ingested, with each reader's gaps"],
  ["/tools", "list the python packages and er7 helpers a cell can use"],
  ["/promote <claim> <status> [evidence]", "move a claim up (conjectured, computed_in_range, proved) — by you, never a model"],
  ["/export", "download this notebook as .ipynb"],
  ["/help", "this list"],
]);
const WORD = /^\/(\w+)\s*(.*)$/s;
export function parseCommand(line) {
  const t = String(line ?? "").trim();
  if (!t) return { error: "empty" };
  if (!t.startsWith("/")) return { op: "add", type: "code", lang: "python", source: t, run: true };
  const m = t.match(WORD); if (!m) return { error: "a command is /word — try /help" };
  const [, w, rest] = m;
  const code = (lang) => ({ op: "add", type: "code", lang, source: rest, run: true, needs: rest ? null : "code" });
  switch (w) {
    case "py": return code("python");
    case "js": return code("js");
    case "md": return { op: "add", type: "markdown", source: rest };
    case "claim": return { op: "add", type: "claim", source: rest };
    case "check": case "control": { const [card, ...c] = rest.split(/\s+/); const body = rest.slice(rest.indexOf(card) + card.length).trim(); return card ? { op: "add", type: "code", lang: "python", source: body, for: card, role: w, run: true } : { error: `/${w} <claim id> [code]` }; }
    case "run": return rest ? { op: "runmany", which: rest.trim() } : { error: "/run <cell id | all | stale>" };
    case "ingest": return rest ? { op: "ingest", path: rest.trim() } : { error: "/ingest <path to a file>" };
    case "data": return { op: "data" };
    case "tools": case "pip": return { op: "tools" };
    case "promote": { const [card, to, ...ev] = rest.split(/\s+/); return card && to ? { op: "promote", card, to, evidence: ev.join(" ") || null } : { error: "/promote <claim id> <conjectured|computed_in_range|proved> [evidence]" }; }
    case "export": return { op: "export" };
    case "help": case "?": return { op: "help" };
    case "rm": case "delete": return { error: "the log is append-only — nothing is deleted. Edit a cell (the old source stays) or add a new claim (the old one stays)." };
    default: return { error: `no command /${w} — /help lists them` };
  }
}
