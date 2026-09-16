// tui.mjs — the interactive terminal UI: multiple tabbed conversations in
// one running process, each either "grounded chat" (proxy.mjs's own
// checked reading pipeline) or "coding agent" (agent-loop.mjs, real tool
// use over the local filesystem). Built with Ink (React for the terminal).
//
// No JSX: this file runs directly under `node` (this repo's whole CLI has
// no build/transpile step — eoreader7.mjs and er7-proxy.mjs are both run
// as-is), and plain .mjs has no JSX support without a compiler. Every
// element below is React.createElement, aliased to `h`.
//
// Keybindings (also shown in the Ctrl+H help overlay):
//   Ctrl+T          new tab
//   Ctrl+W          close current tab (refused on the last remaining tab)
//   Ctrl+Right       next tab
//   Ctrl+Left        previous tab
//   Ctrl+H          toggle this help overlay
//   Ctrl+Up/Down    scroll the transcript
//   Ctrl+C          quit (also available as /quit)
//   Enter           send the input line, or approve a pending confirmation
//   Esc             reject a pending confirmation
// Chosen to avoid the readline/emacs Ctrl+N/Ctrl+P/Ctrl+B/Ctrl+F family and
// avoid plain Tab (many terminal emulators already claim Ctrl+Tab for their
// own tab switching) — Ctrl+Arrow and Ctrl+letter combos below are free in
// the terminals this was built against (iTerm2, Terminal.app, VS Code's
// integrated terminal). Slash commands are the documented fallback for any
// environment where a binding above is intercepted first: /new, /close,
// /model <name>, /code, /chat, /help, /quit, /matrix, /github.
//
// Two modes per tab: "chat" sends straight to proxy-client.chatCompletion
// (the fold's grounded pipeline — retrieval/checking/citations already
// run there, this file adds none of that). "code" runs agent-loop's
// ReAct loop directly against Ollama with real filesystem tools.
//
// The proxy's chat completion is treated here as a single request/response
// (see proxy-client.mjs's header for why streaming is not used here even
// though the wire can technically emit tokens) — so a tab shows a
// "thinking…" spinner while a request is in flight, never fabricated
// incremental text.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { render, Box, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import * as proxyClient from "./proxy-client.mjs";
import { runAgentTurn, AGENT_MAX_TURNS } from "./agent-loop.mjs";
import { matrixLogin, matrixLogout, matrixStatus, matrixWhoAmI } from "./matrix-login.mjs";
import { startGithubDeviceFlow, githubLogout, githubStatus, githubWhoAmI } from "./github-login.mjs";

const h = React.createElement;
const OLLAMA_URL = process.env.ER7_UPSTREAM || "http://localhost:11434";
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
    sessionId: `tui-${_tabSeq}-${process.pid}`,
    agentHistory: [], // raw ollama-role messages, code mode continuity
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

function StatusLine({ proxyState, model, tab }) {
  const proxyText =
    proxyState.status === "checking" ? "checking proxy…" :
    proxyState.status === "starting" ? "starting er7 proxy…" :
    proxyState.status === "up" ? `proxy up :${proxyState.port}` :
    proxyState.status === "error" ? `proxy error: ${proxyState.error}` : "proxy unknown";
  return h(Box, null,
    h(Text, { dimColor: true }, `${proxyText} · mode:${tab?.mode ?? "-"} · model:${model ?? "(none)"} · Ctrl+H for help`));
}

function HelpOverlay() {
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", paddingX: 1 },
    h(Text, { bold: true }, "Keybindings"),
    h(Text, null, "Ctrl+T  new tab            Ctrl+W  close tab"),
    h(Text, null, "Ctrl+Right/Left  switch tabs    Ctrl+Up/Down  scroll transcript"),
    h(Text, null, "Ctrl+H  toggle this help   Ctrl+C  quit"),
    h(Text, null, "Enter   send / approve     Esc     reject a pending confirmation"),
    h(Text, { bold: true, marginTop: 1 }, "Slash commands"),
    h(Text, null, "/new  /close  /model <name>  /code  /chat  /help  /quit"),
    h(Text, null, "/matrix [status|login <hs> <user> <pw>|logout|whoami]  /github [status|login|logout]"),
    h(Text, { bold: true, marginTop: 1 }, "Modes"),
    h(Text, null, "chat — sent to the fold proxy's grounded reading pipeline."),
    h(Text, null, "code — a real tool-use loop against Ollama directly: read_file,"),
    h(Text, null, "  list_dir, grep run immediately; write_file and run_command"),
    h(Text, null, "  always ask for your approval first, shown as a real diff or"),
    h(Text, null, `  the exact command. Capped at ${AGENT_MAX_TURNS} tool-use turns per task.`));
}

function ConfirmModal({ request }) {
  const { tool, preview } = request;
  const body = [];
  if (tool === "write_file") {
    body.push(h(Text, { key: "hdr" }, preview.isNew ? `New file: ${preview.path}` : `Edit: ${preview.path}`));
    preview.diff.forEach((d, i) => {
      body.push(h(Text, { key: i, color: d.kind === "add" ? "green" : d.kind === "remove" ? "red" : "gray" },
        (d.kind === "add" ? "+ " : d.kind === "remove" ? "- " : "  ") + d.text));
    });
  } else if (tool === "run_command") {
    body.push(h(Text, { key: "cwd" }, `Run in ${preview.cwd}:`));
    body.push(h(Text, { key: "cmd", color: "yellow" }, `$ ${preview.command}`));
  }
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "red", paddingX: 1 },
    h(Text, { bold: true, color: "red" }, `Approval needed — ${tool}`),
    h(Box, { flexDirection: "column" }, body),
    h(Text, { dimColor: true, marginTop: 1 }, "Enter to approve · Esc or n to reject"));
}

function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [tabs, setTabs] = useState(() => [makeTab()]);
  const [activeId, setActiveId] = useState(() => tabs[0].id);
  const [models, setModels] = useState([]);
  const [proxyState, setProxyState] = useState({ status: "checking" });
  const [helpVisible, setHelpVisible] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const confirmResolveRef = useRef(null);

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

  const confirm = useCallback((req) => new Promise((resolve) => {
    confirmResolveRef.current = resolve;
    setConfirmRequest(req);
  }), []);

  const resolveConfirm = useCallback((approved) => {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmRequest(null);
    if (resolve) resolve(approved);
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

  const runChat = useCallback(async (tabId, text) => {
    const tab = tabs.find((t) => t.id === tabId);
    pushMessage(tabId, "user", `> ${text}`);
    updateTab(tabId, (t) => ({ ...t, status: "busy" }));
    try {
      const res = await proxyClient.chatCompletion({
        model: tab.model, history: tab.chatHistory, task: text, sessionId: tab.sessionId,
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
    const onEvent = (ev) => {
      switch (ev.type) {
        case "tool-call":
          pushMessage(tabId, "tool-call", `→ ${ev.tool}(${JSON.stringify(ev.args)})`);
          break;
        case "tool-result":
          pushMessage(tabId, "tool-result", `  ${ev.tool} → ${JSON.stringify(ev.result).slice(0, 2000)}`);
          break;
        case "parse-error":
          pushMessage(tabId, "error", `unparseable model response: ${ev.error}`);
          break;
        case "confirm-rejected":
          pushMessage(tabId, "note", `rejected: ${ev.tool}`);
          break;
        case "final":
          pushMessage(tabId, "assistant", ev.text);
          break;
        case "turn-cap":
          pushMessage(tabId, "error", `hit the ${ev.maxTurns}-turn cap without a final answer.`);
          break;
        case "error":
          pushMessage(tabId, "error", `error: ${ev.error}`);
          break;
        default:
          break;
      }
    };
    try {
      const res = await runAgentTurn({
        model: proxyClient.stripPrefix(tab.model),
        ollamaUrl: OLLAMA_URL,
        task: text,
        history: tab.agentHistory,
        cwd: process.cwd(),
        onEvent,
        confirm,
      });
      updateTab(tabId, (t) => ({ ...t, agentHistory: res.messages ?? t.agentHistory }));
    } catch (err) {
      pushMessage(tabId, "error", `error: ${err.message}`);
    } finally {
      updateTab(tabId, (t) => ({ ...t, status: "idle" }));
    }
  }, [tabs, pushMessage, updateTab, confirm]);

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
        if (!arg) { pushMessage(tabId, "note", `current model: ${tabs.find((t) => t.id === tabId)?.model ?? "(none)"}`); break; }
        const match = models.find((m) => m === arg || m === proxyClient.withPrefix(arg))
          ?? models.find((m) => m.toLowerCase().includes(arg.toLowerCase()));
        if (!match) { pushMessage(tabId, "error", `no model matching "${arg}" — available: ${models.join(", ")}`); break; }
        updateTab(tabId, (t) => ({ ...t, model: match }));
        pushMessage(tabId, "note", `model set to ${match}`);
        break;
      }
      case "help":
        setHelpVisible((v) => !v);
        break;
      // Matrix/GitHub, from here too (user direction: login from any
      // interaction surface) — this CLI's own independent sign-in
      // (matrix-login.mjs/github-login.mjs), never the browser's session,
      // which a separate Node process has no way to read.
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
          if (!hs || !user || !pw) { pushMessage(tabId, "error", "/matrix login <homeserver> <user> <password> — this line stays in your terminal scrollback, unmasked"); break; }
          pushMessage(tabId, "note", `signing in to ${hs}…`);
          matrixLogin(hs, user, pw)
            .then((creds) => pushMessage(tabId, "note", `signed in as ${creds.userId} on ${creds.homeserver} — credentials saved (mode 600) to this CLI's own ~/.eoreader7/credentials.json, separate from any browser session`))
            .catch((e) => pushMessage(tabId, "error", `matrix login failed: ${e.message}`));
          break;
        }
        if (sub === "logout") {
          matrixLogout()
            .then(() => pushMessage(tabId, "note", "signed out — token invalidated on the homeserver and forgotten here"))
            .catch((e) => pushMessage(tabId, "error", `matrix logout failed: ${e.message}`));
          break;
        }
        if (sub === "whoami") {
          matrixWhoAmI()
            .then((who) => pushMessage(tabId, "note", who ? `${who.userId} on ${who.homeserver} — session confirmed live against the homeserver` : "no valid session (not signed in, or the token no longer works)"))
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
            .then((who) => pushMessage(tabId, "note", `connected${who?.login ? ` as ${who.login}` : ""} — credentials saved (mode 600) to this CLI's own ~/.eoreader7/credentials.json`))
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
    updateTab(tabId, (t) => ({ ...t, draft: "" }));
    if (!text.trim()) return;
    if (text.startsWith("/")) { handleSlash(tabId, text.trim()); return; }
    setTabs((prev) => prev.map((t) => (t.id === tabId && t.title === "untitled" ? { ...t, title: titleFrom(text) } : t)));
    const tab = tabs.find((t) => t.id === tabId);
    if (tab.status === "busy") { pushMessage(tabId, "note", "still working on the previous task — please wait."); return; }
    if (!tab.model) { pushMessage(tabId, "error", "no model selected yet (still discovering the roster?)."); return; }
    if (tab.mode === "code") runCode(tabId, text.trim());
    else runChat(tabId, text.trim());
  }, [activeId, updateTab, handleSlash, tabs, pushMessage, runCode, runChat]);

  useInput((input, key) => {
    if (confirmRequest) {
      if (key.return) resolveConfirm(true);
      else if (key.escape || input === "n" || input === "N") resolveConfirm(false);
      return;
    }
    if (key.ctrl && input === "t") { newTab(); return; }
    if (key.ctrl && input === "w") { closeTab(activeId); return; }
    if (key.ctrl && key.rightArrow) { cycleTab(1); return; }
    if (key.ctrl && key.leftArrow) { cycleTab(-1); return; }
    if (key.ctrl && input === "h") { setHelpVisible((v) => !v); return; }
    if (key.ctrl && key.upArrow) { updateTab(activeId, (t) => ({ ...t, scrollOffset: t.scrollOffset + 3 })); return; }
    if (key.ctrl && key.downArrow) { updateTab(activeId, (t) => ({ ...t, scrollOffset: Math.max(0, t.scrollOffset - 3) })); return; }
  });

  const rows = stdout?.rows ?? 24;
  const reservedRows = 8; // tab bar, status, input box, margins
  const visibleRows = Math.max(3, rows - reservedRows);
  const allLines = (activeTab?.messages ?? []).flatMap((m) => m.text.split("\n").map((line) => ({ kind: m.kind, text: line })));
  const scrollOffset = activeTab?.scrollOffset ?? 0;
  const end = Math.max(0, allLines.length - scrollOffset);
  const start = Math.max(0, end - visibleRows);
  const shown = allLines.slice(start, end);

  const transcriptChildren = [];
  if (start > 0) transcriptChildren.push(h(Text, { key: "more", dimColor: true }, `↑ ${start} more line(s) above (Ctrl+Up to scroll)`));
  shown.forEach((l, i) => transcriptChildren.push(h(Text, { key: i, color: roleColor(l.kind) }, l.text)));
  if (activeTab?.status === "busy") {
    transcriptChildren.push(h(Box, { key: "spinner" }, h(Spinner), h(Text, { dimColor: true }, " thinking…")));
  }

  return h(Box, { flexDirection: "column" },
    h(TabBar, { tabs, activeId }),
    h(StatusLine, { proxyState, model: activeTab?.model, tab: activeTab }),
    helpVisible ? h(HelpOverlay) : null,
    h(Box, { flexDirection: "column", borderStyle: "round", minHeight: visibleRows + 2, paddingX: 1 }, transcriptChildren),
    confirmRequest
      ? h(ConfirmModal, { request: confirmRequest })
      : h(Box, { borderStyle: "single", paddingX: 1 },
          h(Text, { dimColor: true }, "> "),
          h(TextInput, {
            value: activeTab?.draft ?? "",
            onChange: (v) => updateTab(activeId, (t) => ({ ...t, draft: v })),
            onSubmit: handleSubmit,
          })));
}

export function runTui() {
  // Ink's useInput needs a real TTY to enable raw mode; without one it
  // throws mid-render (a confusing stack trace) rather than a clear
  // message. Piping/redirecting eoreader7 with no args (CI, a script, a
  // non-interactive shell) is a real, expected way this gets invoked by
  // mistake — fail with one clear line instead.
  if (!process.stdin.isTTY) {
    console.error("eoreader7: the interactive TUI needs a real terminal (stdin is not a TTY).");
    console.error("Run it directly in a terminal, or use `eoreader7 <file>` for the batch reader.");
    process.exitCode = 1;
    return;
  }
  render(h(App));
}
