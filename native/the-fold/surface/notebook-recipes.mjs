// notebook-recipes.mjs — the analyses a question can be turned into. A recipe is CODE, written once and read by a person:
// natural language chooses WHICH recipe(s) and WHICH column(s); it never writes the analysis. Each claim recipe carries its
// own control — the same check aimed at a version of the column where the claim is false by construction.
export const RECIPES = Object.freeze([
  { id: "quality", title: "data quality", kind: "describe",
    desc: "data quality gaps dropouts missing nan spikes outliers glitches sampling rate dt jitter clean cleaning check the file",
    code: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}")
print(f"#finding ${C}: {rep['n']} samples at dt={rep['dt']:.4g}s (jitter {100*rep['dt_jitter']:.2f}%); {rep['nan']} missing, {rep['spikes']} spikes replaced by interpolation" + (f"; {rep['long_gaps']} long gap(s): kept samples {rep['kept'][0]}-{rep['kept'][1]} only" if rep['long_gaps'] else ""))
rep` },
  { id: "spectrum", title: "Kolmogorov spectrum", kind: "claim",
    desc: "spectrum spectral power psd fourier frequency kolmogorov k41 -5/3 inertial range slope cascade energy scaling law power-law",
    claim: (C) => `In ${C}, the inertial-range spectral slope is consistent with Kolmogorov's -5/3 (a bootstrap 95% interval over spectrum segments contains -1.667).`,
    code: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}"); f,P,segs=psd(x,rep["dt"]); lo,hi=band(f,P); s,a,b=slope_ci(f,segs,lo,hi)
print(f"#finding ${C}: inertial-range spectral slope {s:.2f} (95% interval {a:.2f} to {b:.2f}) over {lo:.1f}-{hi:.1f} Hz; Kolmogorov is -1.67")
scope_sample(400,0,f"bootstrap over spectrum segments, ${C}, band {lo:.1f}-{hi:.1f} Hz (chosen as the straightest decade)")
result(a<=-5/3<=b)`,
    control: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}"); x=np.random.default_rng(0).permutation(x); f,P,segs=psd(x,rep["dt"]); lo,hi=band(f,P); s,a,b=slope_ci(f,segs,lo,hi)
print(f"control: the same column shuffled in time has slope {s:.2f} ({a:.2f} to {b:.2f}) — it must NOT read as -5/3")
scope_sample(400,0,f"bootstrap over spectrum segments, ${C} shuffled in time")
result(a<=-5/3<=b)` },
  { id: "intermittency", title: "intermittency", kind: "claim",
    desc: "intermittent intermittency non-gaussian gaussian kurtosis flatness heavy tails increments structure function bursts extreme events small scales multifractal",
    claim: (C) => `In ${C}, small-scale velocity increments are more heavy-tailed than a Gaussian process with the same spectrum allows (flatness above every one of 40 phase-randomised surrogates).`,
    code: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}"); lags=np.unique(np.logspace(0.3,2.3,12).astype(int)); fl=flatness(x,lags)
top=max(flatness(surrogate(x,s),lags)[0] for s in range(40))
print(f"#finding ${C}: increment flatness {fl[0]:.2f} at the smallest lag ({lags[0]} samples) falling to {fl[-1]:.2f} at {lags[-1]}; the most extreme of 40 same-spectrum Gaussian surrogates reaches {top:.2f} (Gaussian = 3)")
scope_sample(40,0,f"40 phase-randomised surrogates of ${C}, lags {lags[0]}-{lags[-1]} samples")
result(bool(fl[0]>top))`,
    control: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}"); x=surrogate(x,99); lags=np.unique(np.logspace(0.3,2.3,12).astype(int)); fl=flatness(x,lags)
top=max(flatness(surrogate(x,s),lags)[0] for s in range(40))
print(f"control: a surrogate of ${C} has flatness {fl[0]:.2f} against surrogate-of-surrogate maximum {top:.2f} — it must NOT read as intermittent")
scope_sample(40,0,f"40 phase-randomised surrogates of a surrogate of ${C}")
result(bool(fl[0]>top))` },
  { id: "tones", title: "periodic contamination", kind: "claim",
    desc: "tone tones periodic periodicity peak peaks line lines hum vibration contamination contaminating contaminated contaminate interference harmonic oscillation motor pump narrow band frequency spike in the spectrum",
    claim: (C) => `${C} carries a narrow spectral line that a smooth, line-free spectrum of the same averaging would not produce (peak-to-neighbourhood ratio above the 95th percentile of the largest peak over 60 line-free draws).`,
    code: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}"); f,P,segs=psd(x,rep["dt"]); f0,r=peak_ratio(f,P); nul=peak_null(len(P),max(2,len(segs)//2))
print(f"#finding ${C}: sharpest spectral line at {f0:.2f} Hz stands {r:.1f}x above its neighbourhood; the line-free null's 95th percentile is {nul:.1f}x")
scope_sample(60,0,f"line-free gamma spectrum draws, ${C}, {len(P)} bins")
result(bool(r>nul))`,
    control: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}"); x=np.random.default_rng(0).permutation(x); f,P,segs=psd(x,rep["dt"]); f0,r=peak_ratio(f,P); nul=peak_null(len(P),max(2,len(segs)//2))
print(f"control: ${C} shuffled in time has a sharpest peak of {r:.1f}x against a null of {nul:.1f}x — it must NOT read as a line")
scope_sample(60,0,f"line-free gamma spectrum draws, ${C} shuffled")
result(bool(r>nul))` },
  { id: "scales", title: "characteristic scales", kind: "describe",
    desc: "scale scales integral time length correlation autocorrelation eddy size turnover timescale decorrelation memory how long",
    code: (F, C) => `from turb import *
t,x,rep=series("${F}","${C}"); T,z=integral_scale(x,rep["dt"]); U=1.0
print(f"#finding ${C}: integral time scale {T:.3g} s (autocorrelation first crosses zero at {z:.3g} s); rms {x.std():.3g}")
T` },
]);
export const ALL_WORDS = new Set(["all", "everything", "overall", "full", "complete", "thorough", "thoroughly", "comprehensive", "whole", "overview"]);
