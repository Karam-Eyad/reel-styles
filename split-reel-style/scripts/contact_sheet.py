#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""contact_sheet.py — ورقة معاينة: كل لقطات prev/ بصورة وحدة (3 أعمدة) والتوقيت على كل لقطة.
  python contact_sheet.py <work> <out.jpg> 1.2 3.0 4.3 6.0 8.0 29.0      (بعد render.js preview بنفس الأوقات)"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

W = work_dir(sys.argv[1])
out = sys.argv[2]
times = [float(x) for x in sys.argv[3:]]
if not times:
    die("اكتب أوقات اللقطات")
TW, COLS = 360, 3
th = int(TW * 16 / 9)
rows = (len(times) + COLS - 1) // COLS
sheet = Image.new("RGB", (TW * COLS, th * rows), (20, 20, 20))
try:
    font = ImageFont.truetype("arial.ttf", 26)
except Exception:
    font = ImageFont.load_default()
for k, t in enumerate(times):
    p = os.path.join(W, "prev", f"t{t:.2f}.jpg")
    if not os.path.exists(p):
        print("ناقصة:", p)
        continue
    im = Image.open(p).convert("RGB").resize((TW, th), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 100, 34), fill=(0, 0, 0))
    d.text((8, 4), f"{t:g}s", fill=(255, 255, 255), font=font)
    sheet.paste(im, ((k % COLS) * TW, (k // COLS) * th))
sheet.save(out if os.path.isabs(out) else os.path.join(W, out), quality=88)
print("✅", out)
