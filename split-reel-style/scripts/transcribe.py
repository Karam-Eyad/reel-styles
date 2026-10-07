#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""transcribe.py — تفريغ الكلام بتوقيت كل كلمة (whisper).
  python transcribe.py <work> [--model medium] [--lang ar] [--prompt "جملة بتشبه كلامك"] [--no-gapfill]

  - بيفرّغ صوت <work>/cutz.mp4 → <work>/a.wav + <work>/a.json
  - ⚠️ whisper أحياناً بيسقط مقطع كامل من الكلام. بعد التفريغ بيدوّر على أي مقطع فيه صوت وما فيه كلمات (≥1.2ث)
    وبيعيد تفريغه لحاله وبيدمجه. (--no-gapfill بيطفّي هالخطوة)
  - بيطبع السكريبت مرقّماً: كل سطر = جملة، وهاد اللي بتصحّحه بـfixes.json
  - الموديلات: tiny 75MB · base 140MB · small 460MB · medium 1.4GB (الأدق بالعامية) · large-v3 2.9GB
"""
import os, re, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--model", default="medium")
ap.add_argument("--lang", default="ar")
ap.add_argument("--prompt", default=None, help="جملة مرجعية (أسماء، مصطلحات) بتساعد whisper")
ap.add_argument("--no-gapfill", action="store_true")
a = ap.parse_args()
W = work_dir(a.work)
need("ffmpeg")
video = os.path.join(W, "cutz.mp4")
if not os.path.exists(video):
    die("شغّل prepare.py أول")

wav = os.path.join(W, "a.wav")
run(["ffmpeg", "-y", "-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", wav])

try:
    import whisper
except ImportError:
    die('whisper مو مثبّت:  python -m pip install -U openai-whisper', 2)

cache = os.path.join(os.path.expanduser("~"), ".cache", "whisper", a.model + ".pt")
if not os.path.exists(cache):
    print(f"⚠️ موديل {a.model} مو منزّل — رح ينزل أول مرة (حجمه بالتعليمات فوق). على نت بطيء ممكن ياخد وقت.")
model = whisper.load_model(a.model)


def tr(path, offset=0.0):
    """→ قائمة جمل [{"words":[…]}] بتقسيم whisper نفسه (جمل بطول 4-5 ثواني)"""
    r = model.transcribe(path, language=a.lang, word_timestamps=True, fp16=False, verbose=False,
                         initial_prompt=a.prompt, condition_on_previous_text=False)
    out = []
    for s in r["segments"]:
        ws = [{"word": w["word"].strip(), "start": round(w["start"] + offset, 3), "end": round(w["end"] + offset, 3)}
              for w in s.get("words", []) if w["word"].strip()]
        if ws:
            out.append(ws)
    return out


print("⏳ جاري التفريغ …")
segs_raw = tr(wav)
words = [w for sg in segs_raw for w in sg]


def speech_windows():
    """مقاطع فيها صوت (عكس السكتات) من ffmpeg silencedetect"""
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", wav, "-af", "silencedetect=n=-38dB:d=0.35", "-f", "null", "-"])
    dur = probe(video)["duration"]
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    if len(st) > len(en):
        en.append(dur)
    cur, out = 0.0, []
    for s0, e0 in zip(st, en):
        if s0 - cur > 0.2:
            out.append((cur, s0))
        cur = e0
    if dur - cur > 0.2:
        out.append((cur, dur))
    return out


if not a.no_gapfill:
    filled = 0
    for (s0, e0) in speech_windows():
        covered = [w for w in words if w["start"] >= s0 - 0.3 and w["start"] <= e0 + 0.3]
        if e0 - s0 >= 1.2 and not covered:
            p0, p1 = max(0, s0 - 0.3), e0 + 0.3
            piece = os.path.join(W, "_gap.wav")
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{p0:.2f}", "-t", f"{p1 - p0:.2f}", "-i", wav, piece])
            add_segs = [[w for w in sg if not any(abs(w["start"] - x["start"]) < 0.15 for x in words)] for sg in tr(piece, p0)]
            add_segs = [sg for sg in add_segs if sg]
            add = [w for sg in add_segs for w in sg]
            if add:
                segs_raw += add_segs
                words += add
                filled += len(add)
                print(f"  ↳ رجّعت {len(add)} كلمة مسقطة بين {s0:.1f}ث و{e0:.1f}ث")
            os.path.exists(piece) and os.remove(piece)
    # كلمة وحدة مدتها غير منطقية (>3ث) = غالباً سقط حواليها
    for w in words:
        if w["end"] - w["start"] > 3.0:
            print(f"  ⚠️ كلمة «{w['word']}» مدتها {w['end'] - w['start']:.1f}ث عند {w['start']:.1f}ث — راجع هالمقطع بالسمع")
    words.sort(key=lambda w: w["start"])

# ── الجمل: تقسيم whisper، والجملة الأطول من 18 كلمة بتنقسم عند أكبر فجوة بنص الجملة ──
segs_raw.sort(key=lambda sg: sg[0]["start"])


def split_long(sg):
    if len(sg) <= 18:
        return [sg]
    mid = len(sg) // 2
    k = max(range(max(4, mid - 4), min(len(sg) - 3, mid + 5)), key=lambda i: sg[i]["start"] - sg[i - 1]["end"])
    return split_long(sg[:k]) + split_long(sg[k:])


segs = []
for sg in segs_raw:
    for part in split_long(sg):
        segs.append({"id": len(segs), "start": part[0]["start"], "end": part[-1]["end"], "text": " ".join(x["word"] for x in part), "words": part})
jsave(os.path.join(W, "a.json"), {"language": a.lang, "segments": segs})

print(f"\n✅ {len(words)} كلمة · {len(segs)} جملة  →  a.json\n")
for s in segs:
    print(f"{s['id']:>3}  {s['start']:6.2f}-{s['end']:6.2f}  [{len(s['words'])} كلمة]  {s['text']}")
print("\nالخطوة الجاية: اقرا السكريبت فوق وصحّح الأغلاط، واكتب <work>/fixes.json (عدد كلمات كل جملة لازم يتطابق)، وبعدها captions.py")
