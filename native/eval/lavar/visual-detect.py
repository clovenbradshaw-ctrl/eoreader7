#!/usr/bin/env python3
# visual-detect.py — the mechanical "where is it" pass for a raster image,
# handed off to Python/OpenCV because that IS what the discipline already
# named for this: the very first OCR-pipeline diagram this project was
# tested against labels its own layout step "Open CV", and no pure-JS
# equivalent is installed or assumed. visual-rec.mjs shells out to this
# script exactly the way structure-rec.mjs's tier 3 shells out to Ollama
# for a capability this codebase doesn't reimplement itself — an external
# process called for one well-scoped job, not a rewrite of OpenCV in JS.
#
# TWO REAL FAILURE MODES, found by testing, not assumed up front:
#   1. A plain Canny-edge contour pass finds a WHITE/bordered box (the OCR
#      pipeline diagram's own boxes) but is BLIND to a box that is only
#      distinguished by its FILL COLOR with no strong edge of its own
#      (the clinical flowchart's yellow/green/orange/grey boxes) — measured
#      directly: it found 7/8 real boxes on the clean diagram and covered
#      well under half of the colored flowchart's real boxes.
#   2. A color-fill pass (k-means-discovered palette — never a hand-typed
#      "yellow/green/grey" guess, so a different diagram's own colors are
#      still found) with a closing kernel large enough to bridge speckle
#      ALSO bridges two genuinely separate same-colored panels sitting a
#      few pixels apart into one giant box — measured directly on the
#      flowchart (one merged box covered nearly the whole page) and fixed
#      by shrinking the closing kernel plus a convexity-defect split: a
#      blob whose convex hull area is much larger than its own contour
#      area is probably two boxes joined by a thin bridge, not one box.
#
# Both passes run and are reconciled (by IoU, not blind concatenation) —
# color for filled boxes, edges for a plain white/bordered box the color
# pass explicitly skips (white is treated as background, not a fill).
#
# DISCLOSED, NOT SOLVED: a box whose interior text darkens its own mean
# brightness below the white-detection bar is a real, named miss (the
# "Clinical Pattern Recognition" box on the real flowchart tested against —
# this script will not silently invent a region for it). Connector/arrow
# DETECTION is only attempted when the caller names the arrow's own color
# (`--arrow-color`) — arrows sharing the same black as box borders (the
# flowchart's own case) have no known way to separate "border" from
# "connector" from color alone, and this script refuses rather than guess.
import sys
import json
import argparse
import subprocess
import tempfile
import os

import cv2
import numpy as np


def discover_fill_boxes(img, k=10, min_frac=0.01, exclude_color=None):
    h, w = img.shape[:2]
    small = cv2.resize(img, (w // 2, h // 2))
    pixels = small.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 5, cv2.KMEANS_RANDOM_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=k)
    total = pixels.shape[0]

    boxes = []
    for color, count in zip(centers, counts):
        frac = count / total
        b, g, r = color
        if min(b, g, r) > 235 or max(b, g, r) < 60 or frac < min_frac:
            continue  # background (near-white), line-art (near-black), or noise
        # A cluster the caller already knows is the CONNECTOR color (passed
        # once, not re-discovered) is not also a box fill — found needed by
        # running this on the pipeline diagram: the arrow chevrons' own
        # purple was close enough to a legitimate k-means cluster that it
        # was read as seven extra "boxes" with empty OCR text, alongside the
        # two diagonal connector LINES to "Open CV" (large solid-color
        # regions in their own right). Both are real connectors, not boxes.
        if exclude_color is not None and max(abs(int(b) - exclude_color[0]), abs(int(g) - exclude_color[1]), abs(int(r) - exclude_color[2])) < 30:
            continue
        lower = np.clip(color - 16, 0, 255).astype(np.uint8)
        upper = np.clip(color + 16, 0, 255).astype(np.uint8)
        mask = cv2.inRange(img, lower, upper)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            if bw * bh < (w * h) * 0.003:
                continue
            for (sx, sy, sw, sh) in _split_by_convexity(c, x, y, bw, bh):
                boxes.append((sx, sy, sw, sh, tuple(int(v) for v in color)))
    return boxes


def _split_by_convexity(contour, x, y, bw, bh):
    area = cv2.contourArea(contour)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    if hull_area == 0 or area / hull_area > 0.72:
        return [(x, y, bw, bh)]
    mask = np.zeros((bh, bw), np.uint8)
    cv2.drawContours(mask, [contour - [x, y]], -1, 255, -1)
    if bw >= bh:
        mid = bw // 2
        halves = [(x, y, mid, bh), (x + mid, y, bw - mid, bh)]
    else:
        mid = bh // 2
        halves = [(x, y, bw, mid), (x, y + mid, bw, bh - mid)]
    out = []
    for hx, hy, hw, hbh in halves:
        sub = mask[hy - y:hy - y + hbh, hx - x:hx - x + hw]
        if sub.size and (sub > 0).sum() / sub.size > 0.5:
            out.append((hx, hy, hw, hbh))
    return out if out else [(x, y, bw, bh)]


def discover_edge_boxes(img, brightness_floor=170, std_ceiling=70):
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        x, y, bw, bh = cv2.boundingRect(c)
        area = bw * bh
        if not (4 <= len(approx) <= 8 and (w * h) * 0.003 < area < (w * h) * 0.15):
            continue
        roi = img[y + 4:y + bh - 4, x + 4:x + bw - 4]
        if roi.size and np.mean(roi) > brightness_floor and np.std(roi) < std_ceiling:
            boxes.append((x, y, bw, bh))
    return boxes


def iou(a, b):
    ax, ay, aw, ah = a[:4]
    bx, by, bw, bh = b[:4]
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
    iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    inter = ix * iy
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0


def mostly_inside(small, big, thresh=0.5):
    # IoU alone misses this: a small box nested INSIDE a much larger one
    # (a text-line fragment inside a big colored panel) has LOW IoU purely
    # because the areas are so different, even though it is a pure
    # duplicate of part of the big box — found on the flowchart, where the
    # loosened white-box brightness bar (needed for "Clinical Pattern
    # Recognition") also let through several sub-region slivers nested
    # inside already-detected colored panels.
    ax, ay, aw, ah = small[:4]
    bx, by, bw, bh = big[:4]
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
    iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    inter = ix * iy
    area = aw * ah
    return (inter / area) > thresh if area else False


def dedupe(boxes, thresh=0.55):
    kept = []
    for b in sorted(boxes, key=lambda b: -b[2] * b[3]):
        if all(iou(b, k) < thresh for k in kept):
            kept.append(b)
    return kept


def ocr_crop(img, region, pad=3):
    x, y, bw, bh = region
    crop = img[max(0, y + pad):y + bh - pad, max(0, x + pad):x + bw - pad]
    if crop.size == 0:
        return ""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        cv2.imwrite(tf.name, crop)
        path = tf.name
    try:
        result = subprocess.run(["tesseract", path, "-"], capture_output=True, text=True, timeout=30)
        return result.stdout.strip()
    finally:
        os.unlink(path)


def find_connectors(img, arrow_color_bgr, boxes):
    color = np.array(arrow_color_bgr)
    lower = np.clip(color - 25, 0, 255).astype(np.uint8)
    upper = np.clip(color + 25, 0, 255).astype(np.uint8)
    mask = cv2.inRange(img, lower, upper)
    n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask)

    def box_center(b):
        x, y, bw, bh = b["region"]
        return (x + bw / 2, y + bh / 2)

    def dist(p, q):
        return ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2) ** 0.5

    connectors = []
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area < 300 or bh <= 2:
            continue  # border anti-aliasing sliver, not a real connector blob
        cx, cy = centroids[i]
        ranked = sorted(boxes, key=lambda b: dist(box_center(b), (cx, cy)))
        if len(ranked) < 2:
            continue
        connectors.append({
            "region": [int(x), int(y), int(bw), int(bh)],
            "connects": [ranked[0]["id"], ranked[1]["id"]],
            "direction": "undetermined",  # apex/base shape analysis not built
        })
    return connectors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--arrow-color", help="B,G,R of a known connector color, e.g. 180,49,140 — only run when the caller actually knows this; refused otherwise, not guessed")
    args = ap.parse_args()

    img = cv2.imread(args.image)
    if img is None:
        print(json.dumps({"error": f"could not read {args.image}"}))
        sys.exit(1)

    arrow_bgr = [int(v) for v in args.arrow_color.split(",")] if args.arrow_color else None

    fill_boxes = discover_fill_boxes(img, exclude_color=arrow_bgr)
    fill_regions = [(x, y, bw, bh) for x, y, bw, bh, _ in fill_boxes]
    edge_boxes = discover_edge_boxes(img)
    edge_boxes = [b for b in edge_boxes if all(iou(b, e) < 0.3 and not mostly_inside(b, e) for e in fill_regions)]

    all_regions = dedupe(fill_regions + edge_boxes)
    all_regions = [r for r in all_regions if not any(mostly_inside(r, other) for other in all_regions if other != r and other[2] * other[3] > r[2] * r[3])]
    boxes = []
    for i, region in enumerate(sorted(all_regions, key=lambda r: (r[1], r[0]))):
        text = ocr_crop(img, region)
        # A small region with literally no OCR text is far more likely a
        # border/line fragment than a real, unlabeled box — a real box
        # this size always carries SOME label. Kept for a large region
        # even with empty text (a chart or figure genuinely has no text).
        if not text and region[2] * region[3] < 3000:
            continue
        boxes.append({"id": f"b{i}", "region": list(map(int, region)), "text": text})

    connectors = []
    if arrow_bgr:
        connectors = find_connectors(img, arrow_bgr, boxes)

    print(json.dumps({"image": args.image, "boxes": boxes, "connectors": connectors}, indent=2))


if __name__ == "__main__":
    main()
