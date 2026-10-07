# release.ps1 — ينشر إصدار جديد: بيحدّث VERSION، وبيعمل commit + tag + push، وبيرفع zip كـ GitHub Release.
#   .\tools\release.ps1 -Version 1.1.0 -Notes "كابشن أسرع، انتقال جديد"
# قبلها: اكتب التغييرات بـ CHANGELOG.md (قسم الإصدار الجديد فوق)، وتأكد إن كل شي تمام.
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$Notes = ""
)
$ErrorActionPreference = "Stop"
$Version = $Version.TrimStart("v")
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "الرقم لازم يكون بهالشكل: 1.2.3" }
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$tag = "v$Version"
if (git tag -l $tag) { throw "الإصدار $tag موجود من قبل" }
if (-not (Select-String -Path "CHANGELOG.md" -Pattern "^## \[?v?$([regex]::Escape($Version))" -Quiet)) { throw "اكتب قسم $Version بـ CHANGELOG.md أول" }

Set-Content -Path VERSION -Value $Version -Encoding ascii
git add -A
git commit -m "Release $tag"
git tag -a $tag -m "reel-styles $tag"
git push origin HEAD
git push origin $tag

$dist = Join-Path $root "dist"; New-Item -ItemType Directory -Force -Path $dist | Out-Null
$stage = Join-Path $dist "reel-styles-$Version"; if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($i in @("split-reel-style", "paper-reel-style", "examples", "docs", "install.ps1", "install.sh", "README.md", "CHANGELOG.md", "LICENSE", "THIRD_PARTY.md", "VERSION")) {
  Copy-Item (Join-Path $root $i) $stage -Recurse -Force
}
Get-ChildItem $stage -Recurse -Directory -Filter node_modules | Remove-Item -Recurse -Force
$zip = Join-Path $dist "reel-styles-$tag.zip"; if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path $stage -DestinationPath $zip
$body = if ($Notes) { $Notes } else { "شوف CHANGELOG.md" }
gh release create $tag $zip --title "reel-styles $tag" --notes $body
Write-Host "✅ تم نشر $tag" -ForegroundColor Green
