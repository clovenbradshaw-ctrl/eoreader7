"""turb — time-series tools for turbulence-like signals. numpy only. Every function states what it assumed.

  series(file, col)                 -> (t, x, report)   NaN gaps and spikes are FOUND and reported; spikes are replaced by linear
                                                         interpolation (MAD rule, declared), gaps are interpolated only if short
  psd(x, dt, nseg=16)               -> f, P, segs        Welch, Hann, 50% overlap; segs = per-segment spectra (for the bootstrap)
  band(f, P, decades=1.0)           -> (lo, hi)          the fixed-width log-frequency window with the straightest spectrum
  slope(f, P, lo, hi)               -> log-log OLS slope
  slope_ci(f, segs, lo, hi, n=400, seed=0) -> (slope, lo95, hi95)  bootstrap over segments
  surrogate(x, seed)                phase-randomised copy: same spectrum, Gaussian statistics, no intermittency
  flatness(x, lags)                 -> kurtosis of increments at each lag (3 for Gaussian)
  zeta(x, lags, p)                  -> scaling exponent of the p-th order structure function over lags
  integral_scale(x, dt)             -> (T_int, first zero crossing) of the autocorrelation
  lines(f, P, ratio=...)            -> narrow spectral peaks against their local median
"""
import numpy as np
import sys, os

SPIKE_MAD = 7.0     # declared: |x - median| > 7 * 1.4826 * MAD is a spike
MAX_GAP = 50        # declared: NaN runs up to this many samples are interpolated; longer runs are cut and reported

def series(file, col, timecol=None):
    from er7 import table
    rows = table(file); keys = list(rows[0].keys())
    timecol = timecol or next((k for k in keys if k.lower() in ("t", "time", "time_s", "t_s")), None)
    def num(k):
        out = []
        for r in rows:
            try: out.append(float(r[k]))
            except Exception: out.append(np.nan)
        return np.array(out)
    x = num(col); t = num(timecol) if timecol else np.arange(len(x), dtype=float)
    rep = {"n": len(x), "nan": int(np.isnan(x).sum()), "spikes": 0, "long_gaps": 0}
    med = np.nanmedian(x); mad = 1.4826 * np.nanmedian(np.abs(x - med)) or 1.0
    sp = np.abs(x - med) > SPIKE_MAD * mad
    rep["spikes"] = int(np.nansum(sp)); x = np.where(sp, np.nan, x)
    # interpolate short NaN runs; cut at the first long one and keep the longest clean stretch
    bad = np.isnan(x); idx = np.arange(len(x))
    runs = []; i = 0
    while i < len(x):
        if bad[i]:
            j = i
            while j < len(x) and bad[j]: j += 1
            runs.append((i, j)); i = j
        else: i += 1
    cuts = [0] + [e for (s, e) in runs if e - s > MAX_GAP for e in (s, e)] + [len(x)]
    rep["long_gaps"] = sum(1 for (s, e) in runs if e - s > MAX_GAP)
    good = np.where(~bad)[0]
    x = np.interp(idx, good, x[good])
    if rep["long_gaps"]:
        segs = []; lo = 0
        for (s, e) in runs:
            if e - s > MAX_GAP: segs.append((lo, s)); lo = e
        segs.append((lo, len(x))); lo, hi = max(segs, key=lambda a: a[1] - a[0])
        rep["kept"] = [int(lo), int(hi)]; x = x[lo:hi]; t = t[lo:hi]
    dts = np.diff(t); rep["dt"] = float(np.median(dts)); rep["dt_jitter"] = float(np.std(dts) / np.median(dts)) if len(dts) else 0.0
    # The cleaning is DISCLOSED on every call — an analysis that calls series() cannot forget to say what was done to the data.
    print("#quality %s: %d samples, dt=%.4g s (jitter %.2f%%); %d missing, %d spikes interpolated%s" % (col, rep["n"], rep["dt"], 100 * rep["dt_jitter"], rep["nan"], rep["spikes"], ("; %d long gap(s): kept samples %d-%d only" % (rep["long_gaps"], rep["kept"][0], rep["kept"][1])) if rep["long_gaps"] else ""))
    return t, x - np.mean(x), rep

def psd(x, dt, nseg=16):
    n = len(x) // nseg; n -= n % 2; w = np.hanning(n); segs = []
    for s in range(0, len(x) - n + 1, n // 2):
        seg = x[s:s + n]; seg = seg - seg.mean(); F = np.fft.rfft(seg * w)
        segs.append((np.abs(F) ** 2) * dt / (np.sum(w ** 2) / 2))
    f = np.fft.rfftfreq(n, dt); segs = np.array(segs)
    return f[1:], segs.mean(0)[1:], segs[:, 1:]

def _loglin(f, P, lo, hi):
    m = (f >= lo) & (f <= hi) & (P > 0)
    return np.polyfit(np.log10(f[m]), np.log10(P[m]), 1), m

def slope(f, P, lo, hi): return float(_loglin(f, P, lo, hi)[0][0])

def band(f, P, decades=1.0):
    best = None; lf = np.log10(f)
    for a in np.arange(lf[0], lf[-1] - decades, 0.1):
        m = (lf >= a) & (lf <= a + decades)
        if m.sum() < 8: continue
        (b, c), _ = _loglin(f, P, 10 ** a, 10 ** (a + decades))
        r = np.std(np.log10(P[m]) - (b * lf[m] + c))
        if a > lf[0] + 0.3 and (best is None or r < best[0]): best = (r, 10 ** a, 10 ** (a + decades))
    return best[1], best[2]

def slope_ci(f, segs, lo, hi, n=400, seed=0):
    rng = np.random.default_rng(seed); k = len(segs); ss = []
    for _ in range(n):
        P = segs[rng.integers(0, k, k)].mean(0); ss.append(slope(f, P, lo, hi))
    return slope(f, segs.mean(0), lo, hi), float(np.percentile(ss, 2.5)), float(np.percentile(ss, 97.5))

def surrogate(x, seed=0):
    rng = np.random.default_rng(seed); F = np.fft.rfft(x)
    ph = rng.uniform(0, 2 * np.pi, len(F)); ph[0] = 0
    if len(x) % 2 == 0: ph[-1] = 0
    return np.fft.irfft(np.abs(F) * np.exp(1j * ph), n=len(x))

def flatness(x, lags):
    out = []
    for r in lags:
        d = x[r:] - x[:-r]; d = d - d.mean(); out.append(float(np.mean(d ** 4) / np.mean(d ** 2) ** 2))
    return np.array(out)

def zeta(x, lags, p):
    S = [np.mean(np.abs(x[r:] - x[:-r]) ** p) for r in lags]
    return float(np.polyfit(np.log(lags), np.log(S), 1)[0])

def integral_scale(x, dt):
    n = len(x); F = np.fft.rfft(x, 2 * n); ac = np.fft.irfft(np.abs(F) ** 2)[:n]; ac = ac / ac[0]
    z = int(np.argmax(ac <= 0)) or n
    return float(np.sum(ac[:z]) * dt), z * dt

def lines(f, P, ratio=8.0, half=20):
    out = []
    for i in range(half, len(P) - half):
        loc = np.median(np.r_[P[i - half:i - 2], P[i + 3:i + half]])
        if P[i] > ratio * loc and P[i] == P[i - 2:i + 3].max(): out.append((float(f[i]), float(P[i] / loc)))
    return out

def _ratios(P, half=20):
    """peak / median-of-neighbours for every bin (neighbours: ±half bins, minus 2 either side), vectorised."""
    from numpy.lib.stride_tricks import sliding_window_view as sw
    W = sw(P, 2 * half + 1); keep = [j for j in range(2 * half + 1) if abs(j - half) > 2]
    return P[half:len(P) - half] / np.median(W[:, keep], axis=1)

def peak_ratio(f, P, half=20):
    """(frequency, ratio) of the sharpest spectral line: a bin over the median of its neighbours."""
    r = _ratios(P, half); i = int(np.argmax(r)); return float(f[half + i]), float(r[i])

def peak_null(nbins, k, draws=60, seed=0):
    """95th percentile, over draws, of the LARGEST peak/neighbour ratio across ALL nbins bins of a line-free spectrum
    averaged over k segments (each bin gamma(k)/k). Every bin is scanned, as the data's own scan does."""
    rng = np.random.default_rng(seed)
    return float(np.percentile([_ratios(rng.gamma(k, 1.0 / k, nbins)).max() for _ in range(draws)], 95))
