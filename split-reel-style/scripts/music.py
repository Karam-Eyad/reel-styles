#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""music.py — موسيقى خلفية مولّدة بالكود (بدون حقوق) على مقاس الفيديو.
  python music.py <work> [--bpm 100] [--key D] [--scale minor|major|dorian] [--mood tech|calm|hype]
                  [--break 25.4-28.5] [--stop 24.0] [--intro 2.4] [--outro 3.0] [--out music-gen.wav]

  أقسام: intro (هادي) → drop (كيك + باص + باد + عزف) → break (بدون كيك، لحظة «مشكلة») → stop (سكتة نص ثانية قبل ضربة) → outro
  --break و--stop ممكن تتكرر. الناتج ملف wav بذروة ‎-6dB؛ export.py --music بيخفضه تلقائياً تحت الكلام.
"""
import os, sys, math, wave, argparse
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--bpm", type=float, default=100)
ap.add_argument("--key", default="D")
ap.add_argument("--scale", default="minor")
ap.add_argument("--mood", default="tech")
ap.add_argument("--break", dest="brk", action="append", default=[])
ap.add_argument("--stop", action="append", default=[])
ap.add_argument("--intro", type=float, default=2.4)
ap.add_argument("--outro", type=float, default=3.0)
ap.add_argument("--out", default="music-gen.wav")
a = ap.parse_args()
W = work_dir(a.work)
caps = jload(os.path.join(W, "caps.json"))
if not caps:
    die("ما في caps.json")
dur = caps["total"] + ((jload(os.path.join(W, "sfx.json"), {}) or {}).get("outro") or 0)
rng = np.random.RandomState(5)
SEMI = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
SCALES = {"minor": [0, 2, 3, 5, 7, 8, 10], "major": [0, 2, 4, 5, 7, 9, 11], "dorian": [0, 2, 3, 5, 7, 9, 10]}
PROG = {"tech": [0, 5, 3, 4], "calm": [0, 3, 5, 4], "hype": [0, 6, 5, 4]}.get(a.mood, [0, 5, 3, 4])
sc, key = SCALES.get(a.scale, SCALES["minor"]), SEMI.get(a.key.upper(), 2)
spb = 60 / a.bpm
N = int((dur + 1.0) * SR)
t_ = lambda d: np.arange(int(d * SR)) / SR


def f_of(degree, octave):                       # درجة بالسلّم → تردد
    o, i = divmod(degree, 7)
    midi = 12 * (octave + 1 + o) + key + sc[i]
    return 440.0 * 2 ** ((midi - 69) / 12)


def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "lowpass", fs=SR, output="sos"), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "highpass", fs=SR, output="sos"), x)
def saw(f, n, ph=0.0): return signal.sawtooth(2 * np.pi * f * np.arange(n) / SR + ph)


# ── أقسام ──
secs = [(0.0, "intro"), (a.intro, "drop"), (max(a.intro, dur - a.outro), "outro")]
for b in a.brk:
    s0, e0 = (float(x) for x in b.split("-"))
    secs += [(s0, "break"), (e0, "drop")]
for s0 in a.stop:
    s0 = float(s0)
    secs += [(s0 - 0.5, "stop"), (s0, "drop")]
secs.sort()


def section(t):
    cur = "intro"
    for s0, n in secs:
        if t >= s0 - 1e-6:
            cur = n
    return cur


# ── أصوات ──
def kick():
    t = t_(0.4)
    return np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.16) * 1.1


def clap():
    t = t_(0.3)
    e = sum(np.exp(-np.clip(t - d, 0, None) / (0.008 if d < .02 else 0.08)) * (t >= d) for d in (0, 0.011, 0.023))
    return lp(hp(rng.randn(len(t)), 900), 4500) * e * 0.5


def hat(open_=False):
    t = t_(0.2 if open_ else 0.06)
    return hp(rng.randn(len(t)), 7000) * np.exp(-t / (0.09 if open_ else 0.02))


def bass_note(f, d):
    n = int(d * SR)
    t = np.arange(n) / SR
    return lp(saw(f, n), 380) * np.minimum(1, t / 0.01) * np.exp(-t / (d * 0.7)) * 0.9


def pad_chord(freqs, d):
    n = int(d * SR)
    t = np.arange(n) / SR
    L, R = np.zeros(n), np.zeros(n)
    for f in freqs:
        for det, ph in ((0.996, 0.0), (1.0, 1.7), (1.004, 3.1)):
            L += saw(f * det, n, ph); R += saw(f * det, n, ph + 0.9)
    env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3)
    return lp(L, 1500) * env * 0.045, lp(R, 1500) * env * 0.045


def pluck(f, d=0.22):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = saw(f, n) + 0.5 * saw(f * 2.005, n)
    return lp(hp(x, 300), 3200) * np.exp(-t / 0.07) * np.minimum(1, t / 0.003) * 0.28


kick_s, clap_s, hat_c, hat_o = kick(), clap(), hat(), hat(True)
mix = np.zeros((N, 2))
layers = {k: np.zeros((N, 2)) for k in ("kick", "clap", "hat", "bass", "pad", "arp")}


def put(layer, x, t0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= N or i < 0:
        return
    if isinstance(x, tuple):
        L, R = x
    else:
        g = math.sqrt(0.5)
        L, R = x * g * (1 - pan * 0.7), x * g * (1 + pan * 0.7)
    j = min(N, i + len(L))
    layers[layer][i:j, 0] += L[:j - i]
    layers[layer][i:j, 1] += R[:j - i]


bar = 4 * spb
nbars = int(math.ceil((dur + spb) / bar))
kick_times = []
for b in range(nbars):
    t0 = b * bar
    deg = PROG[b % len(PROG)]
    chord = [f_of(deg, 3), f_of(deg + 2, 3), f_of(deg + 4, 3)]
    s = section(t0 + 0.01)
    if s != "stop":
        put("pad", pad_chord(chord, bar + 0.1), t0)
    for step in range(16):
        t = t0 + step * spb / 4
        if t >= dur:
            break
        s = section(t)
        beat, sub = divmod(step, 4)
        if s == "stop":
            continue
        if s in ("drop", "outro") and sub == 0:
            put("kick", kick_s * (1.0 if s == "drop" else 0.7), t); kick_times.append(t)
            if beat in (1, 3) and s == "drop":
                put("clap", clap_s, t)
        if s in ("drop", "outro", "intro") and sub == 2:
            put("hat", hat_c * (0.7 if s != "intro" else 0.4), t, 0.35)
        if s == "drop" and sub == 2 and beat == 3:
            put("hat", hat_o * 0.5, t, -0.2)
        if s in ("drop", "outro") and sub in (0, 2) and beat in (0, 2, 3):
            put("bass", bass_note(f_of(deg, 2), spb * 0.5), t)
        if s == "break" and sub == 0 and beat == 0:
            put("bass", bass_note(f_of(deg, 2), bar), t)
        if s == "drop" and a.mood != "calm":
            put("arp", pluck(f_of(deg + (0, 2, 4, 7)[step % 4], 4 + (step % 8 > 3))), t, ((step % 2) * 2 - 1) * 0.4)

# ducking: كل شي ما عدا الكيك بينخفض بعد كل كيك
duck = np.ones(N)
env = np.exp(-t_(0.28) / 0.09)
for kt in kick_times:
    i = int(kt * SR)
    j = min(N, i + len(env))
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.55 * env[:j - i])
db = lambda x: 10 ** (x / 20)
lv = {"kick": db(-4), "clap": db(-10), "hat": db(-17), "bass": db(-8), "pad": db(-9), "arp": db(-12)}
for k, arr in layers.items():
    mix += arr * lv[k] * (1.0 if k in ("kick", "clap") else duck[:, None])
mix = mix[:int(dur * SR)]
fade = np.ones(len(mix))
fade[:int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
fo = int(min(1.2, a.outro) * SR)
fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * db(-6)
out = os.path.join(W, a.out)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"✅ {a.out}: {dur:.1f}ث · {a.bpm:g} BPM · {a.key} {a.scale} · {a.mood} · " + " → ".join(f"{n}@{s:.1f}" for s, n in secs))
