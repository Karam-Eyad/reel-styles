#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""setup_check.py — بيفحص إذا كل شي لازم للسكيلات مثبّت، وبيقلّك شو ناقص بالأمر الجاهز.
  python setup_check.py            ← فحص بس
  python setup_check.py --install  ← بيثبّت المكتبات الناقصة (pip + npm). الموديلات الكبيرة بتنزل أول استخدام، مش هون.
"""
import os, sys, shutil, subprocess, importlib.util, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import SKILL

ap = argparse.ArgumentParser()
ap.add_argument("--install", action="store_true")
a = ap.parse_args()
missing = []
ok = lambda m: print("  ✅ " + m)
bad = lambda m, fix: (print("  ❌ " + m), missing.append(fix))

print("الأدوات:")
v = sys.version_info
ok(f"Python {v.major}.{v.minor}") if v >= (3, 9) else bad(f"Python {v.major}.{v.minor} (لازم 3.9+)", ("manual", "ثبّت Python 3.9 أو أحدث"))
for t in ("ffmpeg", "ffprobe", "node", "npm"):
    ok(f"{t}") if shutil.which(t) else bad(t, ("manual", {"ffmpeg": "ثبّت ffmpeg (winget install ffmpeg / brew install ffmpeg)", "ffprobe": "جاي مع ffmpeg", "node": "ثبّت Node.js 18+ من nodejs.org", "npm": "جاي مع Node.js"}[t]))

LA, PF, P86 = os.environ.get("LOCALAPPDATA", ""), os.environ.get("ProgramFiles", "C:/Program Files"), os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")
chrome = [p for p in (os.environ.get("CHROME_PATH", ""), PF + "/Google/Chrome/Application/chrome.exe", P86 + "/Google/Chrome/Application/chrome.exe", LA + "/Google/Chrome/Application/chrome.exe",
          PF + "/Microsoft/Edge/Application/msedge.exe", P86 + "/Microsoft/Edge/Application/msedge.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser") if p and os.path.exists(p)]
ok("Chrome/Edge: " + chrome[0]) if chrome else bad("Chrome أو Edge", ("manual", "ثبّت Google Chrome (بيرسم الفريمات)"))

print("مكتبات بايثون:")
for mod, pipname in (("numpy", "numpy"), ("scipy", "scipy"), ("PIL", "pillow"), ("whisper", "openai-whisper"), ("rembg", "rembg[cpu]"), ("onnxruntime", "onnxruntime")):
    ok(pipname) if importlib.util.find_spec(mod) else bad(pipname, ("pip", pipname))

print("مكتبات المحرّك:")
pj = os.path.join(SKILL, "node_modules", "puppeteer-core")
ok("puppeteer-core") if os.path.isdir(pj) else bad("puppeteer-core", ("npm", SKILL))

print("موديلات (بتنزل أول استخدام، مرة وحدة):")
wc = os.path.join(os.path.expanduser("~"), ".cache", "whisper")
have = [f for f in os.listdir(wc)] if os.path.isdir(wc) else []
print("  • whisper:", ", ".join(have) if have else "ولا موديل بعد (medium = 1.4GB الأدق بالعامية، small = 460MB أخف)")
u2 = os.path.join(os.path.expanduser("~"), ".u2net")
print("  • قص الشخص:", ", ".join(os.listdir(u2)) if os.path.isdir(u2) and os.listdir(u2) else "بعد (u2net_human_seg = 170MB، أو u2netp = 4.7MB)")

pips = sorted({m[1] for m in missing if m[0] == "pip"})
manual = [m[1] for m in missing if m[0] == "manual"]
if a.install:
    if pips:
        print("\n⏳ pip install " + " ".join(pips))
        subprocess.run([sys.executable, "-m", "pip", "install", "-U", *pips])
    if any(m[0] == "npm" for m in missing) and shutil.which("npm"):
        print("\n⏳ npm install")
        subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=SKILL, shell=(os.name == "nt"))
    print("\nأعد الفحص للتأكد:  python setup_check.py")
elif missing:
    print("\nناقص:")
    if pips:
        print(f"  python -m pip install -U {' '.join(pips)}")
    if any(m[0] == "npm" for m in missing):
        print(f'  cd "{SKILL}" && npm install')
    for m in manual:
        print("  " + m)
    print("أو شغّل:  python setup_check.py --install")
else:
    print("\n✅ كل شي جاهز")
sys.exit(1 if missing else 0)
