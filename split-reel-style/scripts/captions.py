#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""captions.py — يبني caps.json (الكابشن بتوقيت كل كلمة) من a.json + fixes.json.
  python captions.py <work>

fixes.json (اختياري؛ بدونه بياخد نص whisper متل ما هو):
  { "fix": [ ["كلمات","الجملة","0"], "جملة 1 كنص كامل", null, ["جملة","2"] ],
    "fx":  { "ببلاش":"kash", "كلود":"acc", "حدود":"box" } }
  - fix[i] = قائمة الكلمات الصحيحة للجملة i: لازم عددها = عدد كلمات whisper للجملة (التوقيت بيعتمد عليه).
    "" بمكان كلمة = تنشال من الكابشن والصوت يضل.
  - fix[i] = نص كامل = whisper هلوس بهالجملة (كلماته غلط وعددها ما يفيد) → الكلمات بتتوزّع على مدة الجملة بنسبة طولها.
  - fix[i] = null = بدون تغيير.
  - fx: مفتاحه كلمة وحدة كما هي بالكابشن: acc لون التمييز · kash كشيدة · box مستطيل معكوس.
  - فصل العربي عن الإنجليزي بمسافة: «بالـ AI» مش «بالـAI» (غير هيك بينقلب على الشاشة).
"""
import os, re, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

ap = argparse.ArgumentParser()
ap.add_argument("work")
a = ap.parse_args()
W = work_dir(a.work)
tr = jload(os.path.join(W, "a.json"))
if not tr:
    die("ما في a.json — شغّل transcribe.py أول")
fx_doc = jload(os.path.join(W, "fixes.json"), {}) or {}
FIX, FXMAP = fx_doc.get("fix") or [], fx_doc.get("fx") or {}
total = probe(os.path.join(W, "cutz.mp4"))["duration"]
HINDI = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
strip = lambda w: re.sub(r"[ً-ْـ«»\"'؟?!.,،:؛]", "", w).strip()

cards = []
for i, seg in enumerate(tr["segments"]):
    ws = seg["words"]
    f = FIX[i] if i < len(FIX) else None
    if f is None:
        f = [w["word"] for w in ws]
    if isinstance(f, str):                                   # نص كامل: وزّعه بنسبة الطول
        toks = f.split()
        s0, e0, tot = ws[0]["start"], ws[-1]["end"], sum(len(t) for t in toks) or 1
        c, pairs = 0, []
        for t in toks:
            p0 = s0 + (e0 - s0) * c / tot
            c += len(t)
            pairs.append((t, p0, s0 + (e0 - s0) * c / tot))
    else:
        if len(f) != len(ws):
            die(f"الجملة {i}: whisper {len(ws)} كلمة، fixes.json {len(f)} — لازم يتساووا (أو اكتبها نص وحدة إذا whisper هلوس)\n   whisper: {' | '.join(w['word'] for w in ws)}")
        pairs = [(t, w["start"], w["end"]) for w, t in zip(ws, f) if t]
    if not pairs:
        continue
    out = []
    for t, s0, e0 in pairs:
        t = t.translate(HINDI)
        if e0 <= s0:
            e0 = s0 + 0.12
        w = {"t": t, "s": round(s0, 3), "e": round(e0, 3)}
        fx = FXMAP.get(t) or FXMAP.get(strip(t))
        if fx:
            w["fx"] = fx
        out.append(w)
    cards.append({"s": round(max(0.0, out[0]["s"] - 0.10), 3), "e": round(min(total, max(x["e"] for x in out) + 0.28), 3), "w": out})
cards.sort(key=lambda c: c["s"])
for i in range(len(cards) - 1):
    if cards[i]["e"] > cards[i + 1]["s"]:
        cards[i]["e"] = round(cards[i + 1]["s"] - 0.02, 3)
jsave(os.path.join(W, "caps.json"), {"total": round(total, 3), "cards": cards})
print(f"✅ كروت: {len(cards)} · المدة {total:.2f}ث  →  caps.json")
for c in cards:
    print(f"{c['s']:6.2f}-{c['e']:6.2f}  " + " ".join(x["t"] for x in c["w"]))
