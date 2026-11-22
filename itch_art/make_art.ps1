Add-Type -AssemblyName System.Drawing
$root = 'D:\codexjam'
$src = [System.Drawing.Bitmap]::FromFile("$root\docs\img\i_wide.png")

function C($a, $r, $g, $b) { [System.Drawing.Color]::FromArgb($a, $r, $g, $b) }

function Draw-Cover($g, $w, $h, $cx, $cy, $cw, $ch) {
  $sx = [double]$w / [double]$cw; $sy = [double]$h / [double]$ch; if ($sx -gt $sy) { $s = $sx } else { $s = $sy }
  $dw = $cw * $s; $dh = $ch * $s
  $dest = [System.Drawing.RectangleF]::new(($w - $dw) / 2, ($h - $dh) / 2, $dw, $dh)
  $from = [System.Drawing.RectangleF]::new($cx, $cy, $cw, $ch)
  $g.DrawImage($src, $dest, $from, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-Text($g, $text, $size, $cx, $cy, $w) {
  $f = New-Object System.Drawing.Font('Impact', $size, [System.Drawing.FontStyle]::Italic, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $ink = New-Object System.Drawing.SolidBrush((C 255 42 26 18))
  $yel = New-Object System.Drawing.SolidBrush((C 255 255 210 63))
  $d = [Math]::Max(3, [int]($size / 18))
  foreach ($o in 1..$d) {
    $g.DrawString($text, $f, $ink, ([System.Drawing.RectangleF]::new(($cx - $w / 2 + $o), ($cy - $size + $o), $w, ($size * 2))), $sf)
  }
  $g.DrawString($text, $f, $yel, ([System.Drawing.RectangleF]::new(($cx - $w / 2), ($cy - $size), $w, ($size * 2))), $sf)
}

function New-Art($w, $h) {
  $b = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAlias'
  return @{ b = $b; g = $g }
}

# Banner 1600x400
$a = New-Art 1600 400
Draw-Cover $a.g 1600 400 0 250 1600 350
$rect = New-Object System.Drawing.Rectangle(0, 0, 1600, 400)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, (C 40 20 22 31), (C 210 20 22 31), 90)
$a.g.FillRectangle($grad, $rect)
$a.g.FillRectangle((New-Object System.Drawing.SolidBrush((C 255 230 57 70))), 0, 392, 1600, 8)
Draw-Text $a.g "COUP D'ETAT, BABY!" 140 800 190 1600
$a.b.Save("$root\itch_art\banner_1600x400.png")

# Background 1920x1080
$a = New-Art 1920 1080
Draw-Cover $a.g 1920 1080 0 100 1600 700
$a.g.FillRectangle((New-Object System.Drawing.SolidBrush((C 220 20 22 31))), 0, 0, 1920, 1080)
$a.b.Save("$root\itch_art\background_1920x1080.png")

# Cover 630x500
$a = New-Art 630 500
Draw-Cover $a.g 630 500 300 100 900 700
$rect = New-Object System.Drawing.Rectangle(0, 220, 630, 280)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, (C 0 20 22 31), (C 235 20 22 31), 90)
$a.g.FillRectangle($grad, $rect)
Draw-Text $a.g "COUP D'ETAT," 78 315 385 630
Draw-Text $a.g "BABY!" 78 315 450 630
$a.b.Save("$root\itch_art\cover_630x500.png")



# Embed background 1280x720 (matches the 16:9 viewport)
$a = New-Art 1280 720
Draw-Cover $a.g 1280 720 0 100 1600 700
$rect = New-Object System.Drawing.Rectangle(0, 0, 1280, 720)
$a.g.FillRectangle((New-Object System.Drawing.SolidBrush((C 150 20 22 31))), $rect)
Draw-Text $a.g "COUP D'ETAT, BABY!" 120 640 300 1280
$f = New-Object System.Drawing.Font('Arial Black', 26, [System.Drawing.FontStyle]::Italic, [System.Drawing.GraphicsUnit]::Pixel)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
$a.g.DrawString('Shipwrecked. Broke. Running for president.', $f, (New-Object System.Drawing.SolidBrush((C 255 255 244 214))), [System.Drawing.RectangleF]::new(0, 400, 1280, 50), $sf)
$a.b.Save("$root\itch_art\embed_bg_1280x720.png")
