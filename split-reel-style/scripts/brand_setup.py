#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""brand_setup.py — صفحة ويب لإعداد الهوية البصرية والستايل (بأول استخدام، أو لتعديلها بعدين).

  python brand_setup.py                 يفتح الصفحة بالمتصفح، وبيستنى لحد ما المستخدم يضغط «حفظ»
  python brand_setup.py --edit          نفس الشي بس بيحمّل الهوية الحالية للتعديل
  python brand_setup.py --no-open       ما يفتح المتصفح (بيطبع الرابط بس)
  python brand_setup.py --brand-dir D   مجلد الهوية (الافتراضي ~/.claude/split-reel-brand)

الصفحة بتشتغل على جهازه فقط (127.0.0.1 + رمز عشوائي)، وما بتبعت أي شي لأي مكان.
بتختار فيها: الستايل · الألوان · الخط · الصورة والاسم واليوزر · ستايل الكابشن · التفضيلات.
بالنهاية بتكتب: <brand-dir>/brand.json + avatar.<ext> (صورته الأصلية بدون أي تعديل) + fonts/ (لو اختار خط غير Rubik).
الناتج بالطرفية: سطر «BRAND_SAVED: <path>» لما يخلص، أو كود خروج 4 لو انتهى الوقت بدون حفظ.
"""
import os, sys, json, time, re, secrets, threading, argparse, shutil, socket, webbrowser, http.client, urllib.request, urllib.parse, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import SKILL, jload, jsave

ap = argparse.ArgumentParser()
ap.add_argument("--edit", action="store_true")
ap.add_argument("--no-open", action="store_true")
ap.add_argument("--port", type=int, default=0)
ap.add_argument("--timeout", type=int, default=45, help="دقائق")
ap.add_argument("--brand-dir", default=os.path.join(os.path.expanduser("~"), ".claude", "split-reel-brand"))
a = ap.parse_args()

BRAND_DIR = os.path.abspath(a.brand_dir)
PENDING = os.path.join(BRAND_DIR, ".pending")
PAGE = os.path.join(SKILL, "setup", "index.html")
TOKEN = secrets.token_urlsafe(10)
DONE = threading.Event()
RESULT = {}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
WEIGHT_SETS = ["300..900", "200..900", "100..900", "160..700", "300..700", "400..700", "300;400;500;600;700;800;900",
               "300;400;500;700;800;900", "300;400;500;600;700", "300;400;500;700", "400;500;700", "400;700", "400"]
SUBSETS = ("arabic", "latin", "latin-ext")


def http_get(url, binary=False, timeout=40, tries=4):
    """بيعيد المحاولة لو انقطع الاتصال (النت المتقلّب) — لكن مش لو السيرفر رد 4xx"""
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if 400 <= e.code < 500:
                raise
            last = e
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError, http.client.HTTPException) as e:
            last = e
        time.sleep(1.5 * (k + 1))
    raise last


def prepare_font(family):
    """ينزّل الخط من Google Fonts لـ<PENDING>/fonts ويكتب fonts.css بحيث الاسم المستخدم بالكود يضل 'Rubik' (alias)."""
    fam = urllib.parse.quote_plus(family.strip())
    css, used = None, None
    for ws in WEIGHT_SETS:
        try:
            css = http_get(f"https://fonts.googleapis.com/css2?family={fam}:wght@{ws}&display=swap")
            used = ws
            break
        except urllib.error.HTTPError as e:
            if e.code not in (400, 404):
                raise
    if css is None:
        try:
            css = http_get(f"https://fonts.googleapis.com/css2?family={fam}&display=swap"); used = "400"
        except Exception:
            raise ValueError(f"ما لقيت خط اسمه «{family}» بـ Google Fonts")
    blocks = re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, re.S)
    if not any(b[0] == "arabic" for b in blocks):
        raise ValueError(f"الخط «{family}» ما فيه حروف عربية")
    out_dir = os.path.join(PENDING, "fonts")
    shutil.rmtree(out_dir, ignore_errors=True)
    os.makedirs(out_dir)
    rules, seen, n = [], {}, 0
    for sub, body in blocks:
        if sub not in SUBSETS:
            continue
        style = re.search(r"font-style: (\w+)", body).group(1)
        if style != "normal":
            continue
        weight = re.search(r"font-weight: ([\d ]+)", body).group(1).strip()
        url = re.search(r"url\((.*?)\)", body).group(1)
        rng = re.search(r"unicode-range: (.*?);", body)
        if url not in seen:
            n += 1
            seen[url] = f"font-{n}.woff2"
            with open(os.path.join(out_dir, seen[url]), "wb") as f:
                f.write(http_get(url, binary=True, timeout=60))
        rules.append(f"@font-face{{font-family:'Rubik';font-style:normal;font-weight:{weight};font-display:block;src:url({seen[url]}) format('woff2');"
                     + (f"unicode-range:{rng.group(1)};" if rng else "") + "}")
    open(os.path.join(out_dir, "fonts.css"), "w", encoding="utf-8").write(f"/* {family} (alias: Rubik) */\n" + "\n".join(rules) + "\n")
    open(os.path.join(out_dir, "FONT.txt"), "w", encoding="utf-8").write(family + "\n")
    return {"family": family, "weights": used, "files": n}


def system_state():
    home = os.path.expanduser("~")
    wc, u2 = os.path.join(home, ".cache", "whisper"), os.path.join(home, ".u2net")
    return {"styles": {"split": os.path.isdir(os.path.join(SKILL, "kit")),
                       "paper": os.path.isfile(os.path.join(os.path.dirname(SKILL), "paper-reel-style", "kit", "paper-style.js"))},
            "whisper": sorted(os.listdir(wc)) if os.path.isdir(wc) else [],
            "u2net": sorted(os.listdir(u2)) if os.path.isdir(u2) else []}


def save(data):
    brand = data["brand"]
    prof = brand.get("profile", {})
    os.makedirs(BRAND_DIR, exist_ok=True)
    # الصورة: انسخها كما هي
    pend = [f for f in os.listdir(PENDING) if f.startswith("avatar.")] if os.path.isdir(PENDING) else []
    if pend:
        ext = os.path.splitext(pend[0])[1].lower()
        for old in os.listdir(BRAND_DIR):
            if old.startswith("avatar."):
                os.remove(os.path.join(BRAND_DIR, old))
        shutil.copy2(os.path.join(PENDING, pend[0]), os.path.join(BRAND_DIR, "avatar" + ext))
        prof["avatar"] = "avatar" + ext
    elif not prof.get("avatar") or not os.path.exists(os.path.join(BRAND_DIR, prof.get("avatar", ""))):
        prof["avatar"] = None
    prof["showFollowers"] = False
    brand["profile"] = prof
    # الخط
    fdir = os.path.join(PENDING, "fonts")
    if brand.get("font") and brand["font"] != "Rubik":
        if os.path.isdir(fdir) and open(os.path.join(fdir, "FONT.txt"), encoding="utf-8").read().strip() == brand["font"]:
            shutil.rmtree(os.path.join(BRAND_DIR, "fonts"), ignore_errors=True)
            shutil.copytree(fdir, os.path.join(BRAND_DIR, "fonts"))
        elif not os.path.isdir(os.path.join(BRAND_DIR, "fonts")):
            raise ValueError("الخط ما انجهّز. اختاره من جديد وانتظر «✓ جاهز»")
    else:
        shutil.rmtree(os.path.join(BRAND_DIR, "fonts"), ignore_errors=True)
    brand["version"] = 2
    brand["updated"] = time.strftime("%Y-%m-%d")
    jsave(os.path.join(BRAND_DIR, "brand.json"), brand)
    shutil.rmtree(PENDING, ignore_errors=True)
    return os.path.join(BRAND_DIR, "brand.json")


class H(BaseHTTPRequestHandler):
    server_version = "reel-setup"

    def log_message(self, *x):
        pass

    def _ok(self, code=200, body=b"", ctype="application/json; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._ok(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def _auth(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        return (self.headers.get("X-Token") or (q.get("t") or [""])[0]) == TOKEN

    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        if p == "/":
            return self._ok(200, open(PAGE, "rb").read(), "text/html; charset=utf-8")
        if not self._auth():
            return self._json({"error": "unauthorized"}, 403)
        if p == "/api/state":
            brand = jload(os.path.join(BRAND_DIR, "brand.json")) if a.edit or os.path.exists(os.path.join(BRAND_DIR, "brand.json")) else None
            return self._json({"brand": brand, "edit": a.edit, "system": system_state(), "avatar": bool(brand and (brand.get("profile") or {}).get("avatar"))})
        if p == "/api/avatar":
            b = jload(os.path.join(BRAND_DIR, "brand.json")) or {}
            av = (b.get("profile") or {}).get("avatar")
            pend = [f for f in os.listdir(PENDING) if f.startswith("avatar.")] if os.path.isdir(PENDING) else []
            path = os.path.join(PENDING, pend[0]) if pend else (os.path.join(BRAND_DIR, av) if av else None)
            if not path or not os.path.exists(path):
                return self._ok(404)
            ext = os.path.splitext(path)[1].lower().lstrip(".")
            return self._ok(200, open(path, "rb").read(), {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "application/octet-stream"))
        return self._ok(404)

    def do_POST(self):
        if not self._auth():
            return self._json({"error": "unauthorized"}, 403)
        p = urllib.parse.urlparse(self.path).path
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else b""
        try:
            if p == "/api/avatar":
                if len(body) > 15 * 1024 * 1024:
                    return self._json({"error": "الصورة أكبر من 15MB"}, 400)
                ext = os.path.splitext(urllib.parse.unquote(self.headers.get("X-Filename", "a.jpg")))[1].lower()
                if ext not in (".jpg", ".jpeg", ".png", ".webp"):
                    return self._json({"error": "الصيغ المدعومة: jpg · png · webp"}, 400)
                os.makedirs(PENDING, exist_ok=True)
                tmp = os.path.join(PENDING, "_new" + ext)
                open(tmp, "wb").write(body)
                try:
                    from PIL import Image
                    w, h = Image.open(tmp).size
                except Exception:
                    os.remove(tmp)                      # الملف الغلط ما بيمسح الصورة الصحيحة السابقة
                    return self._json({"error": "الملف مو صورة صالحة"}, 400)
                for f in os.listdir(PENDING):
                    if f.startswith("avatar."):
                        os.remove(os.path.join(PENDING, f))
                os.replace(tmp, os.path.join(PENDING, "avatar" + ext))
                return self._json({"ok": True, "w": w, "h": h})
            if p == "/api/font":
                fam = json.loads(body or b"{}").get("family", "").strip()
                if not re.fullmatch(r"[A-Za-z0-9 ]{2,40}", fam):
                    return self._json({"error": "اسم الخط غير صالح"}, 400)
                if fam == "Rubik":
                    return self._json({"ok": True, "family": "Rubik", "bundled": True})
                os.makedirs(PENDING, exist_ok=True)
                return self._json({"ok": True, **prepare_font(fam)})
            if p == "/api/save":
                path = save(json.loads(body))
                RESULT["path"] = path
                self._json({"ok": True, "path": path})
                DONE.set()
                return
        except ValueError as e:
            return self._json({"error": str(e)}, 400)
        except (urllib.error.URLError, ConnectionError, TimeoutError, http.client.HTTPException):
            return self._json({"error": "انقطع الاتصال بتنزيل الخط. اضغط على الخط من جديد"}, 502)
        except Exception as e:
            return self._json({"error": f"{type(e).__name__}: {e}"}, 500)
        return self._ok(404)


def main():
    if not os.path.exists(PAGE):
        print("❌ ملف الصفحة ناقص: " + PAGE)
        sys.exit(2)
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), H)
    port = srv.server_address[1]
    url = f"http://127.0.0.1:{port}/?t={TOKEN}"
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print(f"SETUP_URL: {url}", flush=True)
    if not a.no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    print("⏳ بستنى المستخدم يعبّي الصفحة ويضغط «حفظ» (Ctrl+C للإلغاء) …", flush=True)
    ok = DONE.wait(a.timeout * 60)
    time.sleep(0.6)
    srv.shutdown()
    if ok:
        print(f"BRAND_SAVED: {RESULT['path']}", flush=True)
        return 0
    print("⚠️ انتهى الوقت بدون حفظ.", flush=True)
    return 4


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("أُلغي.")
        sys.exit(130)
