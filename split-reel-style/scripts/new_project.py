#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""new_project.py — بيجهّز مجلد مشروع مونتاج جديد.
  python new_project.py <work> --src <video> [--style split|paper] [--brand-dir <dir>]

  بيعمل: src.<ext> · compose.html (المحرّك + الستايل) · fonts/ (Rubik أو خطه المختار) · ملفات الستايل · theme.json · sfx.json · prefs.json · shots.js (قالب مع هويته)
  الهوية: ~/.claude/split-reel-brand/brand.json  (+ صورة البروفايل والخط جنبه) — بتنعمل من صفحة brand_setup.py.
  لو مش موجودة: كود خروج 3 + BRAND_MISSING = مستخدم جديد → شغّل  python brand_setup.py  (بيفتح صفحة ويب)، وبعد ما يحفظ أعد الأمر.
  --style بدونه: بياخد الستايل الافتراضي من هويته؛ ولو اختار «أقرّر كل مرة» بيطلع كود 5 (اسأله أي ستايل).
"""
import os, sys, shutil, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--src", required=True)
ap.add_argument("--style", default=None, choices=["split", "paper"])
ap.add_argument("--brand-dir", default=os.path.join(os.path.expanduser("~"), ".claude", "split-reel-brand"))
a = ap.parse_args()

brand_path = os.path.join(a.brand_dir, "brand.json")
brand = jload(brand_path)
if not brand:
    print("BRAND_MISSING: ما في هوية بصرية محفوظة (" + brand_path + ")")
    print("→ شغّل:  python \"" + os.path.join(SKILL, "scripts", "brand_setup.py") + "\"   (بيفتح صفحة ويب يختار فيها الستايل والألوان والخط وصورته)")
    print("  وبعد ما يحفظ أعد هالأمر.")
    sys.exit(3)
if not os.path.exists(a.src):
    die("الفيديو مو موجود: " + a.src)
style = a.style or brand.get("style") or "split"
if style == "ask":
    print("STYLE_ASK: المستخدم اختار «أقرّر كل مرة». اسأله: سبليت ولا ورق؟ وأعد الأمر مع --style split|paper")
    sys.exit(5)
a.style = style

W = os.path.abspath(a.work)
os.makedirs(os.path.join(W, "assets", "brand"), exist_ok=True)
ext = os.path.splitext(a.src)[1].lower() or ".mov"
shutil.copy2(a.src, os.path.join(W, "src" + ext))
shutil.copytree(os.path.join(SKILL, "engine", "fonts"), os.path.join(W, "fonts"), dirs_exist_ok=True)
bf = os.path.join(a.brand_dir, "fonts")
if os.path.isdir(bf) and brand.get("font", "Rubik") != "Rubik":      # خط مخصّص: بيحل محل Rubik (نفس الاسم alias بالكود)
    shutil.copytree(bf, os.path.join(W, "fonts"), dirs_exist_ok=True)
    for f in ("FONT.txt",):
        os.path.exists(os.path.join(W, "fonts", f)) and os.remove(os.path.join(W, "fonts", f))
    print(f"الخط: {brand['font']} (بالكود بيظهر باسم 'Rubik' كاسم مستعار)")

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
else:
    av = None
    print("⚠️ ما في صورة شخصية بالهوية: كرت الفولو بيطلع بدونها. ممكن يضيفها من brand_setup.py --edit")

P = brand.get("palette", {})
theme = {"bg": P.get("midnight", "#0E1116"), "ink": brand.get("ink", "#111111"), "acc": brand.get("accent", "#D97757"),
         "clay": brand.get("ink", "#C15F3C"), "mut": P.get("storm", "#8A847A"), "font": brand.get("font", "Rubik")}
jsave(os.path.join(W, "theme.json"), theme)
jsave(os.path.join(W, "sfx.json"), {"outro": 0})
prefs = brand.get("prefs", {})
jsave(os.path.join(W, "prefs.json"), prefs)
cap = brand.get("captions", {})
SZ = {"sm": (76, 48), "md": (88, 56), "lg": (100, 64)}.get(cap.get("size", "md"), (88, 56))
cap_js = f"SK.CAP.head = {SZ[0]}; SK.CAP.small = {SZ[1]}; SK.CAP.wHead = {cap.get('weight', 500)}; SK.CAP.wSmall = {cap.get('weight', 500)}; SK.CAP.mode = '{cap.get('mode', 'build')}';"

shots = f"""/* ═══ shots.js — تصميم اللقطات ({a.style}) ═══
   اقرا SKILL.md ← «التصميم»: كل لقطة بتبدأ على بداية كلمة من caps.json، وكل رسمة بتتحرك على توقيت كلماتك (SK.wordT / SK.span). */
SK.brand({json.dumps({k: brand[k] for k in brand if k in ("palette", "bgMap", "accent", "accentDark", "ink", "faceCaption", "profile")}, ensure_ascii=False, indent=2)});
{cap_js}
SK.preload({{ {("avatar: 'assets/brand/" + av + "'") if av else ""} }});
const W_ = (w, f) => {{ const x = SK.wordT(w, f || 0); return x ? x.s : 0; }};   // وقت أول كلمة بتطابق

SK.shots([
  {{ s: 0,    e: 99, kind: 'face', zoom: 1.12 }},     // ← امسح هاللقطة وصمّم لقطاتك (أنواعها بـSKILL.md)
]);

// SK.panel(بداية, نهاية, (lt) => {{ const t = بداية + lt;  /* رسم */ }});
"""
open(os.path.join(W, "shots.js"), "w", encoding="utf-8").write(shots)
print(f"✅ مشروع جاهز: {W}  (ستايل {a.style})")
if prefs:
    tr = "، ".join(prefs.get("transitions", []))
    print("تفضيلاته (prefs.json): انتقالات [" + tr + "] · مؤثرات " + ("آه" if prefs.get("sfx", True) else "لأ") + f" · موسيقى: {prefs.get('music', 'ask')}"
          + " · كرت فولو " + ("آه" if prefs.get("followCard", True) else "لأ") + f" · whisper: {prefs.get('whisperModel', 'ask')} · قص السكتات: {prefs.get('cutSilence', 'ask')}")
    print("→ راعيها بالتصميم، وما تسأله عن اللي محدّد منها («ask» بس هو اللي بتسأله).")
print("الخطوات الجاية: prepare.py ← transcribe.py ← captions.py ← (تصميم shots.js) ← render.js ← sfx.py ← export.py")
