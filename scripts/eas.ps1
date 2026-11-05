$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$nodeRuntime = Join-Path $workspace '.tools/node-v22.23.4-win-x64/node.exe'
$easCli = Join-Path $workspace '.tools/push-cli/node_modules/eas-cli/bin/run'
if (!(Test-Path -LiteralPath $nodeRuntime) -or !(Test-Path -LiteralPath $easCli)) {
    throw 'O runtime local e o EAS CLI precisam estar instalados em .tools.'
}
Push-Location (Join-Path $workspace 'inteliagent-app')
try {
    & $nodeRuntime $easCli @args
    $result = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $result
