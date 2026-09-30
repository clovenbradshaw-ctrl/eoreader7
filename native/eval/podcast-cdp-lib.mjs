// podcast-cdp-lib.mjs — the ONE real CDP extraction, shared. Both
// podcast-visual-hierarchy-read.mjs and podcast-visual-pathos-read.mjs grew
// their own copy of this before this file existed; the repair loop is a
// THIRD caller, and a third copy is exactly the drift class this repo's own
// postmortems keep catching (P22, P24, P39) — factored out here instead.
// Deliberately does not replace the two existing callers' own inline copies
// in this pass (they are already committed and tested); a future pass can
// point them here without behavior change.

export async function cdpSession(cdpUrl) {
  const page = await (await fetch(`${cdpUrl}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params = {}) => new Promise((resolve) => {
    const myId = ++id;
    pending.set(myId, resolve);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  await send("Page.enable");
  await send("Runtime.enable");
  return { send, close: () => ws.close() };
}

const EXTRACT_EXPR = `(() => {
  const parseRgb = (s) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(s);
    if (!m) return [255, 255, 255];
    return m[1].split(",").slice(0, 3).map((n) => parseFloat(n));
  };
  const els = [];
  let n = 0;
  for (const el of document.querySelectorAll("h1, h3, p, button, input, .ethos-badge")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cs = getComputedStyle(el);
    n += 1;
    els.push({
      id: el.tagName.toLowerCase() + "-" + n,
      tag: el.tagName.toLowerCase(),
      className: el.className || null,
      // the DECLARED selector this element is actually reachable through in
      // the style anchor's own source — never guessed from tag alone, since
      // .episode h3 / .episode p are NOT the same rule as a bare h3/p.
      selector: el.tagName.toLowerCase() === "button" ? "button"
        : el.tagName.toLowerCase() === "input" ? 'input[type="text"]'
        : (el.className && el.className.includes("ethos-badge")) ? ".ethos-badge"
        : el.closest(".episode") && el.tagName.toLowerCase() === "h3" ? ".episode h3"
        : el.closest(".episode") && el.tagName.toLowerCase() === "p" ? ".episode p"
        : el.tagName.toLowerCase(),
      fontSizePx: parseFloat(cs.fontSize),
      bold: parseInt(cs.fontWeight, 10) >= 600,
      color: parseRgb(cs.color),
      backgroundColor: parseRgb(cs.backgroundColor === "rgba(0, 0, 0, 0)" ? getComputedStyle(document.body).backgroundColor : cs.backgroundColor),
      areaPx: rect.width * rect.height,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
    });
  }
  return JSON.stringify(els);
})()`;

/**
 * extractElements({ appUrl, cdpUrl, feedUrl }) — navigates, subscribes,
 * extracts real computed styles/rects. Real DOM reading, never a guess
 * from source text.
 */
export async function extractElements({ appUrl, cdpUrl, feedUrl }) {
  const { send, close } = await cdpSession(cdpUrl);
  await send("Page.navigate", { url: appUrl });
  await new Promise((r) => setTimeout(r, 500));
  await send("Runtime.evaluate", { expression: `document.querySelector("input[type=text]").value = ${JSON.stringify(feedUrl)}` });
  await send("Runtime.evaluate", { expression: "subscribe()" });
  await new Promise((r) => setTimeout(r, 3000));
  const result = await send("Runtime.evaluate", { expression: EXTRACT_EXPR, returnByValue: true });
  const elements = JSON.parse(result.result.result.value);
  close();
  return elements;
}
