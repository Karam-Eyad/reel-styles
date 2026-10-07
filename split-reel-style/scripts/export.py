#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""export.py — يجمّع الفريمات والصوت بفيديو نهائي، ويعاير الصوت لمستوى إنستغرام (‎-14 LUFS) بمحدِّد يمنع التشويه.
  python export.py <work> [--name final] [--music music.wav] [--music-db -15] [--lufs -14] [--peak -1.5] [--srt]

  بدون --music  → <name>.mp4
  مع --music    → <name>-nomusic.mp4 (كلام + مؤثرات)  و  <name>-music.mp4 (والموسيقى تنخفض لحالها تحت الكلام)
  المدخلات: out/NNNNN.jpg (من render.js) · cutz.mp4 (صوته) · sfx.wav (من sfx.py)
  ⛔ بيفحص أعلى ذروة بالنهاية، وإذا فوق ‎-1.4 dB بيعيد المحاولة بمحدِّد أقوى.
"""
import os, re, sys, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *

ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--name", default="final")
ap.add_argument("--music", default=None)
ap.add_argument("--music-db", type=float, default=-9.0)
ap.add_argument("--duck", type=float, default=3.0, help="قوة خفض الموسيقى تحت الكلام (نسبة الضغط): 1 = بدون · 3 = خفيف · 6 = قوي")
ap.add_argument("--lufs", type=float, default=-14.0)
ap.add_argument("--peak", type=float, default=-1.5)
ap.add_argument("--srt", action="store_true")
a = ap.parse_args()
W = work_dir(a.work)
need("ffmpeg")
P = lambda *x: os.path.join(W, *x)
caps = jload(P("caps.json"))
if not caps:
    die("ما في caps.json")
outro = (jload(P("sfx.json"), {}) or {}).get("outro", 0) or 0
dur = caps["total"] + outro
nframes = round(dur * FPS)
have = len([f for f in os.listdir(P("out"))]) if os.path.isdir(P("out")) else 0
if have < nframes:
    die(f"الفريمات ناقصة ({have} من {nframes}) — شغّل render.js all")
if not os.path.exists(P("cutz.mp4")):
    die("ما في cutz.mp4")
has_sfx = os.path.exists(P("sfx.wav"))

# ── 1) الفيديو بدون صوت ──
vid = P("_video.mp4")
run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-start_number", "0", "-i", P("out", "%05d.jpg"), "-frames:v", str(nframes),
     "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", vid])
print(f"الفيديو: {nframes} فريم · {dur:.2f}ث")


def measure(path):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=I=%g:TP=%g:LRA=11:print_format=json" % (a.lufs, a.peak), "-f", "null", "-"])
    t = r.stderr
    return json.loads(t[t.rindex("{"):t.rindex("}") + 1])


def master(src, dst, extra_limit_db=0.0):
    """loudnorm على مرحلتين (linear) + محدِّد قمم"""
    m = measure(src)
    lim = 10 ** ((a.peak + extra_limit_db) / 20)
    flt = ("loudnorm=I=%g:TP=%g:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true,"
           "alimiter=limit=%.4f:attack=1:release=50:level=false,aresample=48000") % (a.lufs, a.peak, m["input_i"], m["input_tp"], m["input_lra"], m["input_thresh"], m["target_offset"], lim)
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af", flt, "-ar", "48000", dst])


def mix(with_music):
    out = P("_mix_music.wav" if with_music else "_mix_plain.wav")
    split = "asplit=2[v1][v2]" if with_music else "anull[v1]"
    parts = [f"[0:a]aresample=48000,apad,atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,{split}"]
    ins = ["-i", P("cutz.mp4")]
    labels = "[v1]"
    n = 1
    if has_sfx:
        ins += ["-i", P("sfx.wav")]
        parts.append(f"[{n}:a]aresample=48000,apad,atrim=0:{dur:.3f},asetpts=PTS-STARTPTS[s]")
        labels += "[s]"; n += 1
    if with_music:
        ins += ["-i", a.music]
        parts.append(f"[{n}:a]aresample=48000,volume={a.music_db}dB,apad,atrim=0:{dur:.3f},afade=t=in:d=0.6,afade=t=out:st={max(0, dur - 1.5):.2f}:d=1.5[m]")
        parts.append(f"[m][v2]sidechaincompress=threshold=0.04:ratio={a.duck}:attack=10:release=400[md]")
        labels += "[md]"; n += 1
    parts.append(f"{labels}amix=inputs={n}:normalize=0:duration=longest[mix]")
    run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(parts), "-map", "[mix]", "-t", f"{dur:.3f}", "-ar", "48000", out])
    return out


def final(mixwav, dst):
    for extra in (0.0, -1.5, -3.0):                    # لو الذروة لسا عالية، حدّ أقوى
        mw = P("_master.wav")
        master(mixwav, mw, extra)
        run(["ffmpeg", "-y", "-v", "error", "-i", vid, "-i", mw, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.3f}", "-movflags", "+faststart", dst])
        r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", dst, "-af", "volumedetect", "-f", "null", "-"])
        mx = float(re.search(r"max_volume: (-?[\d.]+) dB", r.stderr).group(1))
        m = measure(dst)
        if mx <= -1.4:
            print(f"✅ {os.path.basename(dst)} — {dur:.2f}ث · {float(m['input_i']):.1f} LUFS · ذروة {mx:.1f} dB · {os.path.getsize(dst) / 1048576:.1f}MB")
            return
    die(f"الذروة لسا {mx} dB — راجع المؤثرات (ممكن واحد عالي كتير)")


if a.music and not os.path.exists(a.music) and os.path.exists(P(a.music)):
    a.music = P(a.music)                       # اسم ملف داخل مجلد المشروع
if a.music:
    if not os.path.exists(a.music):
        die("ملف الموسيقى مو موجود: " + a.music)
    final(mix(False), P(a.name + "-nomusic.mp4"))
    final(mix(True), P(a.name + "-music.mp4"))
else:
    final(mix(False), P(a.name + ".mp4"))
for f in ("_video.mp4", "_mix_plain.wav", "_mix_music.wav", "_master.wav"):
    os.path.exists(P(f)) and os.remove(P(f))
if a.srt:
    import subprocess
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "srt.py"), W, a.name])
