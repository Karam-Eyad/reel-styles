# install.ps1 — تثبيت reel-styles (split-reel-style + paper-reel-style) كسكيلات Claude Code
#
#   .\install.ps1                      آخر إصدار
#   .\install.ps1 -Version v1.0.0      إصدار معيّن
#   .\install.ps1 -List                قائمة كل الإصدارات
#   .\install.ps1 -Install             + يثبّت مكتبات بايثون و npm الناقصة (الموديلات الكبيرة بتنزل أول استخدام، مش هون)
#   .\install.ps1 -Dir D:\skills       مجلد السكيلات (الافتراضي: ~\.claude\skills)
#   .\install.ps1 -Source C:\repo      من نسخة محلية بدل GitHub
#
# بدون تنزيل الملف:
#   iex "& { $(irm https://raw.githubusercontent.com/Karam-Eyad/reel-styles/main/install.ps1) } -Version v1.0.0"
param(
  [string]$Version = "latest",
  [switch]$List,
  [switch]$Install,
  [string]$Dir = (Join-Path $HOME ".claude\skills"),
  [string]$Source = ""
)
$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$Repo = "Karam-Eyad/reel-styles"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Skills = @("split-reel-style", "paper-reel-style")

function Get-Releases {
  try { return Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases" -Headers @{ "User-Agent" = "reel-styles-installer" } }
  catch { return @() }
}

if ($List) {
  $rel = Get-Releases
  if (-not $rel -or $rel.Count -eq 0) { Write-Host "ما في إصدارات منشورة بعد. بتقدر تنزّل آخر نسخة: .\install.ps1"; exit 0 }
  Write-Host "الإصدارات المتوفرة:" -ForegroundColor Cyan
  foreach ($r in $rel) { "{0,-10} {1}  {2}" -f $r.tag_name, ([datetime]$r.published_at).ToString("yyyy-MM-dd"), $r.name }
  Write-Host "`nلتثبيت إصدار:  .\install.ps1 -Version <الرقم>"
  exit 0
}

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("reel-styles-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
try {
  if ($Source) {
    $root = (Resolve-Path $Source).Path
    Write-Host "من نسخة محلية: $root"
  } else {
    $tag = $Version
    if ($Version -eq "latest") {
      $rel = Get-Releases
      if ($rel -and $rel.Count -gt 0) { $tag = $rel[0].tag_name } else { $tag = "main" }
    }
    $url = if ($tag -eq "main") { "https://github.com/$Repo/archive/refs/heads/main.zip" } else { "https://github.com/$Repo/archive/refs/tags/$tag.zip" }
    Write-Host "⏳ تنزيل $tag ..." -ForegroundColor Cyan
    $zip = Join-Path $tmp "r.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -Headers @{ "User-Agent" = "reel-styles-installer" }
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $root = (Get-ChildItem $tmp -Directory | Where-Object { $_.Name -like "reel-styles*" } | Select-Object -First 1).FullName
    if (-not $root) { throw "الأرشيف مو متوقّع الشكل" }
  }
  $ver = (Get-Content (Join-Path $root "VERSION") -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $ver) { $ver = "unknown" }

  New-Item -ItemType Directory -Force -Path $Dir | Out-Null
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  foreach ($s in $Skills) {
    $src = Join-Path $root $s
    if (-not (Test-Path $src)) { throw "ناقص $s بالإصدار هاد" }
    $dst = Join-Path $Dir $s
    $keepNode = $null
    if (Test-Path $dst) {
      $old = (Get-Content (Join-Path $dst ".version") -ErrorAction SilentlyContinue | Select-Object -First 1)
      if (-not $old) { $old = "old" }
      $bak = Join-Path $Dir "_backup\$s-$old-$stamp"
      New-Item -ItemType Directory -Force -Path (Split-Path $bak) | Out-Null
      if (Test-Path (Join-Path $dst "node_modules")) { $keepNode = Join-Path $tmp "node_modules_$s"; Move-Item (Join-Path $dst "node_modules") $keepNode }
      Move-Item $dst $bak
      Write-Host "  نسخة احتياطية من القديم: $bak"
    }
    Copy-Item $src $dst -Recurse -Force
    if ($keepNode -and (Test-Path $keepNode)) { Move-Item $keepNode (Join-Path $dst "node_modules") }
    Set-Content -Path (Join-Path $dst ".version") -Value $ver -Encoding ascii
    Write-Host "✅ $s  ($ver)" -ForegroundColor Green
  }

  $check = Join-Path $Dir "split-reel-style\scripts\setup_check.py"
  $py = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } elseif (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" } else { $null }
  if ($py) {
    Write-Host "`nفحص المتطلبات:" -ForegroundColor Cyan
    if ($Install) { & $py $check --install } else { & $py $check }
  } else {
    Write-Host "⚠️ Python مو منصّب. ثبّته (3.9+) وبعدها شغّل: python `"$check`" --install" -ForegroundColor Yellow
  }
  Write-Host "`nجاهز. افتح Claude Code وقله:  منتجلي هالفيديو بستايل السبليت   (أو: بستايل الورق)" -ForegroundColor Cyan
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
