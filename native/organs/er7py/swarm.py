"""swarm — the moves and the judges an ant colony uses to find structure in one numeric series. numpy only.

An ant builds a PIPELINE: up to three transforms of the series, then one statistic. Nothing here says which pipelines matter;
the colony finds that out. A pipeline is judged against two nulls built to fail:
  shuffle  the same values in random time order — destroys ALL temporal structure (finds anything that depends on order)
  phase    same power spectrum, random phases — destroys nonlinear structure only (finds what a linear Gaussian process cannot do)
Each pipeline's score is a z: how many null standard deviations its statistic sits from the null's mean.

  evaluate(x, specs, n_sur=12, seed=0)       -> for each spec {stat, z_shuffle, z_phase}
  ceiling(x, specs, n_sur=12, seed=0, draws=3) -> the largest z ANY of these specs reaches on data that has no structure to find
                                                (a shuffled / phase-randomised copy treated as if it were the data): the bar chance sets
                                                for a search this wide. Trying more pipelines raises it.
  structure_test(x, spec, null, n=40, seed=0) -> (stat, null_min, null_max, z) — one pre-named pipeline, no search behind it
  gloss(spec)                                 -> plain words for what the pipeline looks at
"""
import numpy as np

def _fft_filter(x, keep):
    F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x)); return np.fft.irfft(np.where(keep(f), F, 0), n=len(x))
def _blk(x, b):
    n = len(x) // b
    return x[:n * b].reshape(n, b).mean(1) if n >= 8 else np.array([np.nan])
def _detrend(x):
    i = np.arange(len(x)); p = np.polyfit(i, x, 1); return x - np.polyval(p, i)

TRANSFORMS = {
    "diff1": lambda x: x[1:] - x[:-1], "diff8": lambda x: x[8:] - x[:-8], "diff64": lambda x: x[64:] - x[:-64],
    "fast4": lambda x: _fft_filter(x, lambda f: f > 0.5 / 4), "fast16": lambda x: _fft_filter(x, lambda f: f > 0.5 / 16),
    "slow16": lambda x: _fft_filter(x, lambda f: f < 0.5 / 16),
    "abs": np.abs, "sq": lambda x: x ** 2, "blk64": lambda x: _blk(x, 64), "blk512": lambda x: _blk(x, 512), "detrend": _detrend,
}
def _acf(k):
    def f(x):
        if len(x) < k + 8: return np.nan
        x = x - x.mean(); d = np.sum(x * x); return float(np.sum(x[:-k] * x[k:]) / d) if d > 0 else np.nan
    return f
def _psd(x):
    x = x - x.mean(); P = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2; return P[1:]
def _slope(x):
    if len(x) < 64: return np.nan
    P = _psd(x); n = len(P); lo, hi = max(2, int(n * 0.01)), max(8, int(n * 0.25)); i = np.arange(lo, hi)
    return float(np.polyfit(np.log(i), np.log(P[lo:hi] + 1e-300), 1)[0])
def _peak(x):
    if len(x) < 64: return np.nan
    P = _psd(x); return float(P.max() / (np.median(P) + 1e-300))
def _kurt(x):
    s = x.std(); return float(np.mean(((x - x.mean()) / s) ** 4) - 3) if s > 0 and len(x) > 8 else np.nan
def _skew(x):
    s = x.std(); return float(np.mean(((x - x.mean()) / s) ** 3)) if s > 0 and len(x) > 8 else np.nan
STATS = {
    "std": lambda x: float(np.std(x)) if len(x) > 8 else np.nan, "skew": _skew, "kurt": _kurt, "acf1": _acf(1), "acf8": _acf(8), "acf64": _acf(64),
    "slope": _slope, "peak": _peak,
    "trend": lambda x: float(abs(np.corrcoef(x, np.arange(len(x)))[0, 1])) if len(x) > 8 and x.std() > 0 else np.nan,
}
GLOSS = {"diff1": "sample-to-sample changes", "diff8": "changes over 8 samples", "diff64": "changes over 64 samples", "fast4": "the fastest quarter of the band", "fast16": "the fastest sixteenth of the band",
         "slow16": "the slowest sixteenth of the band", "abs": "magnitude", "sq": "energy", "blk64": "energy averaged in 64-sample blocks", "blk512": "a slow envelope (512-sample blocks)", "detrend": "with the linear trend removed"}
SGLOSS = {"std": "spread", "skew": "asymmetry", "kurt": "heavy tails", "acf1": "memory at one sample", "acf8": "persistence over 8 samples", "acf64": "persistence over 64 samples",
          "slope": "power-law spectral slope", "peak": "a narrow spectral line", "trend": "a drift"}
def gloss(spec): return f"{SGLOSS[spec[-1]]} of " + (" then ".join(GLOSS[t] for t in spec[:-1]) if len(spec) > 1 else "the raw series")

def apply(spec, x):
    for t in spec[:-1]:
        x = TRANSFORMS[t](x)
        if len(x) < 16: return np.nan
    with np.errstate(all="ignore"): return STATS[spec[-1]](x)

def _null(x, kind, rng):
    return rng.permutation(x) if kind == "shuffle" else _phase(x, rng)
def _phase(x, rng):
    F = np.fft.rfft(x); ph = rng.uniform(0, 2 * np.pi, len(F)); ph[0] = 0
    if len(x) % 2 == 0: ph[-1] = 0
    return np.fft.irfft(np.abs(F) * np.exp(1j * ph), n=len(x))

def _z(spec, x, kind, n_sur, rng):
    s = apply(spec, x)
    if not np.isfinite(s): return 0.0, s
    v = np.array([apply(spec, _null(x, kind, rng)) for _ in range(n_sur)]); v = v[np.isfinite(v)]
    if len(v) < 4 or v.std() == 0: return 0.0, s
    return float(abs(s - v.mean()) / v.std()), s

def evaluate(x, specs, n_sur=12, seed=0):
    rng = np.random.default_rng(seed); out = []
    for sp in specs:
        zs, s = _z(sp, x, "shuffle", n_sur, rng); zp, _ = _z(sp, x, "phase", n_sur, rng)
        out.append({"spec": sp, "stat": None if not np.isfinite(s) else s, "z_shuffle": zs, "z_phase": zp, "gloss": gloss(sp)})
    return out

def ceiling(x, specs, n_sur=12, seed=0, draws=3):
    rng = np.random.default_rng(seed + 1); best = {"shuffle": 0.0, "phase": 0.0}
    for d in range(draws):
        for kind in ("shuffle", "phase"):
            fake = _null(x, kind, rng)
            m = max(_z(sp, fake, kind, n_sur, rng)[0] for sp in specs)
            best[kind] = max(best[kind], m)
    return best

def structure_test(x, spec, null="phase", n=40, seed=0):
    rng = np.random.default_rng(seed); s = apply(spec, x)
    v = np.array([apply(spec, _null(x, null, rng)) for _ in range(n)]); v = v[np.isfinite(v)]
    z = float(abs(s - v.mean()) / v.std()) if len(v) > 3 and v.std() > 0 else 0.0
    return float(s), float(v.min()), float(v.max()), z

TRANSFORM_NAMES = list(TRANSFORMS); STAT_NAMES = list(STATS)

def null_copy(x, null="phase", seed=0):
    return _null(x, null, np.random.default_rng(seed))
