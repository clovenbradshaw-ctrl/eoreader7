"""er7 — the fold's tools, importable from any notebook cell (`from er7 import *` is already done for you).

Everything here reports what it found and what it did not; nothing interprets meaning.

  data(name)            the text of an ingested file          table(name, i=0)   its i-th table as a list of dicts
  files()               names of everything ingested          tools()            print what is installed and what er7 offers
  ocr(png)              Tesseract on a picture (text)         look(png, gap=16)  OpenCV: glyph clusters stacked at one x
  render(tex, out)      typeset a line (mathtext) to a PNG    boxes(png, out)    draw the clusters OpenCV found
  save(name)            keep the current matplotlib figure    show()             same, name chosen for you
  scope_range(lo,hi,label=None) / scope_sample(n,seed,label=None) / scope_instance(label)
                        state what a check covered (the bench reads this, you do not pass it in)
  result(True/False)    state the check's verdict            wmean(v,e) chi2dof(v,e) tension(a,ea,b,eb)
  perm_p(stat, sample, n=2000, seed=0)   exact-count null: how often does sample() reach stat?
"""
import os, sys, json, csv, subprocess, importlib, tempfile, io, math, random

_HERE = os.path.dirname(os.path.abspath(__file__))
_VISION = os.path.join(_HERE, "..", "vision.py")
_DATA = "data"

def files():
    return sorted(f for f in os.listdir(_DATA)) if os.path.isdir(_DATA) else []

def data(name):
    """Text of an ingested file. `name` may be the original name or the on-disk name."""
    for f in files():
        if f == name or f == name + ".txt" or f.startswith(name.replace(" ", "_") + ".txt"):
            return open(os.path.join(_DATA, f), encoding="utf8").read()
    raise FileNotFoundError("no ingested file %r; have: %s" % (name, ", ".join(files()) or "none"))

def table(name, i=0):
    """The i-th table of an ingested file as a list of dicts (values are strings; you convert)."""
    cands = [f for f in files() if f.endswith(".csv") and f.startswith(name.replace(" ", "_"))]
    if not cands: raise FileNotFoundError("no table for %r; tables: %s" % (name, ", ".join(f for f in files() if f.endswith(".csv")) or "none"))
    return list(csv.DictReader(open(os.path.join(_DATA, cands[i]), encoding="utf8")))

def _vision(req):
    r = subprocess.run([sys.executable, _VISION], input=json.dumps(req), capture_output=True, text=True)
    try: return json.loads(r.stdout)
    except Exception: return {"error": (r.stderr or "vision failed")[-300:]}

def ocr(png, psm=6, whitelist=None):
    """Tesseract's reading of a picture — a reading, not the truth; check figures against the image."""
    cmd = ["tesseract", png, "stdout", "--psm", str(psm)] + (["-c", "tessedit_char_whitelist=" + whitelist] if whitelist else [])
    return subprocess.run(cmd, capture_output=True, text=True).stdout.strip()

def look(png, gap=16):
    """OpenCV: clusters of glyphs stacked one above another at the same x (sub/superscript pairs)."""
    return _vision({"mode": "stacked", "png": png, "gap": gap})

def render(tex, out="out/render.png"):
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    return _vision({"mode": "render", "text": tex, "out": out})

def boxes(png, out="out/boxes.png", gap=16):
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    return _vision({"mode": "annotate", "png": png, "out": out, "gap": gap})

def save(name="fig"):
    import matplotlib.pyplot as plt
    os.makedirs("out", exist_ok=True); plt.savefig("out/%s.png" % name, dpi=110, bbox_inches="tight"); plt.close("all")
_n = [0]
def show():
    _n[0] += 1; save("fig%d" % _n[0])

def scope_range(lo, hi, label=None): print("#scope " + json.dumps({"kind": "range", "lo": lo, "hi": hi, **({"label": label} if label else {})}))
def scope_sample(n, seed, label=None): print("#scope " + json.dumps({"kind": "sample", "n": n, "seed": seed, **({"label": label} if label else {})}))
def scope_instance(label): print("#scope " + json.dumps({"kind": "instance", "label": label}))
def result(ok): print("#result " + ("true" if ok else "false"))

def wmean(v, e):
    w = [1 / x ** 2 for x in e]; return sum(a * b for a, b in zip(w, v)) / sum(w)
def chi2dof(v, e):
    m = wmean(v, e); return sum(((a - m) / b) ** 2 for a, b in zip(v, e)) / max(1, len(v) - 1)
def tension(a, ea, b, eb): return abs(a - b) / math.sqrt(ea ** 2 + eb ** 2)
def perm_p(stat, sample, n=2000, seed=0):
    """Fraction of n draws of sample(rng) whose value is >= stat. sample takes a random.Random."""
    rng = random.Random(seed); return sum(1 for _ in range(n) if sample(rng) >= stat) / n

_PKGS = ["numpy", "matplotlib", "cv2", "PIL", "yaml", "jinja2", "requests", "dateutil", "xmltodict", "scipy", "pandas", "sympy", "sklearn", "statsmodels"]
def tools():
    print("python", sys.version.split()[0], "· no network in this kernel" if os.environ.get("ER7_ISOLATED") else "")
    for p in _PKGS:
        try: m = importlib.import_module(p); print("  %-12s %s" % (p, getattr(m, "__version__", "")))
        except Exception: print("  %-12s (not installed)" % p)
    print("  tesseract", "yes" if subprocess.run(["which", "tesseract"], capture_output=True).returncode == 0 else "no")
    print("er7:", ", ".join(n for n in ["data", "table", "files", "ocr", "look", "render", "boxes", "save", "show", "scope_range", "scope_sample", "scope_instance", "result", "wmean", "chi2dof", "tension", "perm_p"]))
