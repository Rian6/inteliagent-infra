$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$nodeRuntime = Join-Path $workspace '.tools/node-v22.23.4-win-x64/node.exe'
$firebaseCli = Join-Path $workspace '.tools/push-cli/node_modules/firebase-tools/lib/bin/firebase.js'
if (!(Test-Path -LiteralPath $nodeRuntime) -or !(Test-Path -LiteralPath $firebaseCli)) {
    throw 'O runtime local e o Firebase CLI precisam estar instalados em .tools.'
}
& $nodeRuntime $firebaseCli @args
exit $LASTEXITCODE
