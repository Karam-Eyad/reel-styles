#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""sfx.py — يولّد sfx.wav (مؤثرات صوتية بالكود، بدون حقوق) من <work>/sfx.json، وبعدها بيضيف أصوات الانتقالات.
  python sfx.py <work> [--no-transitions]

sfx.json:  { "outro": 0,
             "pop":[18.6,23.7], "click":[20.4], "type":[[19.4,0.75]],   ← [بداية، مدة]
             "sub":[24.5], "shimmer":[24.9], "thud":[29.2], "tap":[3.0], "glitch":[27.4],
             "whoosh_up":[3.1], "whoosh_down":[7.8], "soft":[[5.6,0.05]] }  ← [وقت، قوة]
القاعدة: مؤثر بلحظة إلها معنى (شي بيطلع، ضغطة، رقم بينزل)، مش على كل كلمة.
"""
import os, sys, wave, argparse, subprocess
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

SR = 48000
rng = np.random.RandomState(11)
t_ = lambda d: np.arange(int(d * SR)) / SR


def _f(kind, f, x, o=2):
    return signal.sosfilt(signal.butter(o, f, kind, fs=SR, output="sos"), x)


def pop(f0=900, f1=420, dur=0.12):
    t = t_(dur)
    return np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.04) * 0.8


def click():
    t = t_(0.03)
    return _f("highpass", 1800, rng.randn(len(t))) * np.exp(-t / 0.004) * 0.6 + np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.01) * 0.4


def typing(dur=0.8, cps=12):
    out = np.zeros(int((dur + 0.1) * SR))
    for k in range(max(1, int(dur * cps))):
        c = click() * (0.4 + 0.25 * rng.rand())
        i = int((k / cps + rng.rand() * 0.012) * SR)
        out[i:i + len(c)] += c[:max(0, len(out) - i)]
    return out


def sub(dur=0.9):
    t = t_(dur)
    return np.sin(2 * np.pi * np.cumsum(45 + 55 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.35)


def shimmer(dur=0.9):
    t = t_(dur)
    s = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(2093, 1), (2637, .8), (3136, .7), (4186, .5)])
    return s * np.exp(-t / 0.35) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * 0.3 + _f("highpass", 6000, rng.randn(len(t))) * np.exp(-t / 0.25) * 0.15


def thud(dur=0.3):
    t = t_(dur)
    return np.sin(2 * np.pi * np.cumsum(58 + 77 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.1) + _f("lowpass", 600, rng.randn(len(t))) * np.exp(-t / 0.03) * 0.4


def tap(dur=0.09):
    t = t_(dur)
    return _f("bandpass", [600, 2500], rng.randn(len(t))) * np.exp(-t / 0.015) + np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.02) * 0.5


def glitch(dur=0.28):
    t = t_(dur)
    x = np.sign(np.sin(2 * np.pi * 170 * t)) * 0.3 + rng.randn(len(t)) * 0.5
    gate = (np.floor(t * 60) % 3 != 1).astype(float)
    return _f("highpass", 300, np.round(x * gate * 6) / 6) * np.exp(-t / 0.16)


def whoosh(dur=0.34, up=True):
    t = t_(dur)
    n = rng.randn(len(t))
    y = np.zeros_like(n)
    blk = 256
    for s in range(0, len(n), blk):
        k = s / len(n)
        f = (500 + 3500 * k) if up else (4000 - 3300 * k)
        seg = n[s:s + blk + 512]
        y[s:s + blk] = _f("bandpass", [max(60, f / 1.6), min(f * 1.6, SR / 2.2)], seg)[:len(y[s:s + blk])]
    return y * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2


def norm(x, pk):
    return x / (np.max(np.abs(x)) + 1e-9) * pk


ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--no-transitions", action="store_true")
a = ap.parse_args()
W = work_dir(a.work)
cues = jload(os.path.join(W, "sfx.json"), {}) or {}
caps = jload(os.path.join(W, "caps.json"))
if not caps:
    die("ما في caps.json — شغّل captions.py أول")
dur = caps["total"] + (cues.get("outro") or 0)
buf = np.zeros(int((dur + 1.0) * SR))


def add(sig, t0, peak):
    sig = norm(sig, peak)
    i = max(0, int(t0 * SR))
    j = min(len(buf), i + len(sig))
    if j > i:
        buf[i:j] += sig[:j - i]


for t0 in cues.get("pop", []): add(pop(), t0, 0.16)
for t0 in cues.get("click", []): add(click(), t0, 0.14)
for t0, d0 in cues.get("type", []): add(typing(d0), t0, 0.10)
for t0 in cues.get("sub", []): add(sub(), t0, 0.28)
for t0 in cues.get("shimmer", []): add(shimmer(), t0, 0.12)
for t0 in cues.get("thud", []): add(thud(), t0, 0.20)
for t0 in cues.get("tap", []): add(tap(), t0, 0.14)
for t0 in cues.get("glitch", []): add(glitch(), t0, 0.12)
for t0 in cues.get("whoosh_up", []): add(whoosh(0.34, True), t0 - 0.2, 0.12)
for t0 in cues.get("whoosh_down", []): add(whoosh(0.34, False), t0 - 0.15, 0.12)
for t0, g in cues.get("soft", []): add(whoosh(0.34, True), t0 - 0.2, g)

buf = np.clip(buf, -0.95, 0.95)
pcm = np.repeat((buf * 32767).astype("<i2")[:, None], 2, axis=1)
with wave.open(os.path.join(W, "sfx.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"✅ sfx.wav · ذروة {np.max(np.abs(buf)):.2f} · {len(buf) / SR:.1f}ث")

if not a.no_transitions:
    html = os.path.join(W, "compose.html")
    if os.path.exists(html):
        subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "trans_sfx.py"), W])
