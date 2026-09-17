import json, sys
import numpy as np
from scipy.io import wavfile

# turn organ prototype: per-segment pitch/energy/centroid -> speaker clusters
def load(film):
    sr, x = wavfile.read(f'{film}.wav')
    if x.dtype == np.int16:
        x = x.astype(np.float64) / 32768.0
    return sr, x

def f0_of(sig, sr):
    # autocorrelation F0 on the strongest 25ms frames
    n = len(sig)
    if n < 400:
        return 0.0
    hop = 512
    f0s = []
    for st in range(0, n - 400, hop):
        frame = sig[st:st+400]
        rms = np.sqrt(np.mean(frame**2))
        if rms < 0.01:
            continue
        frame = frame - np.mean(frame)
        ac = np.correlate(frame, frame, 'full')[399:]
        lo, hi = int(sr/400), int(sr/80)
        seg = ac[lo:hi+1]
        if len(seg) == 0 or seg.max() <= 0:
            continue
        peak = lo + np.argmax(seg)
        # parabolic refine
        if peak > lo and peak < hi:
            a, b, c = ac[peak-1], ac[peak], ac[peak+1]
            denom = (a - 2*b + c)
            if abs(denom) > 1e-12:
                peak += 0.5 * (a - c) / denom
        f0s.append(sr / peak)
    if not f0s:
        return 0.0
    f0s = np.array(f0s)
    f0s = f0s[(f0s > 70) & (f0s < 350)]
    return float(np.median(f0s)) if len(f0s) else 0.0

def features(sig, sr):
    rms = float(np.sqrt(np.mean(sig**2)))
    spec = np.abs(np.fft.rfft(sig * np.hanning(len(sig))))
    freqs = np.fft.rfftfreq(len(sig), 1.0/sr)
    tot = spec.sum()
    centroid = float((freqs * spec).sum() / tot) if tot > 0 else 0.0
    return rms, centroid

def analyze(film, t0, t1, k=2):
    sr, x = load(film)
    segs = json.load(open(f'{film}.json'))['segments']
    rows = []
    for s in segs:
        st, en = s['start'], s['end']
        if en < t0 or st > t1:
            continue
        a, b = int(st*sr), int(en*sr)
        sig = x[a:b]
        if len(sig) < sr*0.3:  # <0.3s -> skip (clicks)
            continue
        f0 = f0_of(sig, sr)
        rms, cen = features(sig, sr)
        rows.append((st, en, f0, rms, cen, s.get('text','')))
    if len(rows) < 10:
        print(film, 'too few segments', len(rows)); return
    X = np.array([[np.log10(rms+1e-6), f0/100.0, cen/1000.0] for (_,_,f0,rms,cen,_) in rows])
    X = (X - X.mean(0)) / (X.std(0)+1e-9)
    # kmeans (init: high-F0 vs low-F0)
    seed = np.argmax(X[:,1]); anti = np.argmin(X[:,1])
    c = np.array([X[seed], X[anti]])
    for _ in range(30):
        d = ((X[:,None,:]-c[None,:,:])**2).sum(-1)
        lab = d.argmin(-1)
        for j in range(k):
            m = lab==j
            if m.sum(): c[j] = X[m].mean(0)
    # order labels by median F0 (label 0 = lower pitch)
    med = [np.median([r[2] for r,l in zip(rows,lab) if l==j and r[2]>0]) for j in range(k)]
    order = np.argsort(med)
    rev = np.zeros(k, int); rev[order]=np.arange(k)
    lab = rev[lab]
    nA = (lab==0).sum(); nB = (lab==1).sum()
    flips = sum(1 for i in range(1,len(lab)) if lab[i]!=lab[i-1])
    alt = flips/(len(lab)-1)
    f0A = np.median([r[2] for r,l in zip(rows,lab) if l==0 and r[2]>0])
    f0B = np.median([r[2] for r,l in zip(rows,lab) if l==1 and r[2]>0])
    rmsA = np.median([r[3] for r,l in zip(rows,lab) if l==0])
    rmsB = np.median([r[3] for r,l in zip(rows,lab) if l==1])
    print(f'=== {film} [{t0//60}-{t1//60} min] ===')
    print(f'  segments {len(rows)} | speaker A {nA} ({nA/len(rows)*100:.0f}%) B {nB}')
    print(f'  turn alternation rate: {alt:.2f} (1.0 = pure ping-pong, 0 = single voice)')
    print(f'  cluster A: median F0 {f0A:.0f} Hz, RMS {rmsA:.3f} | cluster B: F0 {f0B:.0f} Hz, RMS {rmsB:.3f}')
    print(f'  label sequence (first 40): {"".join(map(str,lab[:40]))}')
    # overlap: whisper segments whose time ranges overlap
    ov = sum(1 for i in range(1,len(rows)) if rows[i][0] < rows[i-1][1])
    print(f'  overlapping-adjacent segments: {ov}/{len(rows)}')
    # per-cluster top words
    for j in [0,1]:
        txt = ' '.join(r[5] for r,l in zip(rows,lab) if l==j)
        print(f'  speaker {j} sample: {txt[:140]}')

if __name__ == '__main__':
    analyze('detour-1945', 0, 3900)
    analyze('his-girl-friday-1940', 0, 5400)