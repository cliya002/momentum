Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'

  # Rounded-square background with a purple gradient
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.ColorTranslator]::FromHtml('#6366f1'),
    [System.Drawing.ColorTranslator]::FromHtml('#3730a3'),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
  $radius = [int]($size * 0.22)
  $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $path2.AddArc(0, 0, $d, $d, 180, 90)
  $path2.AddArc($size - $d, 0, $d, $d, 270, 90)
  $path2.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
  $path2.AddArc(0, $size - $d, $d, $d, 90, 90)
  $path2.CloseFigure()
  $g.FillPath($grad, $path2)

  # Rising bars (progress / momentum) in white
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $barW = [double]($size * 0.12)
  $gap = [double]($size * 0.06)
  $count = 4
  $totalW = $count * $barW + ($count - 1) * $gap
  $startX = ($size - $totalW) / 2.0
  $baseline = [double]($size * 0.74)
  $heights = @(0.28, 0.40, 0.52, 0.66)
  for ($i = 0; $i -lt $count; $i++) {
    $h = [double]($size * $heights[$i])
    $x = $startX + $i * ($barW + $gap)
    $y = $baseline - $h
    $r = [double]($barW * 0.45)
    $bp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bd = $r * 2
    # rounded-top bar (square bottom sits on baseline)
    $bp.AddArc($x, $y, $bd, $bd, 180, 90)
    $bp.AddArc($x + $barW - $bd, $y, $bd, $bd, 270, 90)
    $bp.AddLine($x + $barW, $y + $r, $x + $barW, $baseline)
    $bp.AddLine($x + $barW, $baseline, $x, $baseline)
    $bp.CloseFigure()
    $g.FillPath($white, $bp)
  }

  # Upward arrow accent over the bars
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(235, 255, 255, 255)), ([single]($size * 0.045))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $p1 = New-Object System.Drawing.PointF ([single]($startX), [single]($baseline - $size * 0.30))
  $p2 = New-Object System.Drawing.PointF ([single]($startX + $totalW * 0.5), [single]($baseline - $size * 0.44))
  $p3 = New-Object System.Drawing.PointF ([single]($startX + $totalW), [single]($baseline - $size * 0.66))
  $g.DrawLines($pen, @($p1, $p2, $p3))
  # arrow head
  $hx = $p3.X; $hy = $p3.Y; $a = [single]($size * 0.07)
  $g.DrawLine($pen, $hx, $hy, $hx - $a, $hy)
  $g.DrawLine($pen, $hx, $hy, $hx, $hy + $a)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "Wrote $path"
}

New-Item -ItemType Directory -Force -Path 'icons' | Out-Null
New-Icon 192 (Join-Path 'icons' 'icon-192.png')
New-Icon 512 (Join-Path 'icons' 'icon-512.png')
