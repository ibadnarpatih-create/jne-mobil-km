param([switch]$Offline)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.android-tools'
$jdkPath = Get-ChildItem (Join-Path $toolRoot 'ms-jdk') -Directory | Select-Object -First 1
if (!$jdkPath) { throw 'JDK belum tersedia di .android-tools/ms-jdk.' }
$env:JAVA_HOME = $jdkPath.FullName
$env:ANDROID_HOME = Join-Path $toolRoot 'sdk'
$env:ANDROID_USER_HOME = Join-Path $toolRoot 'android-user'
$env:GRADLE_USER_HOME = Join-Path $toolRoot 'gradle-cache'
$androidProject = Join-Path $projectRoot 'android-driver'
$sdkPath = $env:ANDROID_HOME.Replace('\', '/')
[IO.File]::WriteAllText((Join-Path $androidProject 'local.properties'), "sdk.dir=$sdkPath`n")
& (Join-Path $PSScriptRoot 'configure-android.ps1')
$debugKey = Join-Path $toolRoot 'debug.keystore'
if (!(Test-Path -LiteralPath $debugKey)) {
    & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') -genkeypair -keystore $debugKey -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Debug,O=Android,C=US'
    if ($LASTEXITCODE -ne 0) { throw 'Pembuatan signing key debug gagal.' }
}
$gradle = Join-Path $toolRoot 'gradle/gradle-8.11.1/bin/gradle.bat'
$gradleArgs = @('-p', $androidProject, '--no-daemon', '--console=plain', ':app:assembleDebug', ':app:testDebugUnitTest', ':app:lintDebug')
if ($Offline) { $gradleArgs += '--offline' }
& $gradle @gradleArgs
if ($LASTEXITCODE -ne 0) { throw 'Build/pemeriksaan Android gagal.' }
$artifactDirectory = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Force $artifactDirectory | Out-Null
$apk = Join-Path $artifactDirectory 'movetra-driver-0.2.0-integrated.apk'
Copy-Item -LiteralPath (Join-Path $androidProject 'app/build/outputs/apk/debug/app-debug.apk') -Destination $apk -Force
& (Join-Path $env:ANDROID_HOME 'build-tools/35.0.0/apksigner.bat') verify --verbose $apk
if ($LASTEXITCODE -ne 0) { throw 'Verifikasi tanda tangan APK gagal.' }
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLower()
[IO.File]::WriteAllText("$apk.sha256", "$hash  movetra-driver-0.2.0-integrated.apk`n")
Write-Output "APK uji: $apk"
