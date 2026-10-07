#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""new_project.py — بيجهّز مجلد مشروع مونتاج جديد.
  python new_project.py <work> --src <video> [--style split|paper] [--brand-dir <dir>]

  بيعمل: src.<ext> · compose.html (المحرّك + الستايل) · fonts/ · ملفات الستايل · theme.json (من هويتك) · sfx.json · shots.js (قالب فاضي مع هويتك)
  الهوية: ~/.claude/split-reel-brand/brand.json  (+ صورة البروفايل جنبه). لو مش موجودة بيطلع كود 3 ويكتب BRAND_MISSING:
  يعني مستخدم جديد → اسأله عن هويته أول (شوف SKILL.md) واكتب الملف، وبعدها شغّل الأمر مرة تانية.
"""
import os, sys, shutil, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--src", required=True)
ap.add_argument("--style", default="split", choices=["split", "paper"])
ap.add_argument("--brand-dir", default=os.path.join(os.path.expanduser("~"), ".claude", "split-reel-brand"))
a = ap.parse_args()

brand_path = os.path.join(a.brand_dir, "brand.json")
brand = jload(brand_path)
if not brand:
    print("BRAND_MISSING: ما في هوية بصرية محفوظة (" + brand_path + ")")
    print("→ اسأل المستخدم عن ألوانه وصورته واسمه ويوزره، واكتب brand.json، وبعدها أعد الأمر.")
    sys.exit(3)
if not os.path.exists(a.src):
    die("الفيديو مو موجود: " + a.src)

W = os.path.abspath(a.work)
os.makedirs(os.path.join(W, "assets", "brand"), exist_ok=True)
ext = os.path.splitext(a.src)[1].lower() or ".mov"
shutil.copy2(a.src, os.path.join(W, "src" + ext))
shutil.copytree(os.path.join(SKILL, "engine", "fonts"), os.path.join(W, "fonts"), dirs_exist_ok=True)

kits = [os.path.join(SKILL, "kit", "split-style.js")]
tags = ['<script src="split-style.js"></script>']
if a.style == "paper":
    paper = os.path.join(os.path.dirname(SKILL), "paper-reel-style", "kit", "paper-style.js")
    if not os.path.exists(paper):
        die("paper-reel-style مو منصّب جنب split-reel-style")
    kits.append(paper)
    tags.append('<script src="paper-style.js"></script>')
tags.append('<script src="shots.js"></script>')
for k in kits:
    shutil.copy2(k, W)
html = open(os.path.join(SKILL, "engine", "engine.html"), encoding="utf-8").read().replace("<!--STYLE_SCRIPTS-->", "\n".join(tags))
open(os.path.join(W, "compose.html"), "w", encoding="utf-8").write(html)

# الصورة الشخصية: نسخها كما هي (بدون أي تعديل)
prof = brand.get("profile", {})
av = prof.get("avatar")
if av and os.path.exists(os.path.join(a.brand_dir, av)):
    shutil.copy2(os.path.join(a.brand_dir, av), os.path.join(W, "assets", "brand", av))

P = brand.get("palette", {})
theme = {"bg": P.get("midnight", "#0E1116"), "ink": brand.get("ink", "#111111"), "acc": brand.get("accent", "#D97757"),
         "clay": brand.get("ink", "#C15F3C"), "mut": P.get("storm", "#8A847A"), "font": brand.get("font", "Rubik")}
jsave(os.path.join(W, "theme.json"), theme)
jsave(os.path.join(W, "sfx.json"), {"outro": 0})

shots = f"""/* ═══ shots.js — تصميم اللقطات ({a.style}) ═══
   اقرا SKILL.md ← «التصميم»: كل لقطة بتبدأ على بداية كلمة من caps.json، وكل رسمة بتتحرك على توقيت كلماتك (SK.wordT / SK.span). */
SK.brand({json.dumps({k: brand[k] for k in brand if k in ("palette", "bgMap", "accent", "accentDark", "ink", "faceCaption", "profile")}, ensure_ascii=False, indent=2)});
SK.preload({{ avatar: 'assets/brand/{av or "avatar.jpg"}' }});
const W_ = (w, f) => {{ const x = SK.wordT(w, f || 0); return x ? x.s : 0; }};   // وقت أول كلمة بتطابق

SK.shots([
  {{ s: 0,    e: 99, kind: 'face', zoom: 1.12 }},     // ← امسح هاللقطة وصمّم لقطاتك (أنواعها بـSKILL.md)
]);

// SK.panel(بداية, نهاية, (lt) => {{ const t = بداية + lt;  /* رسم */ }});
"""
open(os.path.join(W, "shots.js"), "w", encoding="utf-8").write(shots)
print(f"✅ مشروع جاهز: {W}  (ستايل {a.style})")
print("الخطوات الجاية: prepare.py ← transcribe.py ← captions.py ← (تصميم shots.js) ← render.js ← sfx.py ← export.py")
