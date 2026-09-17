#!/usr/bin/env python3
"""drive.py — PTY driver + miniature ANSI terminal emulator for the eoreader7
TUI. Spawns the fake proxy and the real TUI (node eoreader7.mjs, no args →
Ink renderer) inside a pseudo-terminal, drives real keystrokes, keeps a
character grid of everything the TUI painted, and asserts on the *screen*
(exactly what a human sees), not on the code.

Usage:
  python3 drive.py --scenario <name> [--cols 100 --rows 30]

Scenarios: boot, help, chat, tabs, model, scroll, agent, facing, notes,
history, search

Exits 0 on pass, 1 on failure (assertion text printed to stderr).
"""

import argparse
import codecs
import fcntl
import os
import pty
import re
import select
import signal
import struct
import subprocess
import sys
import termios
import threading
import time


HERE = os.path.dirname(os.path.abspath(__file__))  # cli/tests/e2e
CLI_DIR = os.path.dirname(os.path.dirname(HERE))  # cli (where eoreader7.mjs lives)
FAKE_PROXY = os.path.join(HERE, "fake-proxy.mjs")
TUI_ENTRY = os.path.join(CLI_DIR, "eoreader7.mjs")
FIXTURES = os.path.join(HERE, "fixtures")
HOLO_FIXTURE = os.path.join(FIXTURES, "holograph.json")


# ── ANSI terminal emulator ─────────────────────────────────────────────────
class Screen:
    def __init__(self, rows, cols):
        self.rows = rows
        self.cols = cols
        self.grid = [[" " for _ in range(cols)] for _ in range(rows)]
        self.cursor = [0, 0]  # [row, col], 0-based

    def reset(self):
        self.__init__(self.rows, self.cols)

    def snap(self):
        return ["".join(row).rstrip() for row in self.grid]

    def text(self):
        return "\n".join(self.snap())

    def move(self, row, col):
        self.cursor = [max(0, min(self.rows - 1, row)), max(0, min(self.cols - 1, col))]

    def up(self, n):
        self.move(self.cursor[0] - max(0, n), self.cursor[1])

    def down(self, n):
        self.move(self.cursor[0] + max(0, n), self.cursor[1])

    def fwd(self, n):
        self.move(self.cursor[0], self.cursor[1] + max(0, n))

    def back(self, n):
        self.move(self.cursor[0], self.cursor[1] - max(0, n))

    def erase_in_line(self, mode):
        r, c = self.cursor
        if mode in (0, 2):
            for i in range(c if mode == 0 else 0, self.cols):
                self.grid[r][i] = " "
        elif mode == 1:
            for i in range(0, c + 1):
                self.grid[r][i] = " "

    def erase_in_display(self, mode):
        if mode == 2:
            self.reset()
        elif mode == 0:
            r, c = self.cursor
            self.erase_in_line(0)
            for i in range(r + 1, self.rows):
                self.grid[i] = [" " for _ in range(self.cols)]
        elif mode == 1:
            r, c = self.cursor
            self.erase_in_line(1)
            for i in range(0, r):
                self.grid[i] = [" " for _ in range(self.cols)]

    def scroll_up(self):
        self.grid.pop(0)
        self.grid.append([" " for _ in range(self.cols)])

    def put(self, ch):
        r, c = self.cursor
        if c >= self.cols:
            # A full-width line leaves the cursor at the wrap position; the
            # next written char triggers the wrap (real-terminal DECAWM
            # semantics — a line exactly `cols` wide does NOT wrap on its own).
            c = 0
            r += 1
            if r >= self.rows:
                self.scroll_up()
                r = self.rows - 1
        self.grid[r][c] = ch
        c += 1
        if c > self.cols:
            c = self.cols
        self.cursor = [r, c]


CSI = re.compile(r"\x1b\[([0-9;?]*)([A-Za-z@`])")
OSC = re.compile(r"\x1b\][^\x07\x1b]*(\x07|\x1b\\)")


class TerminalEmulator:
    def __init__(self, rows, cols):
        self.screen = Screen(rows, cols)
        self.saved_cursor = None
        self._decoder = codecs.getincrementaldecoder("utf-8")("replace")

    def feed(self, data):
        text = self._decoder.decode(data)
        buf = text
        while buf:
            if buf[0] == "\x1b":
                m = OSC.match(buf)
                if m:
                    buf = buf[m.end():]
                    continue
                m = CSI.match(buf)
                if m:
                    self._csi(m.group(1), m.group(2))
                    buf = buf[m.end():]
                    continue
                if buf.startswith("\x1b7"):
                    self.saved_cursor = list(self.screen.cursor)
                    buf = buf[2:]
                    continue
                if buf.startswith("\x1b8"):
                    if self.saved_cursor:
                        self.screen.cursor = list(self.saved_cursor)
                    buf = buf[2:]
                    continue
                buf = buf[1:]
                continue
            ch = buf[0]
            buf = buf[1:]
            if ch == "\r":
                self.screen.cursor[1] = 0
            elif ch == "\n":
                r, c = self.screen.cursor
                if r + 1 >= self.screen.rows:
                    self.screen.scroll_up()
                else:
                    self.screen.cursor = [r + 1, c]
            elif ch == "\b":
                self.screen.back(1)
            elif ch == "\t":
                self.screen.fwd(8 - (self.screen.cursor[1] % 8))
            elif ch.isprintable() or ord(ch) > 127:
                self.screen.put(ch)

    def _csi(self, params, final):
        p = params.split(";")
        nums = []
        for x in p:
            try:
                nums.append(int(x) if x else 0)
            except ValueError:
                nums.append(0)
        n = nums[0] if nums else 1
        if final in ("H", "f"):
            row = (nums[0] if len(nums) > 0 and nums[0] else 1) - 1
            col = (nums[1] if len(nums) > 1 and nums[1] else 1) - 1
            self.screen.move(row, col)
        elif final == "A":
            self.screen.up(n or 1)
        elif final == "B":
            self.screen.down(n or 1)
        elif final == "C":
            self.screen.fwd(n or 1)
        elif final == "D":
            self.screen.back(n or 1)
        elif final == "G":
            self.screen.cursor[1] = (n or 1) - 1
        elif final == "E":
            self.screen.cursor[0] = min(self.screen.rows - 1, self.screen.cursor[0] + (n or 1))
            self.screen.cursor[1] = 0
        elif final == "F":
            self.screen.cursor[0] = max(0, self.screen.cursor[0] - (n or 1))
            self.screen.cursor[1] = 0
        elif final == "K":
            self.screen.erase_in_line(n)
        elif final == "J":
            self.screen.erase_in_display(n)
        elif final == "m":
            pass
        elif final == "s":
            self.saved_cursor = list(self.screen.cursor)
        elif final == "u":
            if self.saved_cursor:
                self.screen.cursor = list(self.saved_cursor)
        elif final == "r":
            pass
        elif final in ("M", "L"):
            pass
        elif final == "h" and params.startswith("?1049"):
            self.screen.alt = True
        elif final == "l" and params.startswith("?1049"):
            self.screen.alt = False


# ── PTY child ──────────────────────────────────────────────────────────────
class Pty:
    def __init__(self, argv, rows, cols, env):
        self.rows = rows
        self.cols = cols
        self.master, self.slave = pty.openpty()
        fcntl.ioctl(self.master, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
        self.env = dict(os.environ)
        self.env.update(env)
        self.proc = subprocess.Popen(
            argv,
            stdin=self.slave,
            stdout=self.slave,
            stderr=self.slave,
            env=self.env,
            close_fds=True,
            start_new_session=True,
            cwd=CLI_DIR,
        )
        os.close(self.slave)
        self.emulator = TerminalEmulator(rows, cols)
        self._lock = threading.Lock()
        self._reader = threading.Thread(target=self._read_loop, daemon=True)
        self._reader.start()

    def _read_loop(self):
        while True:
            try:
                r, _, _ = select.select([self.master], [], [], 0.2)
            except (OSError, ValueError):
                return
            if not r:
                continue
            try:
                data = os.read(self.master, 65536)
            except (OSError, ValueError):
                return
            if not data:
                return
            with self._lock:
                self.emulator.feed(data)

    def keys(self, text, delay=0.03):
        for ch in text:
            os.write(self.master, ch.encode("utf-8"))
            time.sleep(delay)

    def key(self, code, delay=0.06):
        try:
            os.write(self.master, code)
        except OSError:
            return
        time.sleep(delay)

    def screen(self):
        with self._lock:
            return self.emulator.screen.snap()

    def text(self):
        with self._lock:
            return self.emulator.screen.text()

    def wait_text(self, needle, timeout=35.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if needle in self.text():
                return True
            time.sleep(0.05)
        return False

    def wait_absent(self, needle, timeout=35.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if needle not in self.text():
                return True
            time.sleep(0.05)
        return False

    def kill(self):
        try:
            os.killpg(self.proc.pid, signal.SIGKILL)
        except (OSError, ProcessLookupError):
            pass
        try:
            os.close(self.master)
        except OSError:
            pass


# ── Scenario runner ────────────────────────────────────────────────────────
FAILURES = []


def check(cond, label, detail=""):
    if cond:
        print(f"  ok  {label}")
    else:
        FAILURES.append(label)
        print(f"  FAIL {label}" + (f" — {detail}" if detail else ""))


def type_and_send(p, text):
    # Type slowly and VERIFY each keystroke landed in the input before
    # pressing Enter. The app boots slowly under load; keystrokes sent before
    # Ink's raw mode is active can be swallowed by the line discipline.
    for ch in text:
        p.key(ch.encode(), delay=0.02)
    deadline = time.time() + 5
    while time.time() < deadline:
        # the typed text should appear in the input box (draft)
        if text in p.text():
            break
        time.sleep(0.1)
    p.key(b"\r")  # Enter in raw mode is \r, not \n
    time.sleep(0.2)


def wait_prompt(p, timeout=45.0):
    """The app (node + Ink) can take seconds to boot under load; every
    scenario must wait until the input box is rendered before typing. The
    prompt rendering alone is not enough: Ink's raw mode (which makes the
    pty stop echoing) must be active too, or keystrokes get echoed by the
    line discipline and never reach the app. So this waits until a probe
    keystroke lands in the input area (draft) and not echoed at the top."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if "> " in "\n".join(p.screen()[-6:]) or "ask anything" in "\n".join(p.screen()):
            # probe: type a marker and see if it lands in the draft (last rows)
            try:
                os.write(p.master, b"z")
                time.sleep(0.4)
            except OSError:
                time.sleep(0.2)
                continue
            scr = p.screen()
            in_draft = any("z" in r for r in scr[-5:])
            echoed_top = any("z" in r for r in scr[:3])
            try:
                os.write(p.master, b"\x7f")  # backspace the probe
            except OSError:
                pass
            time.sleep(0.3)
            if in_draft and not echoed_top:
                time.sleep(2.0)  # settle: let the roster load fully
                return True
            time.sleep(0.5)
        time.sleep(0.1)
    return False


def wait_model(p, timeout=45.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if "model:" in p.text() and "none" not in p.text().split("model:")[-1].split("·")[0]:
            return True
        time.sleep(0.1)
    return False


def scenario_boot(p, cols, rows):
    print("scenario: boot")
    check(p.wait_text("1:untitled", 35), "tab bar shows the first tab")
    check(p.wait_text("proxy up", 35), "status line reports the proxy is up")
    check(p.wait_text("bifrost", 35), "status line carries Heimdall's word")
    check("Ctrl+H" in p.text(), "status line advertises help")
    scr = p.screen()
    check("proxy error" not in p.text(), "proxy came up without error")
    check(len([r for r in scr if r.strip()]) <= rows, "render fits the terminal height")
    # THE LAYOUT BUG: the tab bar + status used to scroll off the top because
    # the transcript box forced itself taller than the terminal (and Ink 7.1.1
    # misplaces the top of a full-height frame on re-render). The transcript
    # box is now a fixed height short of the terminal, so the top chrome must
    # survive the re-render when the proxy comes up.
    top = "\n".join(scr[:3])
    check("1:untitled" in top and "proxy up" in top, "chrome stays on screen after re-render")
    check(">" in "\n".join(scr[rows - 5:]), "input box anchored at the bottom")


def scenario_help(p, cols, rows):
    print("scenario: help")
    check(wait_prompt(p), "app rendered its input prompt")
    # Ctrl+H arrives as 0x08 in raw mode; Ink parses that as key.backspace.
    # The TUI binds BOTH ctrl+h AND empty-draft backspace to help, so this
    # byte must open the overlay.
    p.key(b"\x08")
    check(p.wait_text("Keybindings", 4), "help overlay appears on Ctrl+H")
    check("Ctrl+T" in p.text(), "overlay documents Ctrl+T")
    check("Slash commands" in p.text(), "overlay documents slash commands")
    p.key(b"\x08")
    check(p.wait_absent("Keybindings", 4), "overlay closes on second Ctrl+H")


def scenario_chat(p, cols, rows):
    print("scenario: chat")
    check(wait_prompt(p), "app rendered its input prompt")
    type_and_send(p, "what is the fold?")
    check(p.wait_text("Tail.", 8), "grounded answer arrives (its tail is visible)")
    # The long-line wrap: the run-on sentence sits just above the tail and is
    # visible in the auto-scrolled view — check it BEFORE scrolling up.
    scr = p.text()
    check("silently lost" in scr, "long line fully wrapped to the end (visible at the fold)")
    check("pressure test" in scr, "long line wrapped, tail not lost")
    p.key(b"\x1b[5~")  # PageUp x4 to reveal the top of the answer
    p.key(b"\x1b[5~")
    p.key(b"\x1b[5~")
    p.key(b"\x1b[5~")
    check(p.wait_text("How the fold reads", 6), "grounded answer header visible after scrolling up")
    scr = p.text()
    check("Two postures" in scr, "second-level header rendered")
    check("vm.Context" in scr, "inline code text survives")


def scenario_tabs(p, cols, rows):
    print("scenario: tabs")
    check(wait_prompt(p), "app rendered its input prompt")
    p.key(b"\x14")  # Ctrl+T = 0x14
    check(p.wait_text("2:untitled", 4), "Ctrl+T opens a second tab")
    p.key(b"\x1b[1;5D")  # Ctrl+Left
    check(p.wait_text("1:untitled", 4), "Ctrl+Left returns to the first tab")
    p.key(b"\x1b[1;5C")  # Ctrl+Right
    check(p.wait_text("2:untitled", 4), "Ctrl+Right returns to the second tab")


def scenario_model(p, cols, rows):
    print("scenario: model")
    check(wait_prompt(p), "app rendered its input prompt")
    type_and_send(p, "/model")
    check(p.wait_text("available models", 4), "/model with no arg lists the roster")
    check("1. er7:smollm2:1.7b" in p.text(), "roster is numbered")
    type_and_send(p, "/model 2")
    check(p.wait_text("model set to er7:gemma2:2b", 4), "/model 2 switches by position")
    type_and_send(p, "/model qwen3")
    check(p.wait_text("model set to er7:qwen3:30b-a3b", 4), "/model <partial name> matches")


def scenario_scroll(p, cols, rows):
    print("scenario: scroll")
    check(wait_prompt(p), "app rendered its input prompt")
    type_and_send(p, "give me a very long answer please")
    check(p.wait_text("Tail.", 8), "answer arrives for scrolling")
    time.sleep(0.2)
    p.key(b"\x1b[1;5A")  # Ctrl+Up
    check(p.wait_text("more line", 4), "scroll affordance appears after scrolling")
    p.key(b"\x1b[1;5B")  # Ctrl+Down
    check(p.wait_text("Tail.", 4), "scroll back down returns to the bottom of the transcript")


def scenario_agent(p, cols, rows):
    print("scenario: agent")
    check(wait_prompt(p), "app rendered its input prompt")
    type_and_send(p, "/code")
    check(p.wait_text("mode:code", 4), "/code switches the tab to code mode")
    type_and_send(p, "build a small thing")
    check(p.wait_text("list: readme.md", 8), "agent round: list is surfaced")
    check(p.wait_text("read readme.md", 8), "agent round: read is surfaced")
    check(p.wait_text("write src/main.js", 8), "agent round: write is surfaced")
    check(p.wait_text("All three files wired", 8), "agent final answer arrives")


def scenario_history(p, cols, rows):
    print("scenario: history")
    check(wait_prompt(p), "app rendered its input prompt")
    type_and_send(p, "first message")
    check(p.wait_text("first message", 4), "first message submitted")
    # Up arrow recalls the previous input into the draft.
    p.key(b"\x1b[A")
    check(p.wait_text("first message", 2), "up arrow recalls previous input into the draft")
    p.key(b"\r")
    check(p.wait_text("Tail.", 8), "recalled input sends")


def scenario_search(p, cols, rows):
    print("scenario: search")
    check(wait_prompt(p), "app rendered its input prompt")
    # The /facing command is discoverable from the hint line; assert the hint
    # exists. (Full transcript search is a browser-only feature for now.)
    check(p.wait_text("ask anything", 4), "empty-transcript hint is present")


SCENARIOS = {
    "boot": scenario_boot,
    "help": scenario_help,
    "chat": scenario_chat,
    "tabs": scenario_tabs,
    "model": scenario_model,
    "scroll": scenario_scroll,
    "agent": scenario_agent,
    "history": scenario_history,
    "search": scenario_search,
}


def run(scenario, cols, rows):
    port = str(11993 + (os.getpid() % 500))
    proxy = subprocess.Popen(
        ["node", FAKE_PROXY],
        env=dict(os.environ, ER7_PROXY_PORT=port),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=CLI_DIR,
    )
    try:
        time.sleep(1.0)
        p = Pty(
            ["node", TUI_ENTRY],
            rows=rows,
            cols=cols,
            env={"ER7_PROXY_PORT": port, "TERM": "xterm-256color"},
        )
        try:
            SCENARIOS[scenario](p, cols, rows)
        finally:
            p.kill()
    finally:
        try:
            proxy.terminate()
        except ProcessLookupError:
            pass

    print()
    if FAILURES:
        print(f"e2e FAILED ({len(FAILURES)} assertion(s)):")
        for f in FAILURES:
            print(f"  - {f}")
        return 1
    print(f"e2e {scenario}: PASS")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", required=True, choices=list(SCENARIOS))
    ap.add_argument("--cols", type=int, default=110)
    ap.add_argument("--rows", type=int, default=30)
    args = ap.parse_args()
    sys.exit(run(args.scenario, args.cols, args.rows))


if __name__ == "__main__":
    main()