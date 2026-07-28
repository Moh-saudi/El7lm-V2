param(
    [string]$ApiBaseUrl = 'http://127.0.0.1:3001',
    [int]$WebPort = 5217
)

$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$platformRoot = Split-Path -Parent $mobileRoot
$environmentFile = Join-Path $platformRoot '.env.local'
$flutter = 'C:\src\flutter\bin\flutter.bat'

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "Missing platform environment file: $environmentFile"
}

$environment = @{}
foreach ($line in Get-Content -LiteralPath $environmentFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
        continue
    }

    $parts = $trimmed.Split('=', 2)
    if ($parts.Count -ne 2) {
        continue
    }

    $value = $parts[1].Trim()
    if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    $environment[$parts[0].Trim()] = $value
}

$supabaseUrl = $environment['NEXT_PUBLIC_SUPABASE_URL']
$supabasePublishableKey = $environment['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (-not $supabaseUrl -or -not $supabasePublishableKey) {
    throw 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.'
}

& $flutter run `
    -d web-server `
    --web-hostname 127.0.0.1 `
    --web-port $WebPort `
    "--dart-define=API_BASE_URL=$ApiBaseUrl" `
    '--dart-define=WEB_BASE_URL=https://www.el7lm.com' `
    "--dart-define=SUPABASE_URL=$supabaseUrl" `
    "--dart-define=SUPABASE_PUBLISHABLE_KEY=$supabasePublishableKey"
