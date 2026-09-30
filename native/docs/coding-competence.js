// coding-competence.js — real-data browser dashboard over
// state/lang-competency.jsonl, eoreader7's own coding-competence chase
// ledger. Fetches the ledger live (no snapshot, no fabricated rows) and lets
// the user browse every task's real generation attempts, including the
// actual JavaScript gemma2:2b wrote and whether it passed.

const LEDGER_URL = "/state/lang-competency.jsonl";

// The three configs used by this session's real interactive escalation
// ladder (raw -> free mechanical fix -> bok), as opposed to the older
// offline-harness sweep configs (raw-v3/v4/v5, examples-*, rec-*, samp1-*)
// which never ran the mechanical-fix or bok rungs interactively.
const LADDER_CONFIGS = new Set(["escalate-on-the-fly-v1", "escalate-consistency-v1", "escalate-existing-task-v1"]);

async function loadLedger() {
  const res = await fetch(LEDGER_URL);
  const text = await res.text();
  return text.trim().split("\n").filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function groupByTask(rows) {
  const byTask = new Map();
  for (const r of rows) {
    if (!r.task) continue;
    if (!byTask.has(r.task)) byTask.set(r.task, []);
    byTask.get(r.task).push(r);
  }
  for (const rows of byTask.values()) rows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  return byTask;
}

function summarize(id, rows) {
  const solvedEver = rows.some((r) => r.heldOut === true);
  const ladderRows = rows.filter((r) => LADDER_CONFIGS.has(r.config));
  const ladderSolved = ladderRows.some((r) => r.heldOut === true);
  const ladderTried = ladderRows.length > 0;
  const configs = [...new Set(rows.map((r) => r.config))];
  const withSource = rows.filter((r) => r.source);
  const lastTs = rows.reduce((max, r) => (r.ts && String(r.ts) > max ? String(r.ts) : max), "");
  // Older offline-harness configs (raw/examples/rec-v3..v5, bok-v5, samp1-v5)
  // log an 8-char hex fingerprint of the spec under this same key, not the
  // prose itself -- confirmed live this turn (1849 of 1873 spec-bearing rows
  // match /^[0-9a-f]{8}$/). Skip those rather than display a hash as if it
  // were the task description.
  const specRow = rows.find((r) => r.spec && !/^[0-9a-f]{8}$/.test(r.spec));
  const spec = specRow ? specRow.spec : null;
  return { id, rows, solvedEver, ladderRows, ladderTried, ladderSolved, configs, withSource, lastTs, spec };
}

function rank(s) {
  // Lowest rank sorts first: currently-open real ladder failures lead,
  // since those are the "complex tasks" the ladder hasn't cracked yet.
  if (s.ladderTried && !s.ladderSolved) return 0;
  if (s.ladderTried && s.ladderSolved) return 1;
  if (!s.ladderTried && s.solvedEver) return 2;
  return 3;
}

function badgeFor(s) {
  if (s.ladderTried) return s.ladderSolved ? { cls: "pass", text: "ladder: solved" } : { cls: "fail", text: "ladder: open" };
  if (s.solvedEver) return { cls: "pass", text: "solved (offline sweep)" };
  return { cls: "untried", text: "untried" };
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function renderStats(rows, byTask) {
  const withSource = rows.filter((r) => r.source).length;
  const configs = new Set(rows.map((r) => r.config)).size;
  const ladderTasks = [...byTask.values()].filter((rs) => rs.some((r) => LADDER_CONFIGS.has(r.config)));
  const ladderSolvedCount = ladderTasks.filter((rs) => rs.some((r) => LADDER_CONFIGS.has(r.config) && r.heldOut === true)).length;
  const stats = [
    ["real draws logged", rows.length],
    ["distinct tasks", byTask.size],
    ["distinct configs", configs],
    ["draws with real generated code", withSource],
    ["tasks run through this session's ladder", ladderTasks.length],
    ["ladder-solved / ladder-tried", `${ladderSolvedCount}/${ladderTasks.length}`],
  ];
  document.getElementById("stats").innerHTML = stats.map(([l, n]) => `<div class="stat"><div class="n">${esc(n)}</div><div class="l">${esc(l)}</div></div>`).join("");
}

function renderSidebar(summaries, activeId, onSelect) {
  const sections = [
    { key: 0, label: "open — ladder tried, not solved" },
    { key: 1, label: "solved by this session's ladder" },
    { key: 2, label: "solved (offline sweeps only)" },
    { key: 3, label: "not yet tried by the ladder" },
  ];
  const el = document.getElementById("sidebar");
  el.innerHTML = "";
  for (const sec of sections) {
    const group = summaries.filter((s) => rank(s) === sec.key);
    if (!group.length) continue;
    const label = document.createElement("div");
    label.className = "sec-label";
    label.textContent = `${sec.label} (${group.length})`;
    el.appendChild(label);
    for (const s of group) {
      const b = badgeFor(s);
      const row = document.createElement("div");
      row.className = "task-row" + (s.id === activeId ? " active" : "");
      row.innerHTML = `<span class="id">${esc(s.id)}</span><span class="badge ${b.cls}">${esc(b.text)}</span>`;
      row.addEventListener("click", () => onSelect(s.id));
      el.appendChild(row);
    }
  }
}

function renderDetail(s) {
  const el = document.getElementById("detail");
  if (!s) { el.innerHTML = `<div class="empty">select a task</div>`; return; }
  const drawsWithSource = s.rows.filter((r) => r.source);
  const parts = [];
  parts.push(`<h2>${esc(s.id)}</h2>`);
  if (s.spec) parts.push(`<div class="spec">${esc(s.spec)}</div>`);
  parts.push(`<div class="spec">configs seen: ${s.configs.map(esc).join(", ")} · ${s.rows.length} real draw(s) total, ${drawsWithSource.length} with generated code captured</div>`);
  if (!drawsWithSource.length) {
    parts.push(`<div class="empty">No draw for this task captured its generated source in the ledger (older offline-sweep configs logged pass/fail only). Aggregate result: ${s.solvedEver ? "solved at least once" : "never solved"}.</div>`);
  } else {
    for (const r of drawsWithSource.slice().reverse()) {
      const passed = r.heldOut === true;
      const openAttr = r === drawsWithSource[drawsWithSource.length - 1] ? " open" : "";
      parts.push(`<details class="draw"${openAttr}>
        <summary>
          <span class="badge ${passed ? "pass" : "fail"}">${passed ? "held-out: pass" : "held-out: fail"}</span>
          <span class="config">${esc(r.config)} · arm=${esc(r.arm)}${r.rep ? " · rep=" + esc(r.rep) : ""}</span>
          <span class="config">floorOk=${String(r.floorOk)} callOk=${String(r.callOk)}${r.mechanicalFix ? " · mechanical rename applied" : ""}</span>
          <span class="config">${esc(r.ts)}</span>
        </summary>
        <pre>${esc(r.source)}</pre>
      </details>`);
    }
  }
  el.innerHTML = parts.join("\n");
}

async function main() {
  let rows;
  try {
    rows = await loadLedger();
  } catch (e) {
    document.getElementById("sidebar").innerHTML = `<div class="empty">could not load state/lang-competency.jsonl: ${esc(e.message)}</div>`;
    return;
  }
  const byTask = groupByTask(rows);
  const summaries = [...byTask.entries()].map(([id, rs]) => summarize(id, rs));
  summaries.sort((a, b) => rank(a) - rank(b) || b.lastTs.localeCompare(a.lastTs));

  renderStats(rows, byTask);

  let activeId = summaries.length ? summaries[0].id : null;
  function select(id) {
    activeId = id;
    renderSidebar(summaries, activeId, select);
    renderDetail(summaries.find((s) => s.id === id));
  }
  select(activeId);
}

main();
