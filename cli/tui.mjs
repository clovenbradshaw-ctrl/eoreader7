// tui.mjs — the interactive terminal UI, kept deliberately simple. Multiple
// tabbed conversations in one running process, each either "grounded chat"
// or "coding agent" — both server-side, over the SAME proxy.mjs every caller
// of this instrument uses. This file is a thin client: it holds no
// model-calling or tool-execution logic of its own. Built with Ink (React
// for the terminal).
//
// The RICH stuff (the facing page — sources · response · notes — markdown,
// copy, clickable cross-links) lives in the browser version:
// `eoreader7 -browser`. The terminal stays simple on purpose.
//
// No JSX: this file runs directly under `node` and plain .mjs has no JSX
// support without a compiler. Every element below is React.createElement,
// aliased to `h`.
//
// Keybindings (also shown in the Ctrl+H help overlay):
//   Ctrl+T          new tab
//   Ctrl+W          close current tab (refused on the last remaining tab)
//   Ctrl+Right       next tab
//   Ctrl+Left        previous tab
//   Ctrl+H          toggle this help overlay (bound via the '/help' twin
//                   too: many terminals deliver Ctrl+H as a plain backspace
//                   byte that Ink parses as key.backspace, not ctrl+h)
//   PageUp/PageDown scroll the transcript (also Ctrl+Up/Down, less reliable)
//   Up/Down         in the input: recall previous/next input (history)
//   Ctrl+C          quit (also available as /quit)
//   Enter           send the input line
// Slash commands: /new, /close, /model [n|name] (bare lists the roster),
// /code, /chat, /help, /quit, /matrix, /github.

import React, { useCallback, useEffect, useReducer, useState } from "react";
import { render, Box, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import path from "node:path";
import * as proxyClient from "./proxy-client.mjs";
import { AGENT_MAX_TURNS } from "../native/the-fold/sandboxed-agent.js";
import { wrapText, snipLine } from "./format.mjs";
import { matrixLogin, matrixLogout, matrixStatus, matrixWhoAmI } from "./matrix-login.mjs";
import { startGithubDeviceFlow, githubLogout, githubStatus, githubWhoAmI } from "./github-login.mjs";

const h = React.createElement;
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// TUI TRIPWIRE (2026-09-17): the chat message is the prose and nothing
// else. The artifact's citation apparatus (a Sources appendix, APA
// footnotes) renders in the BROWSER, folded client-side from the ledger —
// never in the transcript. The producer (proxy-runner.mjs) already keeps
// it out of the message; this is the defense-in-depth cut so even a
// regression cannot print it in the terminal. A `## Sources (verbatim)`
// or `## Footnotes` section — and anything under it until the next
// heading — is dropped mechanically, with the message re-joined.
export const stripCitationAppendix = (text) => {
  const lines = String(text ?? "").split("\n");
  const kept = [];
  let dropping = false;
  for (const line of lines) {
    if (/^\s*#{1,3}\s+(Sources\s*\(verbatim\)|Footnotes)/i.test(line)) { dropping = true; continue; }
    if (dropping) {
      if (/^\s*#{1,3}\s+\S/.test(line)) dropping = false;
      else continue;
    }
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

let _tabSeq = 0;
function makeTab(overrides = {}) {
  _tabSeq += 1;
  return {
    id: `tab-${_tabSeq}`,
    title: "untitled",
    mode: "chat",
    status: "idle", // idle | busy
    messages: [], // {role, kind, text}
    draft: "",
    scrollOffset: 0,
    inputHistory: [],
    historyIdx: 0,
    // MUST be unique across process launches, not just within one process:
    // the proxy persists a reading ledger to disk keyed literally by this
    // string, so a reused sessionId reattaches whatever an EARLIER, unrelated
    // process wrote there. randomUUID is generated once per tab, never reused.
    sessionId: `tui-${_tabSeq}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`,
    chatHistory: [], // {role, content} turns sent to the proxy, chat mode continuity
    ...overrides,
  };
}

function titleFrom(text) {
  const words = text.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length > 40 ? `${words.slice(0, 37)}...` : words || "untitled";
}

function roleColor(kind) {
  switch (kind) {
    case "user": return "cyan";
    case "assistant": return "green";
    case "quote": return "yellow";
    case "snip": return "yellow";
    case "tool-call": return "magenta";
    case "tool-result": return "gray";
    case "model": return "gray";
    case "error": return "red";
    case "note": return "yellow";
    default: return undefined;
  }
}

function Spinner() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(t);
  }, []);
  return h(Text, { color: "yellow" }, SPINNER_FRAMES[i]);
}

// Heimdall speaks while you wait: when a request is in flight, poll the
// admission gate's own disclosure (GET /heimdall) and say where YOUR turn
// sits — "you're #3 · ~240s" — only when you actually have a place in line.
// A gate that isn't answering, or a turn that is being served right now
// (not queued), stays silent — never a made-up queue.
function QueueProbe({ sessionId }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const q = await proxyClient.heimdallQueue();
      if (!cancelled && q) setInfo(q);
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => { cancelled = true; clearInterval(t); };
  }, [sessionId]);
  if (!info) return null;
  const mine = (info.positions ?? []).find((p) => p.caller === sessionId);
  if (!mine) return null; // not waiting — the turn is being served, or no wait
  // Round-robin ETA: you wait for each person AHEAD to finish their current
  // turn, never for the whole backlog — #2 waits ~one turn, not the pile.
  const perTurn = info.perTurnMs ?? 0;
  const myEta = perTurn > 0 && mine.position > 1 ? `${Math.max(1, Math.round(((mine.position - 1) * perTurn) / 1000))}s` : null;
  const where = mine.position <= 1
    ? "you're next"
    : `you're #${mine.position}${myEta ? ` · ~${myEta}` : ""}`;
  return h(Text, { dimColor: true }, `  ·  Heimdall: ${where}`);
}

function TabBar({ tabs, activeId }) {
  return h(Box, null, tabs.map((t, i) => {
    const active = t.id === activeId;
    // The SELECTED model rides at the top of the box — on the active tab
    // only, short form (er7: prefix stripped), never truncated: what answers
    // is what you see, and inactive tabs stay narrow so the bar itself fits
    // on one row. A plain-speech switch lands here the moment the turn
    // returns (the tab adopts res.model below), so the top never lies about
    // the next turn.
    const msuffix = active && t.model ? ` · ${String(t.model).replace(/^er7:/, "")}` : "";
    const label = `${i + 1}:${t.title}${msuffix}${t.mode === "code" ? " [code]" : ""}${t.status === "busy" ? " …" : ""}`;
    return h(Box, { key: t.id, marginRight: 1 },
      h(Text, { backgroundColor: active ? "blue" : undefined, color: active ? "white" : "gray", bold: active }, ` ${label} `));
  }));
}

// Pure text builder so the layout math below can measure the SAME string
// Ink is about to paint — see the row-budget comment in App() for why this
// split matters (a status line that wraps to 2 rows at normal terminal
// widths, while the chrome budget still assumes 1, desyncs Ink's redraw and
// swallows the tab bar out from under it).
function statusLineText(proxyState, tab) {
  const proxyText =
    proxyState.status === "checking" ? "checking proxy…" :
    proxyState.status === "starting" ? "starting er7 proxy…" :
    proxyState.status === "up" ? `proxy up :${proxyState.port}` :
    proxyState.status === "error" ? `proxy error: ${proxyState.error}` : "proxy unknown";
  // The SELECTED model rides at the top of the box (TabBar) — that is the
  // tab's model, what the next turn will use, never a guess. The ANSWERING
  // model is still disclosed per response (each assistant message carries
  // its model); the tab adopts res.model after every turn, so a
  // plain-speech switch shows up top the moment it lands.
  return `${proxyText} · mode:${tab?.mode ?? "-"} · Heimdall will find you the fastest and safest way across the bifrost · Ctrl+H for help`;
}

function StatusLine({ text }) {
  return h(Box, null, h(Text, { dimColor: true }, text));
}

// The help's content is a single source of truth so the layout can measure
// its real height (wrapped lines + margins + border) at the CURRENT terminal
// width instead of assuming a fixed "17 rows" that overflows on any shape
// shorter than that. `helpSectionsFor` drives both the drawn overlay and the
// chrome-height calculation; they can never disagree, and on a short window
// the overlay drops the lowest sections so the input never leaves the
// screen.
const HELP_SECTIONS = [
  { bold: true, text: "Keybindings" },
  { text: "Ctrl+T  new tab            Ctrl+W  close tab" },
  { text: "Ctrl+Right/Left  switch tabs    PageUp/PageDown  scroll (Ctrl+Up/Down also works, less reliably)" },
  { text: "Up/Down  input history" },
  { text: "Ctrl+H  toggle this help   Ctrl+C  quit" },
  { text: "Enter   send" },
  { bold: true, marginTop: 1, text: "Slash commands" },
  { text: "/new  /close  /model [n|name]  /code  /chat  /swarm <pointing> [:: material]  /help  /quit" },
  { text: "/matrix [status|login <hs> <user> <pw>|logout|whoami]  /github [status|login|logout]" },
  { bold: true, marginTop: 1, text: "Modes" },
  { text: "chat — sent to the fold proxy's grounded reading pipeline." },
  { text: "code — an open-ended coding loop over the SAME proxy, sandboxed:" },
  { text: "  an in-memory virtual filesystem and JS run in a severed vm.Context —" },
  { text: "  nothing touches the real disk or process, so nothing needs your" },
  { text: `  approval. Capped at ${AGENT_MAX_TURNS} turns per task.` },
  { bold: true, marginTop: 1, text: "The rich view" },
  { text: "For the facing page (sources · response · notes), markdown, and clickable" },
  { text: "cross-links, run `eoreader7 -browser` — the terminal stays simple." },
];

// Returns the sections that fit within `maxInner` content rows (borders
// excluded, caller accounts for them) and the total rows they occupy
// (including margins). Sections that won't fit drop from the BOTTOM so the
// keybindings — the most-used part — always survive a short window.
function helpSectionsFor(cols, maxInner) {
  const inner = Math.max(4, cols - 4); // border + paddingX: 2 + 2
  const fit = [];
  let rows = 0;
  for (const s of HELP_SECTIONS) {
    const lines = Math.max(1, wrapText(s.text, inner).length);
    const margin = s.marginTop ? 1 : 0;
    if (rows + margin + lines > maxInner) break;
    fit.push(s);
    rows += margin + lines;
  }
  return { sections: fit, rows };
}

function HelpOverlay({ cols, sections }) {
  const inner = Math.max(4, (cols ?? 80) - 4);
  const children = [];
  sections.forEach((s, i) => {
    wrapText(s.text, inner).forEach((line, j) => {
      const marginT = s.marginTop && j === 0 ? 1 : undefined;
      children.push(h(Text, { key: `h${i}-${j}`, bold: s.bold, marginTop: marginT }, line));
    });
  });
  if (!children.length) return null;
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", paddingX: 1 }, children);
}

function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  // Ink paints once per state change — it never re-runs a component just
  // because the TERMINAL resized. `stdout.rows`/`.columns` below are read
  // fresh on every render, but nothing forced a render on resize, so the
  // layout math (rows, visibleRows, the whole scroll window) froze at
  // whatever size was current at the LAST unrelated render (a token
  // arriving, a keypress) — a live "make the window taller" never reached
  // the screen. This is the actual cause of "never lets us scroll no matter
  // how tall we make it": there was nothing wrong with the scroll math,
  // there was no signal telling React the inputs to that math had changed.
  // Node's stdout emits its own "resize" event; the terminal's SIGWINCH is
  // otherwise invisible to this component tree.
  const [, bumpOnResize] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    if (!stdout) return undefined;
    const onResize = () => bumpOnResize();
    stdout.on("resize", onResize);
    return () => stdout.off("resize", onResize);
  }, [stdout]);
  const [tabs, setTabs] = useState(() => [makeTab()]);
  const [activeId, setActiveId] = useState(() => tabs[0].id);
  const [models, setModels] = useState([]);
  const [proxyState, setProxyState] = useState({ status: "checking" });
  const [helpVisible, setHelpVisible] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const updateTab = useCallback((tabId, updater) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updater(t) : t)));
  }, []);

  const pushMessage = useCallback((tabId, kind, text, role = kind, extra = {}) => {
    updateTab(tabId, (t) => ({ ...t, messages: [...t.messages, { role, kind, text, ...extra }] }));
  }, [updateTab]);

  // ── Bootstrap: make sure the proxy is up, then discover the real model
  // roster (never hardcoded — see proxy-client.mjs::listModels). ──────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!proxyClient.isUp()) {
          setProxyState({ status: "starting" });
          const res = await proxyClient.ensureRunning();
          if (cancelled) return;
          if (!proxyClient.isUp()) {
            setProxyState({ status: "error", error: res.error || "failed to start" });
            return;
          }
        }
        setProxyState({ status: "up", port: 11436 });
        const list = await proxyClient.listModels();
        if (cancelled) return;
        setModels(list);
        if (list.length) {
          // Default to the first model that is RESIDENT (already loaded — a
          // cold load on this box can take minutes) and that the proxy does
          // not disclose as hanging. The first roster entry is smollm2 (it
          // hangs) and the next is a 30B — both would make the TUI feel like
          // it never works. The resident set comes from /heimdall, never
          // hardcoded.
          const { quirks, resident } = await proxyClient.heimdallModelQuirks();
          if (cancelled) return;
          const ok = (m) => !proxyClient.modelHangs(quirks, m);
          const defaultModel =
            list.find((m) => resident.includes(proxyClient.stripPrefix(m)) && ok(m))
            ?? list.find(ok)
            ?? list[0];
          setTabs((prev) => prev.map((t) => (t.model ? t : { ...t, model: defaultModel })));
        }
      } catch (err) {
        if (!cancelled) setProxyState({ status: "error", error: err.message });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const newTab = useCallback(() => {
    setTabs((prev) => {
      const t = makeTab({ model: prev.find((x) => x.model)?.model ?? models[0] });
      setActiveId(t.id);
      return [...prev, t];
    });
  }, [models]);

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev; // refuse to close the last tab
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (tabId === activeId) {
        const newActive = next[Math.max(0, idx - 1)];
        setActiveId(newActive.id);
      }
      return next;
    });
  }, [activeId]);

  const cycleTab = useCallback((dir) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === activeId);
      const next = prev[(idx + dir + prev.length) % prev.length];
      setActiveId(next.id);
      return prev;
    });
  }, [activeId]);

  const scrollTab = useCallback((tabId, delta) => {
    updateTab(tabId, (t) => ({ ...t, scrollOffset: Math.max(0, t.scrollOffset + delta) }));
  }, [updateTab]);

  const runChat = useCallback(async (tabId, text) => {
    const tab = tabs.find((t) => t.id === tabId);
    pushMessage(tabId, "user", `> ${text}`);
    updateTab(tabId, (t) => ({ ...t, status: "busy" }));
    // The LIVE answer bubble: pushed empty before the request, filled
    // token-by-token as the SSE stream arrives, reconciled with the final
    // grounded text at DONE time. Ink repaints on every setTabs, so each
    // delta lands on screen in real time — no waiting for the whole turn.
    const appendToken = (delta) => {
      updateTab(tabId, (t) => {
        const idx = t.messages.findLastIndex((m) => m.streaming);
        if (idx < 0) return t;
        const next = t.messages.slice();
        next[idx] = { ...next[idx], text: next[idx].text + delta };
        return { ...t, messages: next };
      });
    };
    const finalizeStream = (kind, finalText, extra = {}) => {
      updateTab(tabId, (t) => {
        const idx = t.messages.findLastIndex((m) => m.streaming);
        if (idx < 0) return t;
        const next = t.messages.slice();
        next[idx] = { role: "assistant", kind, text: finalText, streaming: false, ...extra };
        return { ...t, messages: next };
      });
    };
    pushMessage(tabId, "assistant", "", "assistant", { streaming: true });
    try {
      const res = await proxyClient.chatCompletion({
        model: tab.model, history: tab.chatHistory, task: text, sessionId: tab.sessionId,
        onRetry: ({ attempt, retryAfterS, type, position }) => pushMessage(tabId, "note", `Heimdall: ${type === "not_your_turn" ? "not your turn yet" : type === "zipper" ? "merging — pass held" : type === "claimed" ? "turn claimed elsewhere" : "busy"} — retrying in ${retryAfterS}s${position ? ` (#${position})` : ""}`),
        onToken: appendToken,
      });
      // Adopt who ANSWERED (a plain-speech switch moves the session server-
      // side; the top of the box follows on the next render, never stale).
      const answered = res.model ?? tab.model;
      if (answered !== tab.model) {
        pushMessage(tabId, "note", `model switched to ${answered} on your words — showing at the top from here on`);
      }
      // A mechanical quote is snipped, non-model prose: it renders in its own
      // kind + color with a snip provenance line — never a [model] tag, so a
      // reader can tell at a glance these words were cut from a source.
      const isQuote = res.reading?.answerShape === "quote";
      const snipUrl = res.reading?.quote?.url ?? null;
      const cleanText = stripCitationAppendix(res.text);
      // Reconcile: the streamed draft is replaced by the final grounded
      // text (appendix cut, quote typed) — the bubble never duplicates and
      // chatHistory carries exactly what the screen shows.
      finalizeStream(isQuote ? "quote" : "assistant", cleanText,
        isQuote ? { snip: snipUrl } : { model: answered });
      if (isQuote) {
        pushMessage(tabId, "snip", snipLine(snipUrl), "note");
      }
      updateTab(tabId, (t) => ({
        ...t,
        model: answered,
        chatHistory: [...t.chatHistory, { role: "user", content: text }, { role: "assistant", content: cleanText }],
      }));
    } catch (err) {
      // The live bubble becomes the error — no empty ghost left behind.
      finalizeStream("error", `error: ${err.message}`);
    } finally {
      updateTab(tabId, (t) => ({ ...t, status: "idle" }));
    }
  }, [tabs, pushMessage, updateTab]);

  const runCode = useCallback(async (tabId, text) => {
    const tab = tabs.find((t) => t.id === tabId);
    pushMessage(tabId, "user", `> ${text}`);
    updateTab(tabId, (t) => ({ ...t, status: "busy" }));
    try {
      const res = await proxyClient.agentCompletion({
        model: tab.model, task: text, sessionId: tab.sessionId,
        onRetry: ({ attempt, retryAfterS, type, position }) => pushMessage(tabId, "note", `Heimdall: ${type === "not_your_turn" ? "not your turn yet" : type === "zipper" ? "merging — pass held" : type === "claimed" ? "turn claimed elsewhere" : "busy"} — retrying in ${retryAfterS}s${position ? ` (#${position})` : ""}`),
      });
      // Every round is real and disclosed — nothing this loop did is hidden.
      // Rounds are the display (what the loop did, step by step); `notes`
      // is the disclosure record (per-file moves + the inner reading
      // pipeline's own notes, each tagged with agentTurn). Both paint here;
      // neither leaves the sandbox — virtual files only, never real disk.
      for (const r of res.rounds ?? []) {
        if (r.gap) { pushMessage(tabId, "error", `(turn ${r.turn}) ${r.gap.reason}`); continue; }
        if (r.action === "list") pushMessage(tabId, "tool-call", `→ list: ${r.files.join(", ") || "(empty)"}`);
        else if (r.action === "read") pushMessage(tabId, "tool-call", `→ read ${r.path} (${r.contentChars} chars)`);
        else if (r.action === "write") pushMessage(tabId, "tool-call", `→ write ${r.path} (${r.contentChars} chars, sandboxed — not the real disk)`);
        else if (r.action === "run") {
          pushMessage(tabId, "tool-call", `→ run (sandboxed JS)`);
          pushMessage(tabId, "tool-result", `  ${r.output || "(no output)"}`);
        }
      }
      for (const n of res.notes ?? []) {
        if (!n || typeof n !== "object") continue;
        if (n.move === "agent_read") pushMessage(tabId, "note", `tabbed to ${n.path} (${n.contentChars} chars, turn ${n.turn})`);
        else if (n.move === "agent_write") pushMessage(tabId, "note", `wrote ${n.path} (${n.contentChars} chars, sandboxed, turn ${n.turn})`);
        else if (n.move === "agent_run") pushMessage(tabId, "note", `ran sandboxed JS (${n.outputChars} chars out, turn ${n.turn})`);
        else if (n.move === "agent_read_miss") pushMessage(tabId, "note", `miss: no virtual file ${n.path} (turn ${n.turn})`);
        else if (n.move === "agent_done") pushMessage(tabId, "note", `done after turn ${n.turn}`);
        else if (n.move === "agent_cap") pushMessage(tabId, "note", `turn cap (${n.turns}) — unfinished`);
      }
      if (res.done) pushMessage(tabId, "assistant", stripCitationAppendix(res.answer), "assistant", { model: tab.model });
      else pushMessage(tabId, "error", `hit the turn cap without a final answer.`);
    } catch (err) {
      pushMessage(tabId, "error", `error: ${err.message}`);
    } finally {
      updateTab(tabId, (t) => ({ ...t, status: "idle" }));
    }
  }, [tabs, pushMessage, updateTab]);

  const handleSlash = useCallback((tabId, text) => {
    const [cmd, ...rest] = text.slice(1).split(/\s+/);
    const arg = rest.join(" ").trim();
    switch (cmd) {
      case "new":
        newTab();
        break;
      case "close":
        closeTab(tabId);
        break;
      case "code":
        updateTab(tabId, (t) => ({ ...t, mode: "code" }));
        break;
      case "chat":
        updateTab(tabId, (t) => ({ ...t, mode: "chat" }));
        break;
      case "model": {
        const current = tabs.find((t) => t.id === tabId)?.model;
        if (!arg) {
          if (!models.length) { pushMessage(tabId, "note", "still discovering the model roster…"); break; }
          const listing = models.map((m, i) => `  ${i + 1}. ${m}${m === current ? "  (current)" : ""}`).join("\n");
          pushMessage(tabId, "note", `available models:\n${listing}\n/model <number|name> to switch`);
          break;
        }
        const asIndex = /^\d+$/.test(arg) ? Number(arg) - 1 : null;
        const match = (asIndex !== null ? models[asIndex] : null)
          ?? models.find((m) => m === arg || m === proxyClient.withPrefix(arg))
          ?? models.find((m) => m.toLowerCase().includes(arg.toLowerCase()));
        if (!match) { pushMessage(tabId, "error", `no model matching "${arg}" — /model lists what's available`); break; }
        updateTab(tabId, (t) => ({ ...t, model: match }));
        pushMessage(tabId, "note", `model set to ${match}`);
        break;
      }
      case "swarm": {
        // /swarm <NL pointing> [:: <material>] — explicit swarm dispatch.
        // No `::`: the ants read this tab's own transcript (the conversation
        // is the material). Swarm phrasing in ordinary chat ALSO auto-routes
        // server-side (proxy.mjs); this slash is the explicit door with
        // chosen material. No model call either way.
        const parts = arg.split(/\s*::\s*/);
        const nl = (parts[0] ?? "").trim();
        if (!nl) { pushMessage(tabId, "error", "usage: /swarm <pointing, e.g. \"swarm the cast ants\"> [:: <material>]"); break; }
        const tab = tabs.find((t) => t.id === tabId);
        const transcript = (tab?.messages ?? []).map((m) => m.text ?? "").filter(Boolean).join("\n\n");
        const material = parts.length > 1 ? parts.slice(1).join(" :: ") : transcript;
        if (!material.trim()) { pushMessage(tabId, "error", "no material: paste text after `::` or swarm from a tab with a transcript."); break; }
        pushMessage(tabId, "user", `> /swarm ${nl}`);
        updateTab(tabId, (t) => ({ ...t, status: "busy" }));
        proxyClient.swarmCompletion({ task: nl, text: material, name: `tui-${tabId}` })
          .then((report) => {
            pushMessage(tabId, "assistant", report.answer ?? "(empty swarm report)", "assistant", { model: tab?.model });
            updateTab(tabId, (t) => ({ ...t, status: "idle" }));
          })
          .catch((e) => {
            pushMessage(tabId, "error", `swarm failed: ${e.message}`);
            updateTab(tabId, (t) => ({ ...t, status: "idle" }));
          });
        break;
      }
      case "help":
        setHelpVisible((v) => !v);
        break;
      case "matrix": {
        const [sub, ...rest2] = arg.split(/\s+/).filter(Boolean);
        if (!sub || sub === "status") {
          const st = matrixStatus();
          pushMessage(tabId, "note", st.signedIn ? `matrix: signed in as ${st.userId} on ${st.homeserver}` : "matrix: not signed in — /matrix login <homeserver> <user> <password>");
          break;
        }
        if (sub === "login") {
          const [hs, user, ...pwParts] = rest2;
          const pw = pwParts.join(" ");
          if (!hs || !user || !pw) { pushMessage(tabId, "error", "/matrix login <homeserver> <user> <password>"); break; }
          pushMessage(tabId, "note", `signing in to ${hs}…`);
          matrixLogin(hs, user, pw)
            .then((creds) => pushMessage(tabId, "note", `signed in as ${creds.userId} on ${creds.homeserver}`))
            .catch((e) => pushMessage(tabId, "error", `matrix login failed: ${e.message}`));
          break;
        }
        if (sub === "logout") {
          matrixLogout()
            .then(() => pushMessage(tabId, "note", "signed out"))
            .catch((e) => pushMessage(tabId, "error", `matrix logout failed: ${e.message}`));
          break;
        }
        if (sub === "whoami") {
          matrixWhoAmI()
            .then((who) => pushMessage(tabId, "note", who ? `${who.userId} on ${who.homeserver} — session confirmed` : "no valid session"))
            .catch((e) => pushMessage(tabId, "error", `matrix whoami failed: ${e.message}`));
          break;
        }
        pushMessage(tabId, "error", `unknown /matrix command "${sub}" — status | login <homeserver> <user> <password> | logout | whoami`);
        break;
      }
      case "github": {
        const [sub] = arg.split(/\s+/).filter(Boolean);
        if (!sub || sub === "status") {
          pushMessage(tabId, "note", githubStatus().connected ? "github: connected" : "github: not connected — /github login");
          break;
        }
        if (sub === "login") {
          startGithubDeviceFlow()
            .then(({ userCode, verificationUri, poll }) => {
              pushMessage(tabId, "note", `open ${verificationUri} and enter code: ${userCode} — waiting…`);
              return poll();
            })
            .then(() => githubWhoAmI())
            .then((who) => pushMessage(tabId, "note", `connected${who?.login ? ` as ${who.login}` : ""}`))
            .catch((e) => pushMessage(tabId, "error", `github login failed: ${e.message}`));
          break;
        }
        if (sub === "logout") {
          githubLogout();
          pushMessage(tabId, "note", "github: disconnected");
          break;
        }
        pushMessage(tabId, "error", `unknown /github command "${sub}" — status | login | logout`);
        break;
      }
      case "quit":
      case "exit":
        exit();
        break;
      default:
        pushMessage(tabId, "error", `unknown command: /${cmd} (try /help)`);
    }
  }, [newTab, closeTab, updateTab, pushMessage, models, tabs, exit]);

  const handleSubmit = useCallback((text) => {
    const tabId = activeId;
    updateTab(tabId, (t) => ({ ...t, draft: "", historyIdx: 0 }));
    if (!text.trim()) return;
    if (text.startsWith("/")) { handleSlash(tabId, text.trim()); return; }
    setTabs((prev) => prev.map((t) => (t.id === tabId && t.title === "untitled" ? { ...t, title: titleFrom(text) } : t)));
    updateTab(tabId, (t) => ({
      ...t,
      inputHistory: t.inputHistory.length && t.inputHistory[t.inputHistory.length - 1] === text.trim()
        ? t.inputHistory
        : [...t.inputHistory, text.trim()].slice(-100),
    }));
    const tab = tabs.find((t) => t.id === tabId);
    if (tab.status === "busy") { pushMessage(tabId, "note", "still working on the previous task — please wait."); return; }
    if (!tab.model) { pushMessage(tabId, "error", "no model selected yet (still discovering the roster?)."); return; }
    if (tab.mode === "code") runCode(tabId, text.trim());
    else runChat(tabId, text.trim());
  }, [activeId, updateTab, handleSlash, tabs, pushMessage, runCode, runChat]);

  useInput((input, key) => {
    if (key.ctrl && input === "t") { newTab(); return; }
    if (key.ctrl && input === "w") { closeTab(activeId); return; }
    if (key.ctrl && key.rightArrow) { cycleTab(1); return; }
    if (key.ctrl && key.leftArrow) { cycleTab(-1); return; }
    // Ctrl+H: many terminals send 0x08, which Ink parses as key.backspace.
    // Bind both forms; an empty draft + backspace means help, not erase.
    if (key.ctrl && input === "h") { setHelpVisible((v) => !v); return; }
    if (key.backspace && activeTab?.draft === "" && !key.meta) { setHelpVisible((v) => !v); return; }
    if (key.upArrow) {
      const hist = activeTab?.inputHistory;
      if (!hist || !hist.length) return;
      const nextIdx = Math.max(0, (activeTab.historyIdx || 0) - 1);
      updateTab(activeId, (t) => ({ ...t, draft: hist[Math.max(0, hist.length - 1 - nextIdx)] ?? "", historyIdx: nextIdx }));
      return;
    }
    if (key.downArrow) {
      const tab = activeTab;
      if (!tab || tab.historyIdx === 0) return;
      const nextIdx = tab.historyIdx - 1;
      updateTab(activeId, (t) => ({ ...t, draft: nextIdx === 0 ? "" : (tab.inputHistory[tab.inputHistory.length - nextIdx] ?? ""), historyIdx: nextIdx }));
      return;
    }
    if (key.pageUp) { scrollTab(activeId, 12); return; }
    if (key.pageDown) { scrollTab(activeId, -12); return; }
    if (key.ctrl && key.upArrow) { scrollTab(activeId, 3); return; }
    if (key.ctrl && key.downArrow) { scrollTab(activeId, -3); return; }
  });

  const rows = stdout?.rows ?? 24;
  const cols = stdout?.columns ?? 80;

  // Layout serves ANY terminal shape or size, not a fixed one. Chrome GIVES
  // GROUND to content: the input (border + line + border) is the only thing
  // never dropped; the tab bar and status line show only while the transcript
  // keeps at least 3 rows after them; the help overlay (when open) is exactly
  // as tall as the sections that fit. The transcript is the LAST thing to
  // go, never the first — a short window squeezes chrome, then the border,
  // then nothing: bordered while a border fits (>= 3 rows), bare lines below
  // that (no border tax), gone only when not even one content line fits.
  // Help is computed ONCE here and handed to the overlay, so the drawn rows
  // and the reserved chrome rows can never disagree. Prior fixed floors
  // (`Math.max(8, rows - 9 - …)`, `Math.max(3, …)`, `Math.max(20, cols - 6)`)
  // crashed short or narrow terminals; the only remaining floors are tiny
  // and structural (a 3-row window still shows the input).
  let remaining = rows - 3; // input
  const showTab = remaining - 1 >= 3;
  if (showTab) remaining -= 1;
  // The status line is one long, unbroken Text — Ink wraps it to however
  // many physical rows it actually needs at the CURRENT terminal width, not
  // the 1 row a narrower comment once assumed. At anything under ~118
  // columns (most real terminal windows) it wraps to 2, and if this budget
  // still charged it only 1, Ink's painted height would exceed what this
  // layout reserved for it — desyncing the redraw and swallowing the tab
  // bar and transcript out from under it (verified against the e2e harness:
  // this is what "content cut off, can't scroll" turned out to be).
  const statusText = statusLineText(proxyState, activeTab);
  const statusRows = Math.max(1, wrapText(statusText, cols).length);
  const showStatus = remaining - statusRows >= 3;
  if (showStatus) remaining -= statusRows;
  const help = helpVisible
    ? helpSectionsFor(cols, Math.max(0, remaining - 2))
    : { sections: [], rows: 0 };
  const helpRows = help.sections.length ? help.rows + 2 : 0;
  remaining -= helpRows;
  const bordered = remaining >= 3;
  const bareRows = !bordered && remaining >= 1 ? remaining : 0;
  const boxHeight = bordered ? remaining : 0;
  const hasTranscript = bordered || bareRows > 0;
  const visibleRows = bordered ? Math.max(0, boxHeight - 2) : bareRows;

  const wrapW = Math.max(1, cols - 6);
  const allLines = (activeTab?.messages ?? []).flatMap((m) => {
    // A streaming bubble carries a live cursor so the eye can tell
    // in-flight text from a finished answer — even before the first token
    // (empty text + cursor), so the wait never looks dead.
    const body = m.streaming ? `${m.text ?? ""}▍` : m.text;
    const lines = wrapText(body, wrapW).map((line) => ({ kind: m.kind, text: line }));
    // The model is disclosed with the answer — the one place it is shown.
    if (m.model) lines.push({ kind: "model", text: `[${m.model}]` });
    return lines;
  });
  // Clamp the scroll so it can never overshoot the top of the transcript:
  // an unbounded offset (PageUp spam) collapsed the view to nothing.
  const scrollOffset = Math.min(activeTab?.scrollOffset ?? 0, Math.max(0, allLines.length - visibleRows));
  const end = Math.max(0, allLines.length - scrollOffset);
  const start = Math.max(0, end - visibleRows);
  const shown = allLines.slice(start, end);

  const transcriptChildren = [];
  if (start > 0) transcriptChildren.push(h(Text, { key: "more", dimColor: true }, `↑ ${start} more line(s) above (PageUp to scroll)`));
  shown.forEach((l, i) => transcriptChildren.push(h(Text, { key: `l${i}`, color: roleColor(l.kind) }, l.text)));
  if (activeTab?.status === "busy") {
    // Once streamed text is on screen the cursor IS the liveness signal —
    // the spinner only covers the gap before the first token arrives.
    const live = [...(activeTab.messages ?? [])].reverse().find((m) => m.streaming);
    if (!live || !live.text) {
      transcriptChildren.push(h(Box, { key: "spinner" }, h(Spinner), h(Text, { dimColor: true }, " thinking…"), h(QueueProbe, { sessionId: activeTab.sessionId })));
    }
  }
  if (!allLines.length) {
    transcriptChildren.push(h(Text, { key: "hint", dimColor: true }, "ask anything — or /model to switch, /help for keys (the rich view is in `eoreader7 -browser`)" ));
  }

  return h(Box, { flexDirection: "column" },
    showTab ? h(TabBar, { tabs, activeId }) : null,
    showStatus ? h(StatusLine, { text: statusText }) : null,
    helpVisible && help.sections.length ? h(HelpOverlay, { cols, sections: help.sections }) : null,
    hasTranscript
      ? (bordered
        ? h(Box, { flexDirection: "column", borderStyle: "round", height: boxHeight, paddingX: 1 }, transcriptChildren)
        : h(Box, { flexDirection: "column", paddingX: 1 }, transcriptChildren.slice(-Math.max(1, bareRows))))
      : (rows > 3 ? h(Text, { dimColor: true }, "terminal too short — the transcript is hidden, but resize and it returns") : null),
    h(Box, { borderStyle: "single", paddingX: 1 },
      h(Text, { dimColor: true }, "> "),
      h(TextInput, {
        value: activeTab?.draft ?? "",
        onChange: (v) => updateTab(activeId, (t) => ({ ...t, draft: v })),
        onSubmit: handleSubmit,
      })));
}

export function runTui() {
  if (!process.stdin.isTTY) {
    console.error("eoreader7: the interactive TUI needs a real terminal (stdin is not a TTY).");
    console.error("Run it directly in a terminal, or use `eoreader7 <file>` for the batch reader.");
    process.exitCode = 1;
    return;
  }
  render(h(App));
}