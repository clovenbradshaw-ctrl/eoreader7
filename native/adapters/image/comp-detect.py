#!/usr/bin/env python3
# comp-detect.py — the mechanical "where is what" pass for a UI COMP (a design
# mock-up: cards, rows, buttons, a header bar), as the sibling of
# native/eval/lavar/visual-detect.py (which is tuned for DIAGRAMS: filled
# boxes joined by arrows, and which measured exactly one full-image "box" on a
# UI comp — cards bigger than 15% of the image are excluded there by design).
#
# What a comp needs that a diagram does not:
#   - NESTED rectangles, at any size (a page-wide header, a card, the rows in
#     the card, the button in the row) — so the tree is kept, not flattened;
#   - WORDS WITH POSITIONS — tesseract's word boxes, not one full-page string —
#     because the structure of a comp is where its labels sit, not what they say;
#   - the PALETTE the comp actually uses (k-means over its pixels, never a
#     hand-typed list), and each rectangle's own fill and border colour.
#
# Everything here is measurement: no model, no network, no meaning. Reading a
# rectangle as "a card" or a word pair as "a label and its value" is
# native/organs/comp-read.js's job, and it says which positional rule decided.
#
# Output: one JSON object on stdout.
#   { width, height, words:[{text,x,y,w,h,conf,line}], rects:[{id,x,y,w,h,
#     fill:[r,g,b], border:[r,g,b]|null, parent:id|null, depth}], palette:[{rgb,frac}] }
#
# REQUIRES opencv-python-headless + numpy and the `tesseract` binary — the same
# requirement as visual-detect.py, and refused the same way: loudly, never as
# an empty, falsely-clean read.
import json
import subprocess
import sys

import cv2
import numpy as np

MIN_RECT_FRAC = 0.002   # declared: a rectangle smaller than 0.2% of the image is a glyph or a speck, not a component
MAX_RECT_FRAC = 0.97    # declared: the whole-image frame is the canvas, not a component
RECT_FILL = 0.80        # declared: contour area / bounding-box area — how rectangular a contour must be
DUP_IOU = 0.80          # declared: two rectangles this overlapped are one box seen by its outer and inner stroke
MIN_CONF = 45           # declared: tesseract word confidence floor (0-100); below it a word is ink read wrongly more often than right
PALETTE_K = 6           # declared: palette size


def iou(a, b):
    ix = max(0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
    inter = ix * iy
    union = a[2] * a[3] + b[2] * b[3] - inter
    return inter / union if union else 0.0


def contains(outer, inner, slack=4):
    return (inner[0] >= outer[0] - slack and inner[1] >= outer[1] - slack
            and inner[0] + inner[2] <= outer[0] + outer[2] + slack
            and inner[1] + inner[3] <= outer[1] + outer[3] + slack)


def _tsv_words(path, psm, scale, tag):
    out = subprocess.run(["tesseract", path, "stdout", "--psm", str(psm), "tsv"], capture_output=True, text=True, timeout=180)
    if out.returncode != 0:
        raise RuntimeError("tesseract failed: " + out.stderr.strip()[:200])
    words = []
    for row in out.stdout.splitlines()[1:]:
        c = row.split("\t")
        if len(c) < 12:
            continue
        text = c[11].strip()
        try:
            conf = float(c[10])
        except ValueError:
            continue
        if not text or conf < MIN_CONF:
            continue
        words.append({"text": text, "x": int(int(c[6]) / scale), "y": int(int(c[7]) / scale), "w": max(1, int(int(c[8]) / scale)), "h": max(1, int(int(c[9]) / scale)),
                      "conf": round(conf, 1), "line": f"{tag}.{c[2]}.{c[3]}.{c[4]}"})
    return words


def ocr_words(path):
    """Whole-page OCR in TWO readings, because a comp mixes dark-on-light and light-on-dark text and Tesseract reads only the
    first well: the page as it is, and the page inverted (white text on a coloured bar). Each is read at 2x. A word seen by more
    than one reading is kept once, at its higher confidence."""
    import tempfile
    img = cv2.imread(path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    big = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    words = []
    with tempfile.TemporaryDirectory() as tmp:
        for tag, arr in (("n", big), ("i", cv2.bitwise_not(big))):
            f = f"{tmp}/{tag}.png"
            cv2.imwrite(f, arr)
            words.extend(_tsv_words(f, 11, 2, tag))
    return dedupe_words(words)


TEXTURE_INK = 0.45      # declared: ... and more than this share of its pixels differ from its own background (a region of text is mostly background)
TEXTURE_COLOURS = 140   # declared: a region with more distinct colours than this (16 levels per channel) is a picture, not a flat UI area
BUSY_STD = 38           # declared: a word whose surrounding ring varies this much (luminance std) sits on a map or a photograph, not on a UI background
DARK_LUM = 120          # declared: a region whose fill is darker than this (0-255 luminance) is read again from its inverted crop
JUNK_CONF = 90          # declared: a letters-only token of ≤2 characters below this confidence is an icon read as text
JUNK_SHORT_CONF = 80    # declared: a token of ≤3 characters that is not a number/unit, below this confidence, is an icon read as text
PURE_NUMBERISH = set("0123456789.,%°:/-+$€£")


KEEP_MARKS = set("-—–•|/%°$€£:.")


def is_junk(w):
    t = w["text"]
    if not any(c.isalnum() for c in t) and not all(c in KEEP_MARKS for c in t):
        return True  # a glyph that is neither a letter, a digit nor a mark a value can carry: an icon ("©", ">", "~") read as text
    if all(c in PURE_NUMBERISH for c in t):
        return False
    if len(t) <= 2 and t.isalpha() and w["conf"] < JUNK_CONF:
        return True
    return len(t) <= 3 and w["conf"] < JUNK_SHORT_CONF


def polarity_trust(gray, words):
    """Tesseract reads dark-on-light well and light-on-dark only from the inverted page. A word's own ink says which reading to trust:
    if the word's box is LIGHTER than the ring around it the ink is light (trust the inverted pass), else dark (trust the others).
    The reading that disagrees with the ink is down-weighted, so when both passes read the same glyphs the right one wins."""
    H, W = gray.shape
    for w in words:
        x, y, bw, bh = w["x"], w["y"], w["w"], w["h"]
        box = gray[max(0, y):min(H, y + bh), max(0, x):min(W, x + bw)]
        m = 6
        x0, y0, x1, y1 = max(0, x - m), max(0, y - m), min(W, x + bw + m), min(H, y + bh + m)
        outer = gray[y0:y1, x0:x1].astype(np.float64)
        ring_n = outer.size - box.size
        if box.size == 0 or ring_n <= 0:
            continue
        ring_mean = (outer.sum() - box.astype(np.float64).sum()) / ring_n
        ring_sq = ((outer ** 2).sum() - (box.astype(np.float64) ** 2).sum()) / ring_n
        w["busy"] = bool(np.sqrt(max(0.0, ring_sq - ring_mean ** 2)) > BUSY_STD)
        light_ink = float(box.mean()) > ring_mean + 6
        inverted = w["line"].startswith("i")  # "i.<block>…" is the inverted whole-page pass, "i<x>.<y>…" an inverted crop
        # the penalty orders rival readings of one glyph run; it never lowers the word's OWN confidence, so a word only one pass read
        # (a white "23 °C" on a blue bar read by the normal pass) is still judged on what Tesseract said about it
        w["rank"] = round(w["conf"] * (0.6 if inverted != light_ink else 1.0), 1)
    return words


def dedupe_words(words):
    """Overlapping readings of the same ink: keep the higher-ranked one (rank = confidence, down-weighted when the reading's polarity
    disagrees with the ink; ties: the longer text)."""
    words = sorted(words, key=lambda w: (-w.get("rank", w["conf"]), -len(w["text"])))
    kept = []
    for w in words:
        b = (w["x"], w["y"], w["w"], w["h"])
        if any(iou(b, (k["x"], k["y"], k["w"], k["h"])) > 0.4 for k in kept):
            continue
        kept.append(w)
    return kept


def ocr_crop(img, rect, tmp_dir, invert=False):
    """Words inside ONE rectangle, read from its own crop at 2x — sparse full-page OCR loses text that sits inside a bordered
    box (measured on the RoadCast comp: 31 words found, the nine labels and four prices inside boxes missing)."""
    x, y, w, h = rect
    pad = 5
    crop = img[y + pad:y + h - pad, x + pad:x + w - pad]
    if crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 10:
        return []
    big = cv2.resize(crop, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    if invert:
        big = cv2.bitwise_not(cv2.cvtColor(big, cv2.COLOR_BGR2GRAY))
    path = f"{tmp_dir}/crop{'i' if invert else 'n'}-{x}-{y}.png"
    cv2.imwrite(path, big)
    out = subprocess.run(["tesseract", path, "stdout", "--psm", "6", "tsv"], capture_output=True, text=True, timeout=60)
    words = []
    for row in out.stdout.splitlines()[1:]:
        c = row.split("\t")
        if len(c) < 12:
            continue
        text = c[11].strip()
        try:
            conf = float(c[10])
        except ValueError:
            continue
        if not text or conf < MIN_CONF:
            continue
        words.append({"text": text, "x": x + pad + int(c[6]) // 2, "y": y + pad + int(c[7]) // 2, "w": int(c[8]) // 2, "h": int(c[9]) // 2,
                      "conf": round(conf, 1), "line": f"{'i' if invert else 'r'}{x}.{y}.{c[2]}.{c[3]}.{c[4]}"})
    return words


def merge_words(base, extra):
    """Union of two OCR passes; a word seen by both (same text, boxes overlapping) is kept once — the crop's reading wins."""
    out = list(extra)
    for b in base:
        if any(e["text"] == b["text"] and iou((e["x"], e["y"], e["w"], e["h"]), (b["x"], b["y"], b["w"], b["h"])) > 0.3 for e in extra):
            continue
        out.append(b)
    return out


def dominant(region):
    """Most common colour of a region after quantising to 8 levels per channel — the fill, not the glyphs on it."""
    if region.size == 0:
        return [255, 255, 255]
    q = (region.reshape(-1, 3) // 8).astype(np.int32)
    key = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
    vals, counts = np.unique(key, return_counts=True)
    k = int(vals[np.argmax(counts)])
    b, g, r = (k // 1024) * 8 + 4, ((k // 32) % 32) * 8 + 4, (k % 32) * 8 + 4
    return [int(r), int(g), int(b)]


def border_colour(img, x, y, w, h):
    t = 3
    strips = [img[y:y + t, x:x + w], img[y + h - t:y + h, x:x + w], img[y:y + h, x:x + t], img[y:y + h, x + w - t:x + w]]
    strips = [s for s in strips if s.size]
    if not strips:
        return None
    col = dominant(np.concatenate([s.reshape(-1, 3) for s in strips]))
    return col


def palette(img, k=PALETTE_K):
    h, w = img.shape[:2]
    small = cv2.resize(img, (max(1, w // 4), max(1, h // 4)))
    px = small.reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(px, k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=k)
    order = np.argsort(-counts)
    return [{"rgb": [int(centers[i][2]), int(centers[i][1]), int(centers[i][0])], "frac": round(float(counts[i] / len(px)), 4)} for i in order]


VIA = {}  # rectangle -> which pass found it: "stroke" (a visible border), "fill" (a colour), "cut" (the layout cut)


def detect_rects(img):
    h, w = img.shape[:2]
    area = w * h
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cand = []
    # PASS 1 — strokes: a rectangle with a visible border.
    edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0), 30, 100)
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        if not (MIN_RECT_FRAC * area <= bw * bh <= MAX_RECT_FRAC * area):
            continue
        if cv2.contourArea(c) < RECT_FILL * bw * bh and cv2.arcLength(c, True) < 1.6 * (bw + bh):
            continue
        cand.append((x, y, bw, bh))
    # PASS 2 — fills: a rectangle with no border of its own, told from its ground by colour alone.
    # The colour clusters are DISCOVERED (k-means), not listed.
    small = cv2.resize(img, (max(1, w // 2), max(1, h // 2)))
    px = small.reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 1.0)
    _, labels, centers = cv2.kmeans(px, 8, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    bg = np.array(dominant(img)[::-1], dtype=np.float32)  # the canvas colour, BGR
    for col in centers:
        if np.abs(col - bg).max() < 12:
            continue  # the ground, not a component
        mask = cv2.inRange(img, np.clip(col - 14, 0, 255).astype(np.uint8), np.clip(col + 14, 0, 255).astype(np.uint8))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cs:
            x, y, bw, bh = cv2.boundingRect(c)
            if MIN_RECT_FRAC * area <= bw * bh <= MAX_RECT_FRAC * area and cv2.contourArea(c) >= RECT_FILL * bw * bh:
                cand.append((x, y, bw, bh))
                VIA.setdefault((x, y, bw, bh), "fill")
    # one box seen by several strokes/fills -> the OUTER one (largest area first wins)
    cand.sort(key=lambda r: -r[2] * r[3])
    kept = []
    for r in cand:
        if any(iou(r, k) >= DUP_IOU for k in kept):
            continue
        kept.append(r)
    for r in kept:
        VIA.setdefault(r, "stroke")
    # a rectangle that only encloses a single glyph's counter (an 'o', a '0') is not a component
    kept = [r for r in kept if r[2] >= 12 and r[3] >= 12]
    return kept


CUT_GAP = 10        # declared: floor, in pixels, of the empty run that separates two blocks
CUT_GAP_EM = 0.9    # declared: ... and it is at least this many TEXT HEIGHTS (the gap between two lines of one paragraph is shorter than a line; between two list items it is longer)
CUT_INK = 44        # declared: a pixel differs from its region's background when any channel differs by more than this
CUT_EMPTY = 0.012   # declared: a row/column with at most this share of ink pixels is empty
CUT_MIN = 28        # declared: a block smaller than this (either side) is not cut further, nor kept
CUT_DEPTH = 5       # declared: recursion depth of the layout cut


def _runs(mask):
    """Runs of True in a 1-D boolean array as (start, end_exclusive)."""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i)); start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def xy_cut(img, x, y, w, h, depth, axis, out, retry=True, gap=CUT_GAP):
    """The classic layout cut, for screens whose sections are told apart by whitespace and background colour, not by borders:
    find the stretches of rows (then columns) with no ink against the region's own background, cut there, recurse on the other
    axis. Also cuts where the ROW BACKGROUND itself changes (a coloured header over a white body) — no gap is needed there."""
    if depth > CUT_DEPTH or w < CUT_MIN * 2 or h < CUT_MIN * 2:
        return
    sub = img[y:y + h, x:x + w]
    bg = np.array(dominant(sub)[::-1], dtype=np.int32)
    ink = (np.abs(sub.astype(np.int32) - bg).max(axis=2) > CUT_INK)
    if axis == "h":
        proj = ink.sum(axis=1) / float(w)
        empty = proj <= CUT_EMPTY
        # a change of row background: rows whose dominant colour differs from the previous group's
        rowcol = np.array([dominant(sub[i:i + 1])[::-1] for i in range(0, h, 4)], dtype=np.int32)
        change = [0] + [i * 4 for i in range(1, len(rowcol)) if np.abs(rowcol[i] - rowcol[i - 1]).max() > 28]
        cuts = set(change)
        length = h
    else:
        proj = ink.sum(axis=0) / float(h)
        empty = proj <= CUT_EMPTY
        cuts = set()
        length = w
    # blocks = the non-empty runs, merged when the empty gap between them is shorter than CUT_GAP
    runs = _runs(~empty)
    merged = []
    for a, b in runs:
        if merged and a - merged[-1][1] < gap:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    # add the colour-change boundaries as extra cut points between merged runs
    if axis == "h" and len(cuts) > 1:
        bounds = sorted(cuts | {length})
        segs = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1) if bounds[i + 1] - bounds[i] >= CUT_MIN]
        # a colour segment wins when it splits a merged run
        split = []
        for a, b in merged:
            inside = [(max(a, sa), min(b, sb)) for sa, sb in segs if min(b, sb) - max(a, sa) >= CUT_MIN]
            split.extend(inside if len(inside) > 1 else [(a, b)])
        merged = split
    if len(merged) <= 1:
        if retry:  # nothing to cut along this axis: try the other, once
            xy_cut(img, x, y, w, h, depth, "v" if axis == "h" else "h", out, retry=False, gap=gap)
        return
    for a, b in merged:
        if b - a < CUT_MIN:
            continue
        bx, by, bw, bh = (x, y + a, w, b - a) if axis == "h" else (x + a, y, b - a, h)
        out.append((bx, by, bw, bh, "cut", depth))
        xy_cut(img, bx, by, bw, bh, depth + 1, "v" if axis == "h" else "h", out, gap=gap)


def layout_blocks(img, text_h=None):
    h, w = img.shape[:2]
    out = []
    gap = max(CUT_GAP, int(CUT_GAP_EM * text_h)) if text_h else CUT_GAP
    xy_cut(img, 0, 0, w, h, 0, "h", out, gap=gap)
    return [(x, y, bw, bh) for x, y, bw, bh, _, _ in out]


DIVIDER_FRAC = 0.35     # declared: a horizontal line at least this share of the image width long is a divider (a list's separator), not a glyph stroke


def detect_dividers(img):
    """Horizontal rules: long thin lines that separate the entries of a list. Found as the long horizontal runs of the edge map, merged
    when within 3 px of one another."""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 20, 60)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, int(DIVIDER_FRAC * w)), 1))
    lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, k)
    cs, _ = cv2.findContours(lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in cs:
        x, y, bw, bh = cv2.boundingRect(c)
        if bh <= 4 and bw >= DIVIDER_FRAC * w:
            out.append({"y": int(y + bh // 2), "x": int(x), "w": int(bw)})
    out.sort(key=lambda d: d["y"])
    merged = []
    for d in out:
        if merged and d["y"] - merged[-1]["y"] <= 3:
            continue
        merged.append(d)
    return merged


def build_tree(img, rects):
    rects = sorted(rects, key=lambda r: (-r[2] * r[3], r[1], r[0]))
    out = []
    for i, r in enumerate(rects):
        parent = None
        for j in range(i - 1, -1, -1):  # the smallest earlier (= larger-or-equal) rectangle that contains it
            if contains(rects[j], r) and rects[j] != r:
                parent = j
                break
        depth = 0
        p = parent
        while p is not None:
            depth += 1
            p = out[p]["parent"]
        x, y, w, h = r
        inner = img[y + 4:y + h - 4, x + 4:x + w - 4]
        q = (inner.reshape(-1, 3) // 16).astype(np.int32) if inner.size else np.zeros((0, 3), np.int32)
        colours = int(len(np.unique(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]))) if len(q) else 0
        bgc = np.array(dominant(inner)[::-1], dtype=np.int32) if inner.size else np.zeros(3, np.int32)
        ink_share = float((np.abs(inner.astype(np.int32) - bgc).max(axis=2) > 40).mean()) if inner.size else 0.0
        out.append({"id": f"r{i}", "x": x, "y": y, "w": w, "h": h, "fill": dominant(inner), "border": border_colour(img, x, y, w, h),
                    "parent": parent, "depth": depth, "via": VIA.get(r, "stroke"), "colours": colours, "ink": round(ink_share, 3)})
    for o in out:
        o["parent"] = None if o["parent"] is None else out[o["parent"]]["id"]
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: comp-detect.py <image> [--light]   (--light: whole-page OCR only, no per-rectangle crops — the cheap triage pass)")
    path = sys.argv[1]
    light = "--light" in sys.argv[2:]
    img = cv2.imread(path)
    if img is None:
        sys.exit(f"comp-detect.py: cannot read {path}")
    h, w = img.shape[:2]
    words = ocr_words(path)
    rects = detect_rects(img)
    # the layout cut adds the sections that have no border of their own (most real screens); a block that is already a detected
    # rectangle (same box seen twice) is not added again
    heights = sorted(wd["h"] for wd in words if wd["conf"] >= 70 and wd["h"] >= 8)
    text_h = heights[len(heights) // 2] if heights else None
    for b in layout_blocks(img, text_h):
        if b[2] * b[3] < MAX_RECT_FRAC * w * h and not any(iou(b, r) >= DUP_IOU for r in rects):
            rects.append(b)
            VIA[b] = "cut"
    # a rectangle wholly inside one OCR word's box is a glyph's counter (the hole in a 0, the bowl of a 7), not a component
    rects = [r for r in rects if not any(contains((wd["x"], wd["y"], wd["w"], wd["h"]), r, slack=2) for wd in words)]
    tree = build_tree(img, rects)
    import tempfile
    crops = []
    if not light:
        with tempfile.TemporaryDirectory() as tmp:
            parents = {r["parent"] for r in tree}
            for r in tree:
                # a LEAF rectangle with its own border or fill: its whole interior is its own text. A layout-cut block is a region
                # of the page, not a component — its words are already read, better, from the whole page.
                if r["id"] not in parents and r.get("via") != "cut":
                    crops.extend(ocr_crop(img, (r["x"], r["y"], r["w"], r["h"]), tmp))
                # a DARK region (a coloured app bar, a dark theme) has its light text read from the inverted crop — the whole-page
                # inverted pass loses small bold text beside a bright area (measured: an app bar's title read by neither full-page pass)
                fr, fg, fb = r["fill"]
                if r["w"] * r["h"] >= 0.01 * w * h and (0.299 * fr + 0.587 * fg + 0.114 * fb) < DARK_LUM:
                    crops.extend(ocr_crop(img, (r["x"], r["y"], r["w"], r["h"]), tmp, invert=True))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    words = dedupe_words(polarity_trust(gray, words + crops))
    busy = sum(1 for wd in words if wd.get("busy"))
    # a short, low-confidence token is an icon read as text — unless it stands right beside a confidently read word on the same line
    # ("Gas" at 58 beside "Prices" at 96 is a word; a lone "Va" at 53 is a glyph)
    def beside_solid(wd):
        for o in words:
            if o is wd or o["conf"] < 85 or is_junk(o):
                continue
            same_line = abs((o["y"] + o["h"] / 2) - (wd["y"] + wd["h"] / 2)) <= 0.6 * max(o["h"], wd["h"])
            gap = max(o["x"] - (wd["x"] + wd["w"]), wd["x"] - (o["x"] + o["w"]))
            if same_line and gap <= 1.2 * max(o["h"], wd["h"]):
                return True
        return False
    words = [wd for wd in words if (not is_junk(wd) or beside_solid(wd)) and not wd.get("busy")]
    # a TEXTURED region (a map, a photograph: many more distinct colours than a flat UI area) carries text that belongs to the picture
    # and not to the app ("Hamburg", "Steinwerder" on a map tile) — its words are dropped, and counted
    def has_big_child(r):
        return any(c["parent"] == r["id"] and c["w"] * c["h"] >= 0.25 * r["w"] * r["h"] for c in tree)
    textured = [r for r in tree if r["w"] * r["h"] >= 0.04 * w * h and r["colours"] > TEXTURE_COLOURS and r["ink"] > TEXTURE_INK and not has_big_child(r)]
    def in_textured(wd):
        cx, cy = wd["x"] + wd["w"] / 2, wd["y"] + wd["h"] / 2
        return any(r["x"] <= cx <= r["x"] + r["w"] and r["y"] <= cy <= r["y"] + r["h"] for r in textured)
    in_pic = sum(1 for wd in words if in_textured(wd))
    words = [wd for wd in words if not in_textured(wd)]
    busy += in_pic
    result = {"width": w, "height": h, "words": words, "rects": tree, "palette": palette(img), "light": light, "busyWordsDropped": busy, "dividers": detect_dividers(img)}
    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
