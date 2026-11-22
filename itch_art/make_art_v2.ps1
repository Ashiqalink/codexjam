Add-Type -AssemblyName System.Drawing
$root = 'D:\codexjam'
$out = "$root\itch_art\v2"
New-Item -ItemType Directory -Force $out | Out-Null
$src = [System.Drawing.Bitmap]::FromFile("$root\docs\img\i_wide.png")

# Game palette
function C($hex, $a = 255) {
  $r = [Convert]::ToInt32($hex.Substring(1, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(3, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(5, 2), 16)
  [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}
function Br($hex, $a = 255) { New-Object System.Drawing.SolidBrush((C $hex $a)) }
$SEA = '#0e90a5'; $SHALLOW = '#52b6b3'; $SAND = '#e8b96f'; $GRASS = '#8bbf4c'; $TREE = '#246828'
$INK = '#2a1a12'; $PAPER = '#fff4d6'; $RED = '#d9412b'; $YELLOW = '#ffd23f'

function New-Art($w, $h) {
  $b = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAlias'
  return @{ b = $b; g = $g }
}

function Draw-Cover($g, $w, $h, $cx, $cy, $cw, $ch) {
  $sx = [double]$w / [double]$cw; $sy = [double]$h / [double]$ch
  if ($sx -gt $sy) { $s = $sx } else { $s = $sy }
  $dw = $cw * $s; $dh = $ch * $s
  $dest = [System.Drawing.RectangleF]::new(($w - $dw) / 2, ($h - $dh) / 2, $dw, $dh)
  $from = [System.Drawing.RectangleF]::new($cx, $cy, $cw, $ch)
  $g.DrawImage($src, $dest, $from, [System.Drawing.GraphicsUnit]::Pixel)
}

function Round-Path($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Centered text at (cx, cy) in the current transform
function Text-C($g, $text, $font, $brush, $cx, $cy) {
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $g.DrawString($text, $font, $brush, [System.Drawing.PointF]::new($cx, $cy), $sf)
}

function Imp($size) { New-Object System.Drawing.Font('Impact', $size, [System.Drawing.FontStyle]::Italic, [System.Drawing.GraphicsUnit]::Pixel) }
function Blk($size) { New-Object System.Drawing.Font('Arial Black', $size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel) }

# Paper sticker: Sticker-Begin draws the card and moves the origin to its center; draw content; then $g.Restore($state)
function Sticker-Begin($g, $cx, $cy, $w, $h, $angle, $fill) {
  $st = $g.Save()
  $g.TranslateTransform($cx, $cy)
  $g.RotateTransform($angle)
  $sh = Round-Path (-$w / 2 + 7) (-$h / 2 + 9) $w $h 14
  $g.FillPath((Br $INK 110), $sh)
  $p = Round-Path (-$w / 2) (-$h / 2) $w $h 14
  $g.FillPath((Br $fill), $p)
  $pen = New-Object System.Drawing.Pen((C $INK), 5)
  $pen.LineJoin = 'Round'
  $g.DrawPath($pen, $p)
  return $st
}
# Title text with hard ink drop shadow
function Title-Text($g, $text, $size, $cx, $cy, $fillHex) {
  $f = Imp $size
  $d = [Math]::Max(3, [int]($size / 16))
  Text-C $g $text $f (Br $INK) ($cx + $d) ($cy + $d)
  Text-C $g $text $f (Br $fillHex) $cx $cy
}

# ---------------- Banner 1600x400 ----------------
$a = New-Art 1600 400
Draw-Cover $a.g 1600 400 0 250 1600 400
$st = Sticker-Begin $a.g 500 200 900 230 -1.5 $PAPER
Title-Text $a.g "COUP D'ETAT, BABY!" 96 0 -28 $RED
Text-C $a.g "Shipwrecked. Broke. Running for president." (Blk 26) (Br $INK) 0 58
$a.g.Restore($st)
$a.b.Save("$out\banner_1600x400.png")

# ---------------- Page background 1920x1080 ----------------
$a = New-Art 1920 1080
$a.g.Clear((C $SEA))
$centers = @(@(380, 300, 0), @(1500, 820, 2))
$ringCols = @('#1aa3b8', '#0e90a5')
foreach ($c in $centers) {
  for ($i = 11; $i -ge 0; $i--) {
    $pts = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
    for ($k = 0; $k -lt 72; $k++) {
      $t2 = $k * 2 * [Math]::PI / 72
      $r = 140 + $i * 120 + 22 * [Math]::Sin(3 * $t2 + $c[2] + $i * 0.4) + 12 * [Math]::Sin(5 * $t2 + $i)
      $pts.Add([System.Drawing.PointF]::new($c[0] + $r * 1.25 * [Math]::Cos($t2), $c[1] + $r * [Math]::Sin($t2)))
    }
    $a.g.FillClosedCurve((Br $ringCols[$i % 2]), $pts.ToArray())
  }
}
$a.b.Save("$out\background_1920x1080.png")

# ---------------- Embed background 1280x720 ----------------
$a = New-Art 1280 720
Draw-Cover $a.g 1280 720 0 100 1600 700
$st = Sticker-Begin $a.g 640 92 760 112 -1.5 $PAPER
Title-Text $a.g "COUP D'ETAT, BABY!" 84 0 0 $RED
$a.g.Restore($st)
$st = Sticker-Begin $a.g 640 640 760 60 1 $YELLOW
Text-C $a.g "Shipwrecked. Broke. Running for president." (Blk 24) (Br $INK) 0 0
$a.g.Restore($st)
$a.b.Save("$out\embed_bg_1280x720.png")

# ---------------- Cover 630x500 ----------------
$a = New-Art 630 500
Draw-Cover $a.g 630 500 300 100 900 700
$st = Sticker-Begin $a.g 315 410 540 150 -2 $PAPER
$f70 = Imp 70
Text-C $a.g "COUP D'ETAT," $f70 (Br $INK) 4 (-32)
Text-C $a.g "COUP D'ETAT," $f70 (Br $RED) 0 (-36)
Text-C $a.g "BABY!" $f70 (Br $INK) 4 38
Text-C $a.g "BABY!" $f70 (Br $RED) 0 34
$a.g.Restore($st)
$a.b.Save("$out\cover_630x500.png")

