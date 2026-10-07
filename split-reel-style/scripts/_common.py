# -*- coding: utf-8 -*-
"""أدوات مشتركة لسكربتات reel-styles."""
import sys, os, json, subprocess, shutil

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SKILL = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))   # مجلد split-reel-style
FPS = 30


def die(msg, code=1):
    print("❌ " + msg)
    sys.exit(code)


def need(tool):
    p = shutil.which(tool)
    if not p:
        die(f"{tool} مو موجود. شغّل:  python \"{os.path.join(SKILL, 'scripts', 'setup_check.py')}\"", 2)
    return p


def run(cmd, capture=True, check=True):
    r = subprocess.run(cmd, capture_output=capture, text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        tail = (r.stderr or r.stdout or "")[-600:]
        die(f"فشل الأمر: {' '.join(str(c) for c in cmd[:4])} …\n{tail}")
    return r


def work_dir(arg):
    w = os.path.abspath(arg)
    if not os.path.isdir(w):
        die(f"المجلد مو موجود: {w}")
    return w


def jload(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def jsave(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def probe(path):
    """ffprobe → dict: duration, width, height, rotation, transfer, has_audio"""
    need("ffprobe")
    r = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path])
    j = json.loads(r.stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    rot = 0
    for sd in (v or {}).get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    rot = int((v or {}).get("tags", {}).get("rotate", rot) or rot)
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) in (90, 270):
        w, h = h, w
    return {"duration": float(j["format"].get("duration") or v.get("duration") or 0), "width": w, "height": h,
            "rotation": rot, "transfer": v.get("color_transfer", ""), "has_audio": a is not None,
            "fps": v.get("r_frame_rate", "30/1")}


def find_source(work):
    for ext in ("mov", "mp4", "m4v", "mkv", "webm", "avi", "MOV", "MP4"):
        p = os.path.join(work, "src." + ext)
        if os.path.exists(p):
            return p
    return None
