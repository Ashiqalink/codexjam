# Headless screenshot of the built game. Usage: tools\shot.ps1 -Query "skip&at=market" -Out shots\market.png
param([string]$Query = "skip", [string]$Out = "shots\shot.png", [int]$Wait = 6000)
$root = Split-Path $PSScriptRoot -Parent
$outPath = Join-Path $root $Out
New-Item -ItemType Directory -Force -Path (Split-Path $outPath) | Out-Null
$url = "file:///" + ($root -replace '\\', '/') + "/dist/index.html?" + $Query
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$log = & $chrome --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --allow-file-access-from-files --hide-scrollbars --window-size=1600,900 --enable-logging=stderr --v=0 --virtual-time-budget=$Wait "--screenshot=$outPath" $url 2>&1
$log | Where-Object { "$_" -match 'CONSOLE|Uncaught|Error' -and "$_" -notmatch 'registry_loader|externally_managed|google_apis|gcm|ssl_client|sandbox' } | ForEach-Object { "$_" }
"saved $outPath"
