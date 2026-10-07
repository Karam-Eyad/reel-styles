#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""trans_sfx.py — يضيف صوت كل انتقال على sfx.wav (بيتشغّل تلقائياً من sfx.py، أو لحاله بعده).
بيقرا اللقطات من compose.html ← SK.shots([{s:…, tr:'flash'}, …]) وبيولّد الصوت بالكود (بدون حقوق):
  flash → صوت كاميرا (shutter): كليك مراية + كليك ستارة بعد 55ms + جسم ميكانيكي قصير
  blob → ووش نازل + طقّة · leak → ووش لامع (paper-reel-style)
  card  → ووش ناعم · whip → سوووش سريع · zoom → ووش طالع + ضربة خفيفة · glitch → خلل رقمي · cut → بدون

  python trans_sfx.py <work> [--gain 1.0] [--audition]   (--audition: بيطلع كل صوت بملف لحاله بـ<work>/sfx_audition/)
"""
import sys, os, re, wave, json, argparse
import numpy as np
from scipy import signal
try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception: pass

SR = 48000
ap = argparse.ArgumentParser(); ap.add_argument('work'); ap.add_argument('--gain', type=float, default=1.0); ap.add_argument('--audition', action='store_true')
a = ap.parse_args(); W = a.work
rng = np.random.RandomState(7)
t_ = lambda d: np.arange(int(d * SR)) / SR
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'highpass', fs=SR, output='sos'), x)
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def norm(x, pk): return x / (np.max(np.abs(x)) + 1e-9) * pk

def click(f0, dur=0.035, bright=1.0):
    t = t_(dur); n = hp(rng.randn(len(t)), 1800) * np.exp(-t / 0.0025) * bright
    ping = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.012) * 0.6 + np.sin(2 * np.pi * f0 * 1.63 * t) * np.exp(-t / 0.008) * 0.3
    return n + ping
def shutter():
    out = np.zeros(int(0.22 * SR))
    c1 = click(2300, bright=1.0); out[:len(c1)] += c1
    i = int(0.055 * SR); c2 = click(1900, bright=0.8); out[i:i + len(c2)] += c2 * 0.85
    t = t_(0.09); body = bp(rng.randn(len(t)), 350, 1600) * np.exp(-t / 0.025) * 0.35; out[:len(body)] += body
    return norm(out, 0.5), 0.0                                 # (صوت، إزاحة: الكليك الأول على القطع)
def whoosh(dur, f0, f1, pk, peak_at=0.6):
    t = t_(dur); n = rng.randn(len(t)); env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    y = np.zeros_like(n); blk = 256
    for s in range(0, len(n), blk):
        f = f0 + (f1 - f0) * (s / len(n)); y[s:s + blk] = bp(n[s:s + blk + 512], f / 1.6, min(f * 1.6, SR / 2.2))[:len(y[s:s + blk])]
    return norm(y * env, pk), -peak_at * dur                   # ذروته على القطع
def thud():
    t = t_(0.25); return norm(np.sin(2 * np.pi * (55 + 70 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.08), 0.45)
def glitch():
    t = t_(0.22); sq = np.sign(np.sin(2 * np.pi * 180 * t)) * 0.3 + rng.randn(len(t)) * 0.5
    gate = (np.floor(t * 70) % 3 != 1).astype(float); crushed = np.round(sq * gate * 6) / 6
    return norm(hp(crushed, 300) * np.exp(-t / 0.12), 0.32), 0.0

def make(tr):
    if tr == 'flash': return shutter()
    if tr == 'card': return whoosh(0.42, 500, 2400, 0.10, 0.55)
    if tr == 'whip': return whoosh(0.30, 900, 5200, 0.20, 0.55)
    if tr == 'zoom':
        w, off = whoosh(0.40, 300, 3800, 0.16, 0.85); th = thud(); out = np.zeros(len(w) + len(th)); out[:len(w)] += w
        i = int(-off * SR); out[i:i + len(th)] += th * 0.6; return out, off
    if tr == 'glitch': return glitch()
    if tr == 'blob':                                           # بقعة سائلة: ووش نازل + طقّة لما تصير نقطة (paper-reel-style)
        w, off = whoosh(0.50, 3200, 380, 0.17, 0.8); t = t_(0.09); pop = np.sin(2*np.pi*(700-300*t/0.09)*t)*np.exp(-t/0.025)*0.35
        out = np.zeros(len(w)+len(pop)); out[:len(w)] += w; i = int(0.5*SR*0.85); out[i:i+len(pop)] += pop; return out, -0.05
    if tr == 'leak':                                           # تسريب ضوء: ووش ناعم لامع
        w, off = whoosh(0.45, 1500, 7000, 0.10, 0.4); t = t_(0.45); sh = hp(rng.randn(len(t)), 6000)*np.sin(np.pi*t/0.45)**2*0.05
        return w + sh[:len(w)], off
    return None, 0

html = open(os.path.join(W, 'compose.html'), encoding='utf-8').read()
for extra in ('shots.js',):   # التصميم ممكن يكون بملف منفصل جنب compose.html
    if os.path.exists(os.path.join(W, extra)): html += open(os.path.join(W, extra), encoding='utf-8').read()
m = re.search(r'SK\.shots\(\[(.*?)\]\);', html, re.S)
if not m: sys.exit('❌ ما لقيت SK.shots([...]) بـcompose.html')
shots = []
for blk in re.findall(r'\{[^{}]*\}', m.group(1)):
    s = re.search(r'\bs\s*:\s*([\d.]+)', blk); tr = re.search(r"\btr\s*:\s*'(\w+)'", blk)
    if s: shots.append((float(s.group(1)), tr.group(1) if tr else 'card'))
shots.sort()

path = os.path.join(W, 'sfx.wav')
w = wave.open(path); ch, sw, sr, nfr = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
buf = np.frombuffer(w.readframes(nfr), np.int16).reshape(-1, ch).astype(np.float64) / 32768; w.close()
if sr != SR: sys.exit(f'❌ sfx.wav لازم {SR} Hz')
if a.audition: os.makedirs(os.path.join(W, 'sfx_audition'), exist_ok=True)
done = []
for i, (s, tr) in enumerate(shots):
    if i == 0: continue                                         # أول لقطة ما قبلها انتقال
    snd, off = make(tr)
    if snd is None: continue
    i0 = max(0, int((s + off) * SR)); j = min(len(buf), i0 + len(snd))
    buf[i0:j] += (snd[:j - i0] * a.gain)[:, None]
    done.append(f'{tr}@{s:.2f}')
    if a.audition:
        ww = wave.open(os.path.join(W, 'sfx_audition', f'{tr}.wav'), 'wb'); ww.setnchannels(1); ww.setsampwidth(2); ww.setframerate(SR)
        ww.writeframes((np.clip(snd, -1, 1) * 32767).astype('<i2').tobytes()); ww.close()
buf = np.clip(buf, -0.95, 0.95)
w = wave.open(path, 'wb'); w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes((buf * 32767).astype('<i2').tobytes()); w.close()
print(f'✅ أصوات الانتقالات: {len(done)} · ' + ' · '.join(done))
