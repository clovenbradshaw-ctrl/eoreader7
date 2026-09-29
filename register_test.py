#!/usr/bin/env python3
"""
register_test.py — a register-machine, long-chain-of-steps benchmark for
eoreader7's proxy: does state (four registers a, b, c, d) survive a long
sequence of straight-line steps, either inside one prompt (Part 1) or split
across many separate chat calls with the context window deliberately
withheld (Part 2, --chunked)?

PROVENANCE (disclosed, not glossed over): this file previously lived here,
uncommitted, and was lost to a container restart before this session could
read it. This is a rewrite from the task's own specification, not a
recovery of the original. The generator/scorer/opcode semantics below are
this rewrite's own choices — stated explicitly so a diff against any
recovered original is possible. In particular ADDR (the one opcode the task
left unspecified) is read here as an INDIRECT LOAD: the value already held
in the second operand, taken mod 4, selects a register by position
(a=0, b=1, c=2, d=3), and that register's value is loaded into the first
operand. This is the one opcode that cannot be computed by tracking each
register as an independent scalar in isolation — it requires knowing the
CURRENT value of every register to resolve the indirection, which is why
it is included at all in a state-tracking benchmark.

Opcodes (registers only, x != y, all arithmetic mod 1000):
    ADD x y   -> x = (x + y) % 1000
    SUB x y   -> x = (x - y) % 1000
    MUL x y   -> x = (x * y) % 1000
    MOV x y   -> x = y
    SWAP x y  -> x, y = y, x
    ADDR x y  -> x = registers[ registers[y] % 4 ]

Both arms (raw, er7) are sent byte-identical prompts, generated from the
same seeded program, and scored by the same parser. Nothing here is
tuned per arm.
"""
import argparse
import json
import random
import re
import sys
import time
import urllib.request
import urllib.error

REGISTERS = ["a", "b", "c", "d"]
OPCODES = ["ADD", "SUB", "MUL", "MOV", "SWAP", "ADDR"]
MOD = 1000

RAW_BASE = "http://localhost:11434"
ER7_BASE = "http://localhost:11436"
RAW_MODEL_PREFIX = ""      # raw Ollama takes the bare model id
ER7_MODEL_PREFIX = "er7:"  # the proxy requires this prefix (proxy-api.mjs)

RETRY_MAX = 5
RETRY_BASE_S = 1.0

FORMAT_INSTRUCTION = (
    "Report ONLY the final register values, on one line, in exactly this "
    "format and no other text:\na=<value> b=<value> c=<value> d=<value>."
)


# ---------------------------------------------------------------- generator
def gen_program(level, seed):
    """Deterministic: the same (level, seed) always yields the same program."""
    rng = random.Random(seed)
    init = {r: rng.randrange(MOD) for r in REGISTERS}
    program = []
    for _ in range(level):
        op = rng.choice(OPCODES)
        x, y = rng.sample(REGISTERS, 2)
        program.append((op, x, y))
    return init, program


def run_program(init, program):
    """The ground truth. Deterministic; no floating point anywhere."""
    regs = dict(init)
    for op, x, y in program:
        if op == "ADD":
            regs[x] = (regs[x] + regs[y]) % MOD
        elif op == "SUB":
            regs[x] = (regs[x] - regs[y]) % MOD
        elif op == "MUL":
            regs[x] = (regs[x] * regs[y]) % MOD
        elif op == "MOV":
            regs[x] = regs[y]
        elif op == "SWAP":
            regs[x], regs[y] = regs[y], regs[x]
        elif op == "ADDR":
            idx = regs[y] % 4
            regs[x] = regs[REGISTERS[idx]]
        else:
            raise ValueError(f"unknown opcode {op!r}")
    return regs


def format_lines(program, start_index=1):
    return [f"{i}. {op} {x} {y}" for i, (op, x, y) in enumerate(program, start_index)]


def format_program_prompt(init, program):
    lines = [
        f"Registers start at: a={init['a']}, b={init['b']}, c={init['c']}, d={init['d']}",
        "This is a sequence of instructions over four registers a, b, c, d. All arithmetic is mod 1000.",
        "ADD x y: x = (x + y) mod 1000",
        "SUB x y: x = (x - y) mod 1000",
        "MUL x y: x = (x * y) mod 1000",
        "MOV x y: x = y",
        "SWAP x y: swap the values of x and y",
        "ADDR x y: let i = (value currently in y) mod 4; x = the value currently in "
        "register [a, b, c, d][i] (an indirect load through y's own value)",
        "",
    ]
    lines += format_lines(program)
    lines.append("")
    lines.append(FORMAT_INSTRUCTION)
    return "\n".join(lines)


def format_chunk_prompt(program_chunk, start_index, is_first):
    lines = []
    if is_first:
        lines.append("This is a sequence of instructions over four registers a, b, c, d, "
                      "delivered in several pieces. All arithmetic is mod 1000. The opcodes are:")
        lines.append("ADD x y: x = (x + y) mod 1000.")
        lines.append("SUB x y: x = (x - y) mod 1000.")
        lines.append("MUL x y: x = (x * y) mod 1000.")
        lines.append("MOV x y: x = y.")
        lines.append("SWAP x y: swap the values of x and y.")
        lines.append("ADDR x y: let i = (value currently in y) mod 4; x = the value "
                      "currently in register [a, b, c, d][i].")
        lines.append("")
    lines.append("This is the next part of the sequence." if not is_first
                  else "This is the first part of the sequence, continuing from the "
                       "register values given above.")
    lines += format_lines(program_chunk, start_index)
    lines.append("")
    lines.append("(more of the sequence follows in a later message)")
    return "\n".join(lines)


def parse_reply(text):
    result = {}
    for r in REGISTERS:
        m = re.search(rf"\b{r}\s*=\s*(-?\d+)", text, flags=re.IGNORECASE)
        if not m:
            return None
        result[r] = int(m.group(1)) % MOD
    return result


# -------------------------------------------------------------------- HTTP
def post_chat(base, model, messages, session_id=None, timeout=120):
    url = f"{base}/api/chat"
    body = json.dumps({"model": model, "messages": messages, "stream": False}).encode()
    headers = {"content-type": "application/json"}
    if session_id:
        headers["x-er7-session"] = session_id
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    last_err = None
    for attempt in range(RETRY_MAX + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode()
                return json.loads(raw), attempt
        except urllib.error.HTTPError as e:
            last_err = e
            body_txt = e.read().decode(errors="replace") if e.fp else ""
            retry_after = e.headers.get("Retry-After") if e.headers else None
            if e.code == 429 or e.code >= 500:
                delay = float(retry_after) if retry_after else RETRY_BASE_S * (2 ** attempt)
                if attempt < RETRY_MAX:
                    time.sleep(delay)
                    continue
            raise RuntimeError(f"HTTP {e.code} from {url}: {body_txt[:300]}") from e
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_err = e
            if attempt < RETRY_MAX:
                time.sleep(RETRY_BASE_S * (2 ** attempt))
                continue
            raise RuntimeError(f"connection failure to {url} after {attempt + 1} attempts: {e}") from e
    raise RuntimeError(f"exhausted retries against {url}: {last_err}")


def model_id(arm, model):
    return f"{ER7_MODEL_PREFIX}{model}" if arm == "er7" else model


def base_for(arm):
    return ER7_BASE if arm == "er7" else RAW_BASE


# -------------------------------------------------------------------- runs
def run_single_shot(arm, model, init, program, session_id=None):
    prompt = format_program_prompt(init, program)
    resp, retries = post_chat(base_for(arm), model_id(arm, model),
                               [{"role": "user", "content": prompt}], session_id=session_id)
    text = (resp.get("message") or {}).get("content", "")
    return parse_reply(text), text, retries


def run_chunked(arm, model, init, program, chunk_size, session_id):
    chunks = [program[i:i + chunk_size] for i in range(0, len(program), chunk_size)]
    total_retries = 0
    idx = 1
    for ci, chunk in enumerate(chunks):
        is_first = ci == 0
        content = format_chunk_prompt(chunk, idx, is_first)
        if is_first:
            content = (f"Registers start at: a={init['a']}, b={init['b']}, "
                       f"c={init['c']}, d={init['d']}\n" + content)
        resp, retries = post_chat(base_for(arm), model_id(arm, model),
                                   [{"role": "user", "content": content}],
                                   session_id=session_id)
        total_retries += retries
        idx += len(chunk)
    # the final, bare ask — no program text, no history: only the session
    # (er7) or nothing at all (raw) can answer it
    resp, retries = post_chat(base_for(arm), model_id(arm, model),
                               [{"role": "user", "content": FORMAT_INSTRUCTION}],
                               session_id=session_id)
    total_retries += retries
    text = (resp.get("message") or {}).get("content", "")
    return parse_reply(text), text, total_retries


# ----------------------------------------------------------------- scoring
def score_level(arm, model, level, trials, chunked=None, base_seed=0, verbose=False):
    exact = 0
    reg_correct = 0
    reg_total = 0
    unparsed = 0
    errors = 0
    retries_total = 0
    for t in range(trials):
        seed = base_seed * 1_000_003 + level * 1009 + t
        init, program = gen_program(level, seed)
        truth = run_program(init, program)
        session_id = f"regtest-{arm}-L{level}-T{t}-{seed}"
        try:
            if chunked:
                parsed, text, retries = run_chunked(arm, model, init, program, chunked, session_id)
            else:
                parsed, text, retries = run_single_shot(arm, model, init, program, session_id)
        except Exception as e:
            errors += 1
            if verbose:
                print(f"  [{arm} L={level} t={t}] ERROR: {e}", file=sys.stderr)
            continue
        retries_total += retries
        if parsed is None:
            unparsed += 1
            if verbose:
                print(f"  [{arm} L={level} t={t}] UNPARSED reply: {text[:200]!r}", file=sys.stderr)
            continue
        if parsed == truth:
            exact += 1
        for r in REGISTERS:
            reg_total += 1
            if parsed.get(r) == truth[r]:
                reg_correct += 1
    denom = trials - errors
    return {
        "arm": arm, "level": level, "trials": trials, "errors": errors,
        "unparsed": unparsed, "retries": retries_total,
        "exact_pct": (100.0 * exact / denom) if denom else float("nan"),
        "reg_pct": (100.0 * reg_correct / reg_total) if reg_total else float("nan"),
    }


def print_table(rows, title):
    print(f"\n{title}")
    header = f"{'arm':<5} {'steps':>6} {'exact%':>8} {'per-reg%':>9} {'unparsed':>9} {'errors':>7} {'retries':>8}"
    print(header)
    print("-" * len(header))
    for r in rows:
        print(f"{r['arm']:<5} {r['level']:>6} {r['exact_pct']:>8.1f} {r['reg_pct']:>9.1f} "
              f"{r['unparsed']:>9} {r['errors']:>7} {r['retries']:>8}")


# ------------------------------------------------------------------- CLI
def selftest():
    # interpreter correctness, one opcode at a time, hand-checked
    checks = [
        ({"a": 3, "b": 4, "c": 0, "d": 0}, [("ADD", "a", "b")], {"a": 7, "b": 4, "c": 0, "d": 0}),
        ({"a": 3, "b": 4, "c": 0, "d": 0}, [("SUB", "a", "b")], {"a": 999, "b": 4, "c": 0, "d": 0}),
        ({"a": 30, "b": 40, "c": 0, "d": 0}, [("MUL", "a", "b")], {"a": 200, "b": 40, "c": 0, "d": 0}),  # 1200 % 1000
        ({"a": 3, "b": 4, "c": 0, "d": 0}, [("MOV", "a", "b")], {"a": 4, "b": 4, "c": 0, "d": 0}),
        ({"a": 3, "b": 4, "c": 0, "d": 0}, [("SWAP", "a", "b")], {"a": 4, "b": 3, "c": 0, "d": 0}),
        # ADDR a b: y=b=6 -> idx = 6 % 4 = 2 -> register c (index 2) -> a = c's value = 9
        ({"a": 1, "b": 6, "c": 9, "d": 2}, [("ADDR", "a", "b")], {"a": 9, "b": 6, "c": 9, "d": 2}),
    ]
    ok = True
    for init, program, expected in checks:
        got = run_program(init, program)
        status = "ok" if got == expected else "FAIL"
        if got != expected:
            ok = False
        print(f"  {status}: {program} on {init} -> {got} (expected {expected})")

    # determinism
    i1, p1 = gen_program(20, seed=42)
    i2, p2 = gen_program(20, seed=42)
    det_ok = (i1 == i2 and p1 == p2)
    print(f"  {'ok' if det_ok else 'FAIL'}: same (level, seed) -> identical program")
    ok = ok and det_ok

    # parse round-trip
    parsed = parse_reply("a=12 b=345 c=0 d=999")
    parse_ok = parsed == {"a": 12, "b": 345, "c": 0, "d": 999}
    print(f"  {'ok' if parse_ok else 'FAIL'}: parse_reply on a well-formed reply")
    ok = ok and parse_ok

    parsed_neg_mod = parse_reply("a=-1 b=0 c=0 d=0")
    neg_ok = parsed_neg_mod == {"a": 999, "b": 0, "c": 0, "d": 0}
    print(f"  {'ok' if neg_ok else 'FAIL'}: parse_reply folds a negative value mod 1000")
    ok = ok and neg_ok

    unparsed_ok = parse_reply("I don't know") is None
    print(f"  {'ok' if unparsed_ok else 'FAIL'}: parse_reply returns None on prose with no registers")
    ok = ok and unparsed_ok

    print(f"\nSELFTEST {'PASSED' if ok else 'FAILED'}")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--model", default="gemma2:2b")
    ap.add_argument("--compare", action="store_true", help="run both raw and er7 arms")
    ap.add_argument("--levels", default="5,10,25,50,100")
    ap.add_argument("--trials", type=int, default=10)
    ap.add_argument("--chunked", type=int, default=None, metavar="N",
                     help="send the program N steps at a time instead of in one prompt")
    ap.add_argument("--seed", type=int, default=0, help="base seed (levels/trials are derived from it)")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    levels = [int(x) for x in args.levels.split(",") if x.strip()]
    arms = ["raw", "er7"] if args.compare else ["er7"]

    all_rows = []
    for level in levels:
        for arm in arms:
            print(f"running {arm} @ level={level} trials={args.trials}"
                  f"{f' chunked={args.chunked}' if args.chunked else ''} ...", file=sys.stderr)
            row = score_level(arm, args.model, level, args.trials,
                               chunked=args.chunked, base_seed=args.seed, verbose=args.verbose)
            all_rows.append(row)

    title = f"model={args.model} chunked={args.chunked or 'no (single-shot)'}"
    print_table(all_rows, title)
    return 0


if __name__ == "__main__":
    sys.exit(main())
