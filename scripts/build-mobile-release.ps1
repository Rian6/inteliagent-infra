param([string]$Version, [string]$Notes = '', [string]$ServerUrl = 'http://192.168.1.81:5173', [string]$VersionServiceUrl = 'http://192.168.1.81:5174')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path $taskRoot '.tools/node-v26.13.0-win-x64/node.exe'
$appRoot = Join-Path $taskRoot 'inteliagent-app'
$serverAddress = [Uri]$ServerUrl
if (-not $serverAddress.IsAbsoluteUri -or $serverAddress.Scheme -notin @('http','https') -or $serverAddress.UserInfo -or $serverAddress.AbsolutePath -ne '/') { throw 'Informe a origem HTTP/HTTPS do servidor, sem caminho ou credenciais.' }
$ServerUrl = $ServerUrl.TrimEnd('/')
if ($Version) { & $nodePath (Join-Path $PSScriptRoot 'prepare-mobile-version.mjs') $Version }
else { & $nodePath (Join-Path $PSScriptRoot 'prepare-mobile-version.mjs') }
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar a versão.' }
$environmentNames = @('JAVA_HOME','ANDROID_HOME','PATH','NODE_ENV','REQUIRE_PUSH_CONFIG','EXPO_PUBLIC_AUTH_URL','EXPO_PUBLIC_MAIN_URL','EXPO_PUBLIC_LOAD_URL','EXPO_PUBLIC_CHAT_URL','EXPO_PUBLIC_APP_RELEASE_URL')
$previousEnvironment = @{}
foreach ($environmentName in $environmentNames) { $previousEnvironment[$environmentName] = [Environment]::GetEnvironmentVariable($environmentName, 'Process') }
try {
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$env:PATH = (Split-Path $nodePath) + ';' + $env:JAVA_HOME + '\bin;' + $env:PATH
$env:NODE_ENV = 'production'
$env:REQUIRE_PUSH_CONFIG = '1'
$env:EXPO_PUBLIC_AUTH_URL = $ServerUrl
$env:EXPO_PUBLIC_MAIN_URL = $ServerUrl
$env:EXPO_PUBLIC_LOAD_URL = $ServerUrl
$env:EXPO_PUBLIC_CHAT_URL = $ServerUrl
$env:EXPO_PUBLIC_APP_RELEASE_URL = $VersionServiceUrl.TrimEnd('/') + '/mobile/releases/latest.json'
Push-Location -LiteralPath $appRoot
try {
  & $nodePath scripts/check-push-config.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Configuração de push incompleta.' }
  Push-Location android
  try {
    $nativeErrorPreference = $ErrorActionPreference
    try {
      # Windows PowerShell treats compiler warnings on stderr as errors.
      # Gradle's exit code is authoritative for build success.
      $ErrorActionPreference = 'Continue'
      & .\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' --max-workers=2
      $buildExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $nativeErrorPreference }
    if ($buildExitCode -ne 0) { throw 'Falha ao compilar o APK.' }
  } finally { Pop-Location }
} finally { Pop-Location }
& $nodePath (Join-Path $taskRoot 'scripts/publish-mobile-release.mjs') --apk (Join-Path $appRoot 'android/app/build/outputs/apk/release/app-release.apk') --notes $Notes
if ($LASTEXITCODE -ne 0) { throw 'Falha ao publicar o APK.' }
Write-Output "Download: $ServerUrl/mobile/releases/latest.apk"
} finally {
  foreach ($environmentName in $environmentNames) { [Environment]::SetEnvironmentVariable($environmentName, $previousEnvironment[$environmentName], 'Process') }
}
