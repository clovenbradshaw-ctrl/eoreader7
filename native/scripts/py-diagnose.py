#!/usr/bin/env python3
"""py-diagnose.py — executed expected-vs-actual for a failed patch (ast only + sealed eval).

Usage: py-diagnose.py <solution.py> <test_body.py> <entry_point>

Parses the TEST file with ast (never execs it). For each `assert
<entry>(<args>) == <literal>` it evaluates the call against the CURRENT
solution file and the right-hand side via literal_eval, then prints one
line per assert:

  ARGS=<repr of arg tuple> GOT=<repr, truncated> WANT=<repr, truncated>

When the call raises, GOT=RAISED:<ExcName>:<message>. Anything
unavailable (unparseable assert, non-literal want, import failure)
prints as GOT=WANT=unavailable — a skipped probe, never a guess. First
3 asserts only; every repr capped at 200 chars. Exit 0 always (the
caller, not this script, decides what the diagnosis means).

Trust: same as check.py — the solution file already runs under the
caller's test command. This script adds no new execution of mouth code
beyond calling the entry point with the test's own literal arguments.
"""
import ast
import importlib.util
import json
import sys

CAP_ASSERTS = 3
CAP_REPR = 200


def short(v):
    r = repr(v)
    return r if len(r) <= CAP_REPR else r[:CAP_REPR] + "…"


def typename(v):
    if isinstance(v, (list, tuple)):
        return type(v).__name__ + "(len %d)" % len(v)
    return type(v).__name__


def input_relations(inp, want):
    """Verified input->want mappings (test data only). Each reported
    relation was CHECKED, never inferred: first-letters-of-words,
    case folds, reversal, strip, affix. Names the mapping; the mouth
    still authors every byte of the fix."""
    import re as _re
    rels = []
    try:
        words = [p for p in _re.split(r"\s+", inp.strip()) if p]
        wparts = [p for p in _re.split(r"[^A-Za-z0-9]+", want) if p]
        if words and wparts and len(words) == len(wparts) and all(
                w.upper() == g[:1].upper() for w, g in zip(wparts, words)):
            rels.append("want-parts are the FIRST LETTERS of the input words: %s -> %s"
                        % (short(words)[:100], short(wparts)[:100]))
        if want == inp.upper():
            rels.append("want is the input uppercased")
        if want == inp.lower():
            rels.append("want is the input lowercased")
        if want == inp.strip():
            rels.append("want is the input stripped")
        if want == inp[::-1]:
            rels.append("want is the input reversed")
        if want.upper().startswith(inp.upper()) and len(want) > len(inp):
            rels.append("want is the input plus %s at the end" % short(want[len(inp):]))
    except Exception:
        pass
    return rels


def contrast(got, want):
    """Mechanical got-vs-want extras, single-line, facts only:
    [types A->B], [diff at i: got X want Y], [list(got)==want]."""
    bits = []
    tg, tw = typename(got), typename(want)
    if tg != tw:
        bits.append("[types %s->%s]" % (tg, tw))
    if type(got) is type(want) and isinstance(got, (str, list, tuple)):
        n = min(len(got), len(want))
        for i in range(n):
            if got[i] != want[i]:
                bits.append("[diff at %d: got %s want %s]" % (i, short(got[i]), short(want[i])))
                break
        else:
            if len(got) != len(want):
                bits.append("[common prefix %d long; lengths %d->%d]" % (n, len(got), len(want)))
    if isinstance(got, str) and isinstance(want, str):
        import re as _re
        gt = [p for p in _re.split(r"[^A-Za-z0-9]+", got) if p]
        wt = [p for p in _re.split(r"[^A-Za-z0-9]+", want) if p]
        if gt != wt:
            bits.append("[parts got %s want %s]" % (short(gt)[:120], short(wt)[:120]))
        # Verified relations between observed got-parts and want-parts
        # (FlashFill-style witnesses: checked facts, never guesses). Each
        # names the operation without writing any code.
        rels = []
        try:
            if gt and wt and len(gt) == len(wt) and all(w == g[:1] for w, g in zip(wt, gt)):
                rels.append("want-parts are the FIRST LETTERS of got-parts")
            if got.upper() == want:
                rels.append("want is got uppercased")
            if got.lower() == want:
                rels.append("want is got lowercased")
            if got.strip() == want:
                rels.append("want is got stripped")
            if got[::-1] == want:
                rels.append("want is got reversed")
            # Affix relations (case-insensitive): want is got plus a
            # fixed head/tail. Names the missing bytes without writing code.
            gu, wu = got.upper(), want.upper()
            if wu.startswith(gu) and len(wu) > len(gu):
                rels.append("want is your return (uppercased) plus %s at the end" % short(want[len(got):]))
            elif wu.endswith(gu) and len(wu) > len(gu):
                rels.append("want is %s plus your return (uppercased) at the start" % short(want[:len(want) - len(got)]))
        except Exception:
            pass
        for rel in rels:
            bits.append("[%s]" % rel)
    if not isinstance(got, list) and isinstance(want, list):
        try:
            import itertools
            material = list(itertools.islice(iter(got), 0, 1000))
            if material == want:
                bits.append("[list(your_return)==want]")
        except Exception:
            pass
    return (" " + " ".join(bits)) if bits else ""


def main():
    sol_path, test_path, entry = sys.argv[1], sys.argv[2], sys.argv[3]
    try:
        test_src = open(test_path).read()
        tree = ast.parse(test_src)
    except Exception as e:
        print("GOT=unavailable WANT=unavailable NOTE=test-unparseable:" + type(e).__name__)
        return
    try:
        spec = importlib.util.spec_from_file_location("_diag_solution", sol_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        fn = getattr(mod, entry)
    except Exception as e:
        print("GOT=unavailable WANT=unavailable NOTE=solution-unimportable:" + type(e).__name__)
        return
    shown = 0
    for node in ast.walk(tree):
        if shown >= CAP_ASSERTS:
            break
        if not isinstance(node, ast.Assert):
            continue
        t = node.test
        if not (isinstance(t, ast.Compare) and len(t.ops) == 1
                and isinstance(t.ops[0], ast.Eq)
                and isinstance(t.left, ast.Call)
                and isinstance(t.left.func, ast.Name)
                and t.left.func.id == entry):
            continue
        try:
            want = ast.literal_eval(t.comparators[0])
        except Exception:
            continue
        try:
            argvals = [ast.literal_eval(a) for a in t.left.args]
            if t.left.keywords:
                raise ValueError("kwargs")
        except Exception:
            continue
        try:
            got = fn(*argvals)
            got_s = short(got) + contrast(got, want)
        except Exception as e:
            got_s = "RAISED:" + type(e).__name__ + ":" + str(e)[:100]
        # Input->want relations: verified facts about the TASK (test data
        # only — no mouth code involved), same status as the ARGS/WANT
        # lines the probe already shows. Names the required input mapping
        # when got-surgery stalls (Basic/15: 40 draws of whole-word bodies
        # while the answer is first-letters-of-input).
        if len(argvals) == 1 and isinstance(argvals[0], str) and isinstance(want, str):
            irels = input_relations(argvals[0], want)
            if irels:
                got_s += " " + " ".join("[input->want: %s]" % r for r in irels)
        print("ARGS=" + short(tuple(argvals)) + " GOT=" + got_s + " WANT=" + short(want))
        shown += 1


main()
