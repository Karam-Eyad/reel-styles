#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""prepare.py — يجهّز الفيديو للمونتاج.
  python prepare.py <work> [--cut-silence] [--noise -35] [--min-silence 0.5] [--drop 3.9-8.7 20-22]

  1) بيقرا <work>/src.(mov|mp4…)
  2) بيحوّله لـ 1080×1920 (9:16) بـ30 فريم/ث، SDR (بيحوّل HDR تبع الآيفون لو لزم)، بالتوجيه الصح
  3) --cut-silence: بيشيل السكتات الأطول من --min-silence ثانية (بيترك نفَس 0.08ث حوالين الكلام)
     --drop a-b …: بيشيل مقاطع معيّنة (بثواني الفيديو الأصلي) — لما بدك تحذف جملة. بعدها أعد transcribe.py (التوقيتات بتنزاح)
  4) بيكتب <work>/cutz.mp4 (الفيديو الجاهز) و<work>/vfr/NNNNN.jpg (فريم لكل 1/30 ث) و<work>/cut.json
"""
import os, re, sys, argparse, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--cut-silence", action="store_true")
ap.add_argument("--noise", type=float, default=-35.0)
ap.add_argument("--min-silence", type=float, default=0.5)
ap.add_argument("--drop", nargs="*", default=[], help="مقاطع تنشال: a-b بثواني المصدر")
a = ap.parse_args()
W = work_dir(a.work)
need("ffmpeg")
src = find_source(W)
if not src:
    die("حط الفيديو بالمجلد باسم src.mov (أو src.mp4)")
info = probe(src)
print(f"المصدر: {info['width']}×{info['height']} · {info['duration']:.2f}ث · دوران {info['rotation']}° · {info['transfer'] or 'sdr'}")
if not info["has_audio"]:
    die("الفيديو بدون صوت، ما فيه شو نفرّغه")

# ── سلسلة الفلاتر للصورة ──
vf = []
if info["transfer"] in ("arib-std-b67", "smpte2084"):
    vf.append("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv")
    print("⚠️ HDR → SDR (تحويل الألوان)")
ar = info["width"] / info["height"]
if abs(ar - 9 / 16) > 0.02:
    print(f"⚠️ النسبة {ar:.2f} مو 9:16 — بينقص من النص ليصير 9:16")
vf += ["scale=1080:1920:force_original_aspect_ratio=increase", "crop=1080:1920", "fps=30", "setsar=1", "format=yuv420p"]
VF = ",".join(vf)

# ── السكتات ──
keep = [[0.0, info["duration"]]]
if a.cut_silence:
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-vn", "-af", f"silencedetect=n={a.noise}dB:d={a.min_silence}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    if len(starts) > len(ends):
        ends.append(info["duration"])
    pad, cur, keep = 0.08, 0.0, []
    for s0, e0 in zip(starts, ends):
        if s0 - cur > 0.25:
            keep.append([max(0, cur - 0.0), min(info["duration"], s0 + pad)])
        cur = max(0.0, e0 - pad)
    if info["duration"] - cur > 0.25:
        keep.append([cur, info["duration"]])
    keep = keep or [[0.0, info["duration"]]]
    print(f"قص السكتات: {len(keep)} مقطع")

if a.drop:
    cuts = sorted((float(x.split("-")[0]), float(x.split("-")[1])) for x in a.drop)
    nk = []
    for b0, b1 in keep:
        cur = b0
        for c0, c1 in cuts:
            if c1 <= cur or c0 >= b1:
                continue
            if c0 > cur:
                nk.append([cur, c0])
            cur = max(cur, c1)
        if cur < b1:
            nk.append([cur, b1])
    keep = [k for k in nk if k[1] - k[0] > 0.1] or keep
    print(f"حذف {len(cuts)} مقطع يدوي")

total = round(sum(b - a_ for a_, b in keep), 3)
jsave(os.path.join(W, "cut.json"), {"keep": keep, "total": total, "src_dur": info["duration"]})

out = os.path.join(W, "cutz.mp4")
enc = ["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart"]
if len(keep) == 1 and keep[0][0] == 0.0 and abs(keep[0][1] - info["duration"]) < 0.01:
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vf", VF, "-af", "aresample=48000", *enc, out])
else:
    parts = []
    for i, (b0, b1) in enumerate(keep):
        parts.append(f"[0:v]trim={b0:.3f}:{b1:.3f},setpts=PTS-STARTPTS,{VF}[v{i}];[0:a]atrim={b0:.3f}:{b1:.3f},asetpts=PTS-STARTPTS,aresample=48000[a{i}]")
    cat = "".join(f"[v{i}][a{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=1:a=1[v][a]"
    graph = ";\n".join(parts + [cat])
    script = os.path.join(W, "_filter.txt")
    open(script, "w", encoding="utf-8").write(graph)
    tail = ["-map", "[v]", "-map", "[a]", *enc, out]
    # ffmpeg القديم: -filter_complex_script · الجديد (7+): -/filter_complex · وآخر حل: inline
    for opts in (["-filter_complex_script", script], ["-/filter_complex", script], ["-filter_complex", graph]):
        r = run(["ffmpeg", "-y", "-v", "error", "-i", src, *opts, *tail], check=False)
        if r.returncode == 0:
            break
    else:
        die("فشل قص المقاطع:\n" + (r.stderr or "")[-500:])
    os.remove(script)

# ── الفريمات ──
vfr = os.path.join(W, "vfr")
shutil.rmtree(vfr, ignore_errors=True)
os.makedirs(vfr)
run(["ffmpeg", "-y", "-v", "error", "-i", out, "-vf", "fps=30", "-q:v", "3", "-start_number", "1", os.path.join(vfr, "%05d.jpg")])
n = len([f for f in os.listdir(vfr) if f.endswith(".jpg")])
print(f"✅ جاهز: cutz.mp4 · {probe(out)['duration']:.2f}ث · {n} فريم" + (f" · انشال {info['duration'] - total:.1f}ث سكوت" if a.cut_silence else ""))
