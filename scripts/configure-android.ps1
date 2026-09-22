$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env.local'
$values = @{}
foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$') {
        $values[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
    }
}
$backendUrl = $values['NEXT_PUBLIC_SUPABASE_URL']
$publicKey = $values['NEXT_PUBLIC_SUPABASE_ANON_KEY']
if ($backendUrl -notmatch '^https://[a-z0-9-]+\.supabase\.co/?$' -or !$publicKey) { throw 'Konfigurasi publik Supabase tidak lengkap.' }
if ($publicKey.StartsWith('sb_secret_')) { throw 'Secret key tidak boleh masuk APK.' }
if ($publicKey.StartsWith('eyJ')) {
    $payload = $publicKey.Split('.')[1].Replace('-', '+').Replace('_', '/')
    $payload = $payload.PadRight([int]([Math]::Ceiling($payload.Length / 4.0) * 4), '=')
    $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
    if ($claims.role -ne 'anon') { throw 'APK hanya menerima anon/publishable key, bukan service role.' }
} elseif (!$publicKey.StartsWith('sb_publishable_')) { throw 'Jenis public key tidak dikenali.' }
$content = "url=$($backendUrl.TrimEnd('/'))`nanonKey=$publicKey`n"
[IO.File]::WriteAllText((Join-Path $projectRoot 'android-driver/supabase.properties'), $content)
Write-Output 'Konfigurasi publik Android tersimpan. Tidak ada secret server yang disalin.'
