import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCode, templateLiteralAssignments } from "./podcast-app-codegen.mjs";

test("checkCode: a genuinely raw, unescaped episode.title in innerHTML is caught", () => {
  const html = "x.innerHTML = `<h3>${episode.title}</h3>`;";
  const c = checkCode(html);
  assert.ok(c.findings.some((f) => f.includes("escapeHtml")));
});

test("checkCode: episode.title wrapped in escapeHtml(...) is NOT flagged — the referents-vs-spans fix", () => {
  // FOUND LIVE (2026-09-30): the first cut of this check pattern-matched
  // the raw text of the interpolation for ".title", so it could not tell
  // ${episode.title} (dangerous) apart from ${escapeHtml(episode.title)}
  // (already safe) — a real, isolated, code-anchor-log-driven model call
  // produced exactly this correct code and it was wrongly flagged. This
  // pins the fix: a span is judged by what referent actually mediates it,
  // not by its own bare text.
  const html = 'x.innerHTML = `<h3>${escapeHtml(episode.title)}</h3><p>${escapeHtml(episode.pubDate)}</p>`;';
  const c = checkCode(html);
  assert.deepEqual(c.findings.filter((f) => f.includes("escapeHtml")), []);
});

test("checkCode: episode.ethos used only in a strict comparison is never flagged", () => {
  const html = 'x.innerHTML = `<span style="background: ${episode.ethos === "pass" ? "green" : episode.ethos === "conflict" ? "red" : "gray"}"></span>`;';
  const c = checkCode(html);
  assert.deepEqual(c.findings.filter((f) => f.includes("escapeHtml")), []);
});

test("checkCode: a partial fix (title wrapped, pubDate still raw) is still caught", () => {
  const html = "x.innerHTML = `<h3>${escapeHtml(episode.title)}</h3><p>${episode.pubDate}</p>`;";
  const c = checkCode(html);
  assert.ok(c.findings.some((f) => f.includes("escapeHtml") && f.includes("pubDate")));
});

test("checkCode: markup literally assigned to .textContent is caught (the round-15-shaped regression)", () => {
  const html = "el.textContent = `<h3>${episode.title}</h3><audio src=\"x\"></audio>`;";
  const c = checkCode(html);
  assert.ok(c.findings.some((f) => f.includes("textContent")));
});

test("checkCode: a plain string assigned to .textContent is never flagged", () => {
  const html = "el.textContent = `Error: ${error.message}`;";
  const c = checkCode(html);
  assert.deepEqual(c.findings.filter((f) => f.includes("textContent")), []);
});

test("checkCode: a complete, correct app (real code-anchor-log output shape) has zero issues", () => {
  const html = `<!DOCTYPE html><html><head><style>body{}</style></head><body>
    <input type="text" /><button onclick="subscribe()">Go</button>
    <div id="episodes"></div>
    <script>
      function escapeHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
      function renderEpisodes(episodes) {
        const c = document.getElementById("episodes");
        episodes.forEach(episode => {
          const div = document.createElement("div");
          div.innerHTML = \`<h3>\${escapeHtml(episode.title)}</h3><p>\${escapeHtml(episode.pubDate)}</p><span style="background: \${episode.ethos === "pass" ? "green" : "red"}"></span><audio controls src="\${episode.audioUrl}"></audio>\`;
          c.appendChild(div);
        });
      }
      function subscribe() {
        fetch(\`/api/subscribe?url=\${encodeURIComponent(document.querySelector("input").value)}\`)
          .then(r => r.json()).then(d => renderEpisodes(d.episodes));
      }
    </script>
  </body></html>`;
  const c = checkCode(html);
  assert.deepEqual(c.findings, []);
  assert.equal(c.issues, 0);
});

test("templateLiteralAssignments: extracts a block that itself contains nested ${...{...}...} without stopping at an inner brace", () => {
  const html = 'x.innerHTML = `<span>${a ? `${b}` : c}</span>`;';
  const blocks = templateLiteralAssignments(html, "innerHTML");
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].includes("<span>"));
  assert.ok(blocks[0].endsWith("`"));
});

test("templateLiteralAssignments: finds multiple independent assignments of the same property", () => {
  const html = "a.innerHTML = `<p>1</p>`; b.innerHTML = `<p>2</p>`;";
  const blocks = templateLiteralAssignments(html, "innerHTML");
  assert.equal(blocks.length, 2);
});
