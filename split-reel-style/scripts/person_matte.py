#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""person_matte.py — يقصّ المتحدث من فريمات لقطات split عشان راسه يطلع فوق الخلفية الملوّنة (مثل المرجع).
بديل ويندوز لـ personmask.swift (ماك). يستخدم rembg (u2net_human_seg) على المعالج.

  python person_matte.py <work> 0-2.1 7.0-9.0 10.5-14.0      ← مدى كل لقطة split بالثواني
  خيارات: --step 2  (قناع كل فريمين وينسخ للي بينهم — أسرع بالنص) · --size 640 (دقة القناع)

يكتب <work>/bt/person/NNNNN.png (1080×1920 بشفافية) و<work>/behind.json ← ranges (يدمج مع الموجود، lines فاضية = ما فيه «ورا الشخص»).
"""
import sys, os, json, argparse
try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception: pass
from PIL import Image, ImageFilter

FPS = 30
ap = argparse.ArgumentParser()
ap.add_argument('work'); ap.add_argument('ranges', nargs='+')
ap.add_argument('--step', type=int, default=1); ap.add_argument('--size', type=int, default=640)
ap.add_argument('--erode', type=int, default=2)
ap.add_argument('--model', default='u2net_human_seg')   # u2net_human_seg (170MB، الأدق) · u2netp (4.7MB، أخف وأسرع بتنزيله، حواف أخشن)
ap.add_argument('--hard', type=float, default=0.55)   # يشد الحافة: أي بكسل نص شفاف تحت هالحد بيختفي (ضبابية حركة الإيد بتعمل ظل رمادي على الخلفيات الفاتحة)
ap.add_argument('--refine', action='store_true')      # يطبّق --hard على أقنعة موجودة بدون ما يعيد الموديل   # يقضم حافة القناع بكسلين: يشيل هالة الخلفية الغامقة حول الشعر والإيد
a = ap.parse_args()
W = a.work
try:
    from rembg import new_session, remove
except ImportError:
    sys.exit('rembg مو مثبّت: python -m pip install "rembg[cpu]" onnxruntime')
sess = new_session(a.model)
os.makedirs(os.path.join(W, 'bt', 'person'), exist_ok=True)
nvf = len([f for f in os.listdir(os.path.join(W, 'vfr')) if f.endswith('.jpg')])
fr_ranges = []
for r in a.ranges:
    s, e = (float(x) for x in r.split('-'))
    fr_ranges.append([max(1, round(s * FPS) + 1), min(nvf, round(e * FPS) + 1)])
todo = [i for r in fr_ranges for i in range(r[0], r[1] + 1)]
done, last = 0, None
tops = {}
import numpy as np
for n, i in enumerate(todo):
    out = os.path.join(W, 'bt', 'person', f'{i:05d}.png')
    src = Image.open(os.path.join(W, 'vfr', f'{i:05d}.jpg')).convert('RGB')
    if os.path.exists(out) and a.refine:
        im = Image.open(out); al = im.split()[-1].point(lambda v: 0 if v < a.hard * 255 else min(255, int((v - a.hard * 255) / (0.25 * 255) * 255)))
        im.putalpha(al); im.save(out); done += 1
    if os.path.exists(out):
        a_ = np.asarray(Image.open(out).split()[-1]); r_ = np.where((a_ > 128).sum(1) > 6)[0]
        if len(r_): tops[i] = int(r_[0] * 1920 / a_.shape[0])
        last = None; continue
    if last is None or n % a.step == 0:
        sm = src.resize((a.size * src.width // src.height, a.size)) if src.height > a.size else src
        m = remove(sm, session=sess, only_mask=True).resize(src.size, Image.BILINEAR)
        if a.erode: m = m.filter(ImageFilter.MinFilter(a.erode * 2 + 1))
        m = m.filter(ImageFilter.GaussianBlur(1.6))
        if a.hard: m = m.point(lambda v: 0 if v < a.hard * 255 else min(255, int((v - a.hard * 255) / (0.25 * 255) * 255)))
        last = m
    rgba = src.copy(); rgba.putalpha(last); rgba.save(out)
    rows = np.where((np.asarray(last) > 128).sum(1) > 6)[0]      # أعلى صف فيه الشخص (إحداثيات 1080×1920)
    if len(rows): tops[i] = int(rows[0] * 1920 / last.height)
    done += 1
    if done % 30 == 0: print(f'  {done}/{len(todo)}', flush=True)
bj = os.path.join(W, 'behind.json')
B = json.load(open(bj, encoding='utf-8')) if os.path.exists(bj) else {'lines': []}
B.setdefault('lines', []); B['ranges'] = sorted({tuple(r) for r in (B.get('ranges', []) + fr_ranges)})
B['ranges'] = [list(r) for r in B['ranges']]
B['tops'] = {**B.get('tops', {}), **{str(k): v for k, v in tops.items()}}
json.dump(B, open(bj, 'w', encoding='utf-8'), ensure_ascii=False)
print(f'✅ قناع الشخص: {done} فريم جديد · {len(fr_ranges)} لقطة split')
