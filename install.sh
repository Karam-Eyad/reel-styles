#!/usr/bin/env bash
# install.sh — تثبيت reel-styles (split-reel-style + paper-reel-style) كسكيلات Claude Code (ماك / لينكس / Git Bash)
#
#   ./install.sh                     آخر إصدار
#   ./install.sh -v v1.0.0           إصدار معيّن
#   ./install.sh -l                  قائمة كل الإصدارات
#   ./install.sh -i                  + يثبّت مكتبات بايثون و npm الناقصة
#   ./install.sh -d ~/my/skills      مجلد السكيلات (الافتراضي ~/.claude/skills)
#   ./install.sh -s /path/to/repo    من نسخة محلية بدل GitHub
#
# بدون تنزيل الملف:  curl -fsSL https://raw.githubusercontent.com/Karam-Eyad/reel-styles/main/install.sh | bash -s -- -v v1.0.0
set -euo pipefail
REPO="Karam-Eyad/reel-styles"
VERSION="latest"; LIST=0; DEPS=0; DIR="$HOME/.claude/skills"; SRC=""
while getopts "v:lid:s:" o; do case $o in v) VERSION="$OPTARG";; l) LIST=1;; i) DEPS=1;; d) DIR="$OPTARG";; s) SRC="$OPTARG";; *) exit 1;; esac; done

releases() { curl -fsSL -H "User-Agent: reel-styles-installer" "https://api.github.com/repos/$REPO/releases" 2>/dev/null || echo "[]"; }
tags() { releases | python3 -c "import sys,json
for r in json.load(sys.stdin): print(r['tag_name'], r['published_at'][:10], r.get('name') or '')" 2>/dev/null || true; }

if [ "$LIST" = 1 ]; then
  T="$(tags)"; if [ -z "$T" ]; then echo "ما في إصدارات منشورة بعد. نزّل آخر نسخة: ./install.sh"; else echo "الإصدارات المتوفرة:"; echo "$T"; echo; echo "لتثبيت إصدار:  ./install.sh -v <الرقم>"; fi; exit 0
fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if [ -n "$SRC" ]; then ROOT="$(cd "$SRC" && pwd)"; echo "من نسخة محلية: $ROOT"
else
  TAG="$VERSION"
  if [ "$VERSION" = "latest" ]; then TAG="$(tags | head -1 | cut -d' ' -f1)"; [ -z "$TAG" ] && TAG="main"; fi
  if [ "$TAG" = "main" ]; then URL="https://github.com/$REPO/archive/refs/heads/main.zip"; else URL="https://github.com/$REPO/archive/refs/tags/$TAG.zip"; fi
  echo "⏳ تنزيل $TAG ..."
  curl -fsSL -o "$TMP/r.zip" "$URL"
  (cd "$TMP" && unzip -q r.zip)
  ROOT="$(find "$TMP" -maxdepth 1 -type d -name 'reel-styles*' | head -1)"
fi
VER="$(head -1 "$ROOT/VERSION" 2>/dev/null || echo unknown)"
mkdir -p "$DIR"; STAMP="$(date +%Y%m%d-%H%M%S)"
for S in split-reel-style paper-reel-style; do
  [ -d "$ROOT/$S" ] || { echo "ناقص $S بالإصدار هاد"; exit 1; }
  DST="$DIR/$S"; KEEP=""
  if [ -d "$DST" ]; then
    OLD="$(head -1 "$DST/.version" 2>/dev/null || echo old)"; BAK="$DIR/_backup/$S-$OLD-$STAMP"; mkdir -p "$(dirname "$BAK")"
    [ -d "$DST/node_modules" ] && { KEEP="$TMP/nm_$S"; mv "$DST/node_modules" "$KEEP"; }
    mv "$DST" "$BAK"; echo "  نسخة احتياطية من القديم: $BAK"
  fi
  cp -R "$ROOT/$S" "$DST"; [ -n "$KEEP" ] && mv "$KEEP" "$DST/node_modules"
  echo "$VER" > "$DST/.version"; echo "✅ $S  ($VER)"
done
PY="$(command -v python3 || command -v python || true)"
if [ -n "$PY" ]; then
  echo; echo "فحص المتطلبات:"
  if [ "$DEPS" = 1 ]; then "$PY" "$DIR/split-reel-style/scripts/setup_check.py" --install || true; else "$PY" "$DIR/split-reel-style/scripts/setup_check.py" || true; fi
else echo "⚠️ Python مو منصّب. ثبّته (3.9+) وبعدها شغّل setup_check.py --install"; fi
echo; echo "جاهز. افتح Claude Code وقله:  منتجلي هالفيديو بستايل السبليت   (أو: بستايل الورق)"
