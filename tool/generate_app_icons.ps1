param(
    [string]$Source = 'assets\images\el7lm-logo.png'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root $Source
$logo = [System.Drawing.Image]::FromFile($sourcePath)

function New-IconBitmap {
    param(
        [int]$Size,
        [double]$LogoRatio = 0.86,
        [bool]$Transparent = $false
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear($(if ($Transparent) { [System.Drawing.Color]::Transparent } else { [System.Drawing.Color]::White }))

    $logoSize = [int][Math]::Round($Size * $LogoRatio)
    $offset = [int](($Size - $logoSize) / 2)
    $graphics.DrawImage($logo, $offset, $offset, $logoSize, $logoSize)
    $graphics.Dispose()
    return $bitmap
}

function Save-Icon {
    param(
        [string]$Path,
        [int]$Size,
        [double]$LogoRatio = 0.86,
        [bool]$Transparent = $false
    )

    $directory = Split-Path -Parent $Path
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    $bitmap = New-IconBitmap -Size $Size -LogoRatio $LogoRatio -Transparent $Transparent
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}

$masterPath = Join-Path $root 'assets\images\el7lm-app-icon.png'
Save-Icon -Path $masterPath -Size 1024

$androidLegacy = @{
    'mipmap-mdpi' = 48
    'mipmap-hdpi' = 72
    'mipmap-xhdpi' = 96
    'mipmap-xxhdpi' = 144
    'mipmap-xxxhdpi' = 192
}
foreach ($entry in $androidLegacy.GetEnumerator()) {
    Save-Icon -Path (Join-Path $root "android\app\src\main\res\$($entry.Key)\ic_launcher.png") -Size $entry.Value
}

$androidAdaptive = @{
    'drawable-mdpi' = 108
    'drawable-hdpi' = 162
    'drawable-xhdpi' = 216
    'drawable-xxhdpi' = 324
    'drawable-xxxhdpi' = 432
}
foreach ($entry in $androidAdaptive.GetEnumerator()) {
    Save-Icon `
        -Path (Join-Path $root "android\app\src\main\res\$($entry.Key)\ic_launcher_foreground.png") `
        -Size $entry.Value `
        -LogoRatio 0.78 `
        -Transparent $true
}

$iosRoot = Join-Path $root 'ios\Runner\Assets.xcassets\AppIcon.appiconset'
$iosIcons = @{
    'Icon-App-20x20@1x.png' = 20
    'Icon-App-20x20@2x.png' = 40
    'Icon-App-20x20@3x.png' = 60
    'Icon-App-29x29@1x.png' = 29
    'Icon-App-29x29@2x.png' = 58
    'Icon-App-29x29@3x.png' = 87
    'Icon-App-40x40@1x.png' = 40
    'Icon-App-40x40@2x.png' = 80
    'Icon-App-40x40@3x.png' = 120
    'Icon-App-60x60@2x.png' = 120
    'Icon-App-60x60@3x.png' = 180
    'Icon-App-76x76@1x.png' = 76
    'Icon-App-76x76@2x.png' = 152
    'Icon-App-83.5x83.5@2x.png' = 167
    'Icon-App-1024x1024@1x.png' = 1024
}
foreach ($entry in $iosIcons.GetEnumerator()) {
    Save-Icon -Path (Join-Path $iosRoot $entry.Key) -Size $entry.Value
}

$logo.Dispose()
Write-Output "Generated Android and iOS icons from $sourcePath"
