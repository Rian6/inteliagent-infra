$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$runner=Join-Path $PSScriptRoot 'run-version-service.ps1'
$arguments='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$runner+'"'
$powershellPath=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$taskName='Inteliagent-Version-Service'
try {
  $existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existing -and ($existing.Actions.Arguments -notcontains $arguments)) { throw 'Já existe uma tarefa de outro projeto com este nome.' }
  $action=New-ScheduledTaskAction -Execute $powershellPath -Argument $arguments -WorkingDirectory $taskRoot
  $trigger=New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
  $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  Write-Output 'Serviço de versões registrado no Agendador e iniciado.'
} catch {
  if ($_.Exception.Message -eq 'Já existe uma tarefa de outro projeto com este nome.') { throw }
  # A current-user startup shortcut needs no administrator credentials.
  $startup=[Environment]::GetFolderPath('Startup')
  $shortcutPath=Join-Path $startup 'Inteliagent-Version-Service.lnk'
  $shell=New-Object -ComObject WScript.Shell
  $shortcut=$shell.CreateShortcut($shortcutPath)
  if ((Test-Path $shortcutPath) -and $shortcut.Arguments -ne $arguments) { throw 'Atalho de inicialização pertence a outro projeto.' }
  $shortcut.TargetPath=$powershellPath;$shortcut.Arguments=$arguments;$shortcut.WorkingDirectory=$taskRoot;$shortcut.WindowStyle=7;$shortcut.Save()
  Start-Process $powershellPath -ArgumentList $arguments -WindowStyle Hidden
  Write-Output 'Serviço iniciado; inicialização automática configurada para o usuário atual.'
}
