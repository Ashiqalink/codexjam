Add-Type -AssemblyName System.Drawing
$root = 'D:\codexjam'
$out = "$root\itch_art\v3"
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

$TRUNK = '#8b5a2b'; $LEAF2 = '#3f9e4f'

function Palm($g, $x, $y, $h, $lean) {
  $pen = New-Object System.Drawing.Pen((C $TRUNK), [float]($h * 0.07))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $pts = @([System.Drawing.PointF]::new($x, $y), [System.Drawing.PointF]::new($x + $lean * 0.3, $y - $h * 0.5), [System.Drawing.PointF]::new($x + $lean, $y - $h))
  $g.DrawCurve($pen, $pts)
  $cx = $x + $lean; $cy = $y - $h; $L = $h * 0.6
  $angles = @(-172, -135, -95, -55, -12, 28, 152)
  $i = 0
  foreach ($deg in $angles) {
    $r = $deg * [Math]::PI / 180
    $dx = [Math]::Cos($r); $dy = [Math]::Sin($r)
    $tip = [System.Drawing.PointF]::new($cx + $L * $dx, $cy + $L * $dy + $L * 0.18)
    $mx = $cx + 0.5 * $L * $dx; $my = $cy + 0.5 * $L * $dy - $L * 0.12
    $w = $L * 0.16
    $leaf = @([System.Drawing.PointF]::new($cx, $cy), [System.Drawing.PointF]::new($mx - $dy * $w, $my + $dx * $w), $tip, [System.Drawing.PointF]::new($mx + $dy * $w, $my - $dx * $w))
    if ($i % 2 -eq 0) { $col = $TREE } else { $col = $LEAF2 }
    $g.FillClosedCurve((Br $col), $leaf)
    $i++
  }
  $g.FillEllipse((Br $INK), $cx - $h * 0.03, $cy + $h * 0.01, $h * 0.07, $h * 0.07)
}

function Wave($g, $y, $amp, $wl, $phase, $hex, $w, $h) {
  $pts = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
  for ($x = 0; $x -le $w + 20; $x += 20) {
    $pts.Add([System.Drawing.PointF]::new($x, $y + $amp * [Math]::Sin($x / $wl * 2 * [Math]::PI + $phase)))
  }
  $pts.Add([System.Drawing.PointF]::new($w + 20, $h)); $pts.Add([System.Drawing.PointF]::new(0, $h))
  $g.FillPolygon((Br $hex), $pts.ToArray())
}

function Sun($g, $x, $y, $r) {
  $g.FillEllipse((Br $YELLOW 50), $x - $r * 1.7, $y - $r * 1.7, $r * 3.4, $r * 3.4)
  $g.FillEllipse((Br $YELLOW 90), $x - $r * 1.3, $y - $r * 1.3, $r * 2.6, $r * 2.6)
  $g.FillEllipse((Br $YELLOW), $x - $r, $y - $r, $r * 2, $r * 2)
}

# ---------------- Banner 1600x400 ----------------
$a = New-Art 1600 400
$a.g.Clear((C $SEA))
Wave $a.g 120 6 400 0 '#1196ab' 1600 400
Sun $a.g 1330 105 55
Wave $a.g 270 8 300 1 $SHALLOW 1600 400
Wave $a.g 330 6 260 2 $SAND 1600 400
Palm $a.g 130 345 230 40
Palm $a.g 270 355 160 -25
Palm $a.g 1470 350 220 -40
Palm $a.g 1340 360 150 25
$st = Sticker-Begin $a.g 800 175 860 215 -1.2 $PAPER
Title-Text $a.g "COUP D'ETAT, BABY!" 92 0 -26 $RED
Text-C $a.g "Shipwrecked. Broke. Running for president." (Blk 26) (Br $INK) 0 52
$a.g.Restore($st)
$a.b.Save("$out\banner_1600x400.png")

# ---------------- Page background 1920x1080 ----------------
$a = New-Art 1920 1080
$a.g.Clear((C $SEA))
$centers = @(@(380, 280, 0), @(1550, 620, 2))
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
Wave $a.g 930 10 500 0 $SHALLOW 1920 1080
Wave $a.g 990 8 420 1 $SAND 1920 1080
$xs = @(90, 260, 470, 700, 1010, 1260, 1500, 1700, 1850)
$hs = @(250, 170, 210, 150, 230, 170, 260, 180, 220)
$ls = @(40, -30, 25, -35, 30, -25, -40, 30, -20)
for ($i = 0; $i -lt $xs.Count; $i++) { Palm $a.g $xs[$i] (1010 + ($i % 3) * 8) $hs[$i] $ls[$i] }
$a.b.Save("$out\background_1920x1080.png")

# ---------------- Embed background 1280x720 ----------------
$a = New-Art 1280 720
$a.g.Clear((C $SEA))
Wave $a.g 250 8 500 0 '#1196ab' 1280 720
Sun $a.g 640 360 95
Wave $a.g 430 10 380 1 $SHALLOW 1280 720
Wave $a.g 520 8 300 2 '#6fc4be' 1280 720
Wave $a.g 580 7 340 0 $SAND 1280 720
Palm $a.g 150 600 260 45
Palm $a.g 290 615 170 -30
Palm $a.g 1130 600 250 -45
Palm $a.g 990 615 175 30
$st = Sticker-Begin $a.g 640 92 760 112 -1.5 $PAPER
Title-Text $a.g "COUP D'ETAT, BABY!" 84 0 0 $RED
$a.g.Restore($st)
$st = Sticker-Begin $a.g 640 650 760 60 1 $YELLOW
Text-C $a.g "Shipwrecked. Broke. Running for president." (Blk 24) (Br $INK) 0 0
$a.g.Restore($st)
$a.b.Save("$out\embed_bg_1280x720.png")
