#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""srt.py — ملف ترجمة (.srt) + نص الكلام كامل (.txt لكابشن البوست) من caps.json.
  python srt.py <work> [name=final]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

W = work_dir(sys.argv[1])
name = sys.argv[2] if len(sys.argv) > 2 else "final"
caps = jload(os.path.join(W, "caps.json"))
if not caps:
    die("ما في caps.json")


def ts(t):
    t = max(0, t)
    return "%02d:%02d:%02d,%03d" % (t // 3600, t % 3600 // 60, t % 60, round((t % 1) * 1000) % 1000)


lines, txt, n = [], [], 0
for c in caps["cards"]:
    ws, i = c["w"], 0
    txt.append(" ".join(w["t"] for w in ws))
    while i < len(ws):                                   # سطر لكل 7 كلمات بالأكتر
        chunk = ws[i:i + 7]
        n += 1
        lines.append(f"{n}\n{ts(chunk[0]['s'])} --> {ts(chunk[-1]['e'] + 0.15)}\n{' '.join(w['t'] for w in chunk)}\n")
        i += 7
open(os.path.join(W, name + ".srt"), "w", encoding="utf-8").write("\n".join(lines))
open(os.path.join(W, name + ".txt"), "w", encoding="utf-8").write("\n".join(txt) + "\n")
print(f"✅ {name}.srt ({n} سطر) · {name}.txt ({sum(len(t.split()) for t in txt)} كلمة)")
