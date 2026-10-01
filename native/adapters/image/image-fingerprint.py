#!/usr/bin/env python3
# image-fingerprint.py — what an image IS, by measurement alone: its size, and a 64-bit difference hash
# (dHash of a 9x8 grayscale thumbnail: bit = this pixel brighter than its right neighbour). A recompressed or
# resized copy of a picture keeps the hash within a few bits, which is how native/organs/comp-research.js's
# likenessOf tells a near-copy from a resemblance. With --png OUT the image is also re-saved as RGB PNG, so
# every later stage (OpenCV, Tesseract, the vision model) reads one format whatever the page served.
#   usage: image-fingerprint.py <image> [--png OUT.png] [--max-side N]
# prints one JSON object: { width, height, dhash, lum9x8:[72 ints], png }
import json
import sys

from PIL import Image

path = sys.argv[1]
out_png = sys.argv[sys.argv.index("--png") + 1] if "--png" in sys.argv else None
max_side = int(sys.argv[sys.argv.index("--max-side") + 1]) if "--max-side" in sys.argv else None
im = Image.open(path)
im.load()
if im.mode in ("RGBA", "LA", "P"):
    rgba = im.convert("RGBA")
    bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    bg.alpha_composite(rgba)
    im = bg
im = im.convert("RGB")
w, h = im.size
small = im.convert("L").resize((9, 8), Image.LANCZOS)
lum = list(small.tobytes())
bits = "".join("1" if lum[y * 9 + x] > lum[y * 9 + x + 1] else "0" for y in range(8) for x in range(8))
if out_png:
    o = im
    if max_side and max(w, h) > max_side:
        k = max_side / max(w, h)
        o = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
    o.save(out_png, "PNG")
json.dump({"width": w, "height": h, "dhash": bits, "lum9x8": lum, "png": out_png}, sys.stdout)
