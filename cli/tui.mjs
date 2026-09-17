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

import React, { useCallback, useEffect, useState } from "react";
import { render, Box, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import path from "node:path";
import * as proxyClient from "./proxy-client.mjs";
import { AGENT_MAX_TURNS } from "../native/the-fold/sandboxed-agent.js";
import { wrapText } from "./format.mjs";
import { matrixLogin, matrixLogout, matrixStatus, matrixWhoAmI } from "./matrix-login.mjs";
import { startGithubDeviceFlow, githubLogout, githubStatus, githubWhoAmI } from "./github-login.mjs";

const h = React.createElement;
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

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
    case "tool-call": return "magenta";
    case "tool-result": return "gray";
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

function TabBar({ tabs, activeId }) {
  return h(Box, null, tabs.map((t, i) => {
    const active = t.id === activeId;
    const label = `${i + 1}:${t.title}${t.mode === "code" ? " [code]" : ""}${t.status === "busy" ? " …" : ""}`;
    return h(Box, { key: t.id, marginRight: 1 },
      h(Text, { backgroundColor: active ? "blue" : undefined, color: active ? "white" : "gray", bold: active }, ` ${label} `));
  }));
}

function StatusLine({ proxyState, tab }) {
  const proxyText =
    proxyState.status === "checking" ? "checking proxy…" :
    proxyState.status === "starting" ? "starting er7 proxy…" :
    proxyState.status === "up" ? `proxy up :${proxyState.port}` :
    proxyState.status === "error" ? `proxy error: ${proxyState.error}` : "proxy unknown";
  // The model is shown once the proxy returns the roster — never guessed.
  const modelText = tab?.model ? ` · model:${tab.model}` : "";
  return h(Box, null,
    h(Text, { dimColor: true }, `${proxyText} · mode:${tab?.mode ?? "-"}${modelText} · Heimdall will find you the fastest and safest way across the bifrost · Ctrl+H for help`));
}

function HelpOverlay() {
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", paddingX: 1 },
    h(Text, { bold: true }, "Keybindings"),
    h(Text, null, "Ctrl+T  new tab            Ctrl+W  close tab"),
    h(Text, null, "Ctrl+Right/Left  switch tabs    PageUp/PageDown  scroll (Ctrl+Up/Down also works, less reliably)"),
    h(Text, null, "Up/Down  input history"),
    h(Text, null, "Ctrl+H  toggle this help   Ctrl+C  quit"),
    h(Text, null, "Enter   send"),
    h(Text, { bold: true, marginTop: 1 }, "Slash commands"),
    h(Text, null, "/new  /close  /model [n|name]  /code  /chat  /help  /quit"),
    h(Text, null, "/matrix [status|login <hs> <user> <pw>|logout|whoami]  /github [status|login|logout]"),
    h(Text, { bold: true, marginTop: 1 }, "Modes"),
    h(Text, null, "chat — sent to the fold proxy's grounded reading pipeline."),
    h(Text, null, "code — an open-ended coding loop over the SAME proxy, sandboxed:"),
    h(Text, null, "  an in-memory virtual filesystem and JS run in a severed vm.Context —"),
    h(Text, null, "  nothing touches the real disk or process, so nothing needs your"),
    h(Text, null, `  approval. Capped at ${AGENT_MAX_TURNS} turns per task.`),
    h(Text, { bold: true, marginTop: 1 }, "The rich view"),
    h(Text, null, "For the facing page (sources · response · notes), markdown, and clickable"),
    h(Text, null, "cross-links, run `eoreader7 -browser` — the terminal stays simple."));
}

function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [tabs, setTabs] = useState(() => [makeTab()]);
  const [activeId, setActiveId] = useState(() => tabs[0].id);
  const [models, setModels] = useState([]);
  const [proxyState, setProxyState] = useState({ status: "checking" });
  const [helpVisible, setHelpVisible] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const updateTab = useCallback((tabId, updater) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updater(t) : t)));
  }, []);

  const pushMessage = useCallback((tabId, kind, text, role = kind) => {
    updateTab(tabId, (t) => ({ ...t, messages: [...t.messages, { role, kind, text }] }));
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
          setTabs((prev) => prev.map((t) => (t.model ? t : { ...t, model: list[0] })));
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
    try {
      const res = await proxyClient.chatCompletion({
        model: tab.model, history: tab.chatHistory, task: text, sessionId: tab.sessionId,
        onRetry: ({ attempt, retryAfterS, type }) => pushMessage(tabId, "note", `${type === "saturated" ? "box" : "heimdall"} busy — retrying in ${retryAfterS}s (attempt ${attempt}/${proxyClient.CHAT_MAX_RETRIES})`),
      });
      pushMessage(tabId, "assistant", res.text);
      updateTab(tabId, (t) => ({
        ...t,
        chatHistory: [...t.chatHistory, { role: "user", content: text }, { role: "assistant", content: res.text }],
      }));
    } catch (err) {
      pushMessage(tabId, "error", `error: ${err.message}`);
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
        onRetry: ({ attempt, retryAfterS, type }) => pushMessage(tabId, "note", `${type === "saturated" ? "box" : "heimdall"} busy — retrying in ${retryAfterS}s (attempt ${attempt}/${proxyClient.CHAT_MAX_RETRIES})`),
      });
      // Every round is real and disclosed — nothing this loop did is hidden.
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
      if (res.done) pushMessage(tabId, "assistant", res.answer);
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

  // Layout: the original, dead-simple arrangement — tab bar and status on TOP,
  // the transcript box in the middle, the input anchored at the BOTTOM. The
  // only change from the original is that the transcript box gets a fixed
  // height a few rows short of the terminal instead of the old
  // `minHeight: visibleRows + 2`, which overflowed by a line and scrolled
  // the chrome off the top (e2e-verified).
  const helpRows = helpVisible ? 17 : 0;
  const boxHeight = Math.max(8, rows - 9 - helpRows);
  const visibleRows = Math.max(3, boxHeight - 2);

  const wrapW = Math.max(20, cols - 6);
  const allLines = (activeTab?.messages ?? []).flatMap((m) => wrapText(m.text, wrapW).map((line) => ({ kind: m.kind, text: line })));
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
    transcriptChildren.push(h(Box, { key: "spinner" }, h(Spinner), h(Text, { dimColor: true }, " thinking…")));
  }
  if (!allLines.length) {
    transcriptChildren.push(h(Text, { key: "hint", dimColor: true }, "ask anything — or /model to switch, /help for keys (the rich view is in `eoreader7 -browser`)" ));
  }

  return h(Box, { flexDirection: "column" },
    h(TabBar, { tabs, activeId }),
    h(StatusLine, { proxyState, tab: activeTab }),
    helpVisible ? h(HelpOverlay) : null,
    h(Box, { flexDirection: "column", borderStyle: "round", height: boxHeight, paddingX: 1 }, transcriptChildren),
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