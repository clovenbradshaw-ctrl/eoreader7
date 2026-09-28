#!/usr/bin/env python3
"""vision.py — the image senses of hardread.mjs: typeset -> look (OpenCV) -> read (Tesseract).

One JSON request on stdin, one JSON reply on stdout. Modes:
  render  {text, out}             typeset a region as a person sees it (TeX sub/superscripts as real
                                  sub/superscripts) and write a PNG.  -> {typeset, png}
  ocr     {png}                   whole-line OCR.                     -> {text}
  stacked {png}                   OpenCV: find glyph clusters stacked one above another at the same x
                                  (a sub/superscript pair), OCR each cluster with a digit whitelist,
                                  return them top-to-bottom.          -> {stacks:[{x, upper, lower}]}
Nothing here interprets meaning; it reports what the image shows and what the OCR read from it.
"""
import sys, json, re, subprocess, tempfile, os

def render(req):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    text = req["text"]
    # typeset the maths: wrap the whole line as mathtext only when it carries TeX structure
    tex = bool(re.search(r"[_^]\{|\\pm|\$", text))
    body = text.replace("$", "").replace("\\pm", r"\pm ").replace(r"\rm", "")
    body = re.sub(r"([_^])\{([^}]*)\}", lambda m: m.group(1) + "{" + m.group(2) + "}", body)
    label = "$" + body.replace(" ", r"\ ") + "$" if tex else body
    fig = plt.figure(figsize=(0.1, 0.1), dpi=300)
    typeset = True
    try:
        fig.text(0, 0, label, fontsize=22)
        fig.canvas.draw()
    except Exception:
        typeset = False
        plt.close(fig); fig = plt.figure(figsize=(0.1, 0.1), dpi=300)
        fig.text(0, 0, body, fontsize=22)
    fig.savefig(req["out"], dpi=300, bbox_inches="tight", pad_inches=0.25, facecolor="white")
    return {"typeset": typeset and tex, "png": req["out"]}

def ocr_png(png, psm=7, whitelist=None):
    cmd = ["tesseract", png, "stdout", "--psm", str(psm)]
    if whitelist: cmd += ["-c", f"tessedit_char_whitelist={whitelist}"]
    return subprocess.run(cmd, capture_output=True, text=True).stdout.strip()

def _crop_ocr(img, b, cv2, whitelist="0123456789.+-"):
    x0, y0, x1, y1 = b
    crop = img[max(0, y0 - 6):y1 + 6, max(0, x0 - 6):x1 + 6]
    crop = cv2.resize(crop, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    crop = cv2.copyMakeBorder(crop, 24, 24, 24, 24, cv2.BORDER_CONSTANT, value=255)
    p = tempfile.mktemp(suffix=".png"); cv2.imwrite(p, crop)
    t = ocr_png(p, psm=7, whitelist=whitelist); os.unlink(p)
    return t

def stacked(req):
    """Merge glyphs into TOKEN blobs (a wide dilation), then look for a pair of tokens that share an
    x-range, sit one above the other, and are each shorter than the line's baseline tokens: that is
    the geometry of a super/subscript pair. The token to their left on the baseline is their base."""
    import cv2, numpy as np
    img = cv2.imread(req["png"], cv2.IMREAD_GRAYSCALE)
    _, bw = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    merged = cv2.dilate(bw, cv2.getStructuringElement(cv2.MORPH_RECT, (int(req.get("gap", 14)), 3)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(merged, 8)
    toks = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area < 200: continue
        ink = np.where(bw[y:y + h, x:x + w] > 0)   # tighten the box to the ink itself
        toks.append((x + ink[1].min(), y + ink[0].min(), x + ink[1].max() + 1, y + ink[0].max() + 1))
    toks.sort()
    tallest = max((t[3] - t[1] for t in toks), default=0)
    out = []
    for i, A in enumerate(toks):
        for B in toks[i + 1:]:
            if A[1] > B[1]: top, bot = B, A
            else: top, bot = A, B
            ov = min(top[2], bot[2]) - max(top[0], bot[0])
            narrow = min(top[2] - top[0], bot[2] - bot[0])
            small = (top[3] - top[1]) < 0.8 * tallest and (bot[3] - bot[1]) < 0.8 * tallest
            if narrow > 0 and ov / narrow > 0.6 and top[3] <= bot[1] + 4 and small:
                left = [t for t in toks if t[2] <= min(top[0], bot[0]) + 2 and (t[3] - t[1]) >= 0.8 * tallest]
                base = max(left, key=lambda t: t[2]) if left else None
                # read each BAND whole (from the base's right edge to the ink's end), not the blob the
                # gap happened to cut: a kerned "1.7" can split into two blobs at one gap and merge at another
                W = img.shape[1]
                # the base's true right edge = the rightmost TALL raw glyph starting before the stack
                # (the dilated blob may have swallowed the '+' that leads the superscript)
                nr, _, sr, _ = cv2.connectedComponentsWithStats(bw, 8)
                tall = [sr[k] for k in range(1, nr) if sr[k][3] >= 0.8 * tallest and sr[k][0] <= min(top[0], bot[0])]
                x_from = int(max(t[0] + t[2] for t in tall)) + 3 if tall else max(0, min(top[0], bot[0]) - 4)
                # the base number = the contiguous run of tall raw glyphs ending at the stack, read whole
                band_top = min(t[1] for t in tall); band_bot = max(t[1] + t[3] for t in tall) if tall else 0
                inband = [sr[k] for k in range(1, nr) if sr[k][4] > 12 and band_top <= sr[k][1] + sr[k][3] / 2 <= band_bot and sr[k][0] + sr[k][2] <= x_from]
                talls = sorted(inband, key=lambda t: t[0], reverse=True)
                run = []
                for t in talls:
                    if run and run[-1][0] - (t[0] + t[2]) > 0.3 * tallest: break
                    run.append(t)
                base_run = ""
                if run:
                    bx = (min(t[0] for t in run), min(t[1] for t in run), max(t[0] + t[2] for t in run), max(t[1] + t[3] for t in run))
                    base_run = _crop_ocr(img, bx, cv2, whitelist="0123456789.-")
                bands = []
                for b in (top, bot):
                    rows = bw[b[1]:b[3], x_from:W]
                    cols = np.where(rows.any(axis=0))[0]
                    bands.append((x_from + int(cols.min()), b[1], x_from + int(cols.max()) + 1, b[3]) if len(cols) else b)
                out.append({"boxes": {"top": [int(v) for v in bands[0]], "bot": [int(v) for v in bands[1]], "base": [int(v) for v in bx] if run else None},
                            "x": int(x_from), "upper": _crop_ocr(img, bands[0], cv2), "lower": _crop_ocr(img, bands[1], cv2),
                            "base": base_run, "gap": int(req.get("gap", 14))})
    return {"stacks": out}

def annotate(req):
    """Draw what the CV sense decided onto the picture it looked at: the base number (blue), the
    stacked pair (red / orange), and what OCR read from each, written beneath."""
    import cv2
    img = cv2.imread(req["png"]); s = stacked(req)
    h, w = img.shape[:2]
    canvas = cv2.copyMakeBorder(img, 0, 90, 0, 0, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    seen = set(); labeled = False
    for st in s["stacks"]:
        b = st["boxes"]
        if (b["top"][0], b["top"][1]) in seen: continue
        seen.add((b["top"][0], b["top"][1]))
        if not (re.match(r"^\+\d", st["upper"].strip()) and re.match(r"^-\d", st["lower"].strip())): continue  # only pairs that read as +n over -n
        if b["base"]: cv2.rectangle(canvas, (b["base"][0], b["base"][1]), (b["base"][2], b["base"][3]), (200, 120, 0), 3)
        cv2.rectangle(canvas, (b["top"][0], b["top"][1]), (b["top"][2], b["top"][3]), (0, 0, 220), 3)
        cv2.rectangle(canvas, (b["bot"][0], b["bot"][1]), (b["bot"][2], b["bot"][3]), (0, 140, 255), 3)
        if not labeled:  # one caption: the first pair that reads as +n over -n (later gap settings re-find the same pair)
            cv2.putText(canvas, f"base {st['base']}  upper {st['upper']}  lower {st['lower']}   (gap {st.get('gap')})", (20, h + 55), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (40, 40, 40), 2, cv2.LINE_AA)
            labeled = True
    cv2.imwrite(req["out"], canvas)
    return {"png": req["out"], "stacks": len(s["stacks"])}

if __name__ == "__main__":
    req = json.load(sys.stdin)
    mode = req["mode"]
    out = render(req) if mode == "render" else {"text": ocr_png(req["png"])} if mode == "ocr" else annotate(req) if mode == "annotate" else stacked(req)
    print(json.dumps(out))
