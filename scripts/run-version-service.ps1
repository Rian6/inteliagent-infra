$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$nodePath=Join-Path $taskRoot '.tools/node-v26.13.0-win-x64/node.exe'
$servicePath=Join-Path $taskRoot 'services/version-service.mjs'
$statePath=Join-Path $taskRoot '.local/version-service-process.json'
while ($true) {
  try {
    $health=Invoke-RestMethod 'http://127.0.0.1:5174/health' -TimeoutSec 2
    if ($health.service -eq 'inteliagent-version-service') { Start-Sleep -Seconds 10; continue }
    throw 'A porta 5174 está ocupada por outro serviço.'
  } catch {
    if ($_.Exception.Message -eq 'A porta 5174 está ocupada por outro serviço.') { throw }
  }
  $child=Start-Process -FilePath $nodePath -ArgumentList ('"'+$servicePath+'"') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskRoot '.local/version-service.log') -RedirectStandardError (Join-Path $taskRoot '.local/version-service-error.log')
  [IO.File]::WriteAllText($statePath,(@{pid=$child.Id;supervisor=$PID;service='inteliagent-version-service'}|ConvertTo-Json))
  $child.WaitForExit()
  Start-Sleep -Seconds 5
}
