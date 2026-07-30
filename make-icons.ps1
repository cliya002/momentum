Add-Type -AssemblyName System.Drawing
$sizes = @(192, 512)
New-Item -ItemType Directory -Force -Path 'icons' | Out-Null
foreach ($size in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#111827'))
  $g.FillRectangle($bg, 0, 0, $size, $size)
  $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#60a5fa'))
  $pad = [int]($size * 0.18)
  $g.FillEllipse($accent, $pad, $pad, $size - 2 * $pad, $size - 2 * $pad)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font('Segoe UI', ($size * 0.36), [System.Drawing.FontStyle]::Bold)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'
  $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $g.DrawString('H', $font, $white, $rect, $sf)
  $out = Join-Path 'icons' ("icon-{0}.png" -f $size)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "Wrote $out"
}
