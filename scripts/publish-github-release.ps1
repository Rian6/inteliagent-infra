param([switch]$Publish)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$manifestPath=Join-Path $taskRoot '.local/mobile-releases/latest.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$filename=Split-Path -Leaf $manifest.downloadUrl
if ($filename -notmatch '^inteliagent-\d+-[a-f0-9]{12}\.apk$') { throw 'Nome de APK inválido.' }
$apkPath=Join-Path $taskRoot ('.local/mobile-releases/'+$filename)
if ((Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.sha256) { throw 'O APK não corresponde ao catálogo validado.' }
$tag='v'+$manifest.version+'+build.'+$manifest.versionCode
$repository='Rian6/inteliagent-app'
$notesPath=Join-Path $taskRoot '.local/github-release-notes.md'
[IO.File]::WriteAllText($notesPath,('Inteliagent '+$manifest.version+' (build '+$manifest.versionCode+")`n`n"+$manifest.notes+"`n"),[Text.UTF8Encoding]::new($false))
$queryPreference=$ErrorActionPreference
try {
  $ErrorActionPreference='Continue'
  $existingJson=& gh release view $tag --repo $repository --json isDraft,assets 2>$null
  $existingExit=$LASTEXITCODE
} finally { $ErrorActionPreference=$queryPreference }
if ($existingExit -eq 0) {
  $existing=$existingJson | ConvertFrom-Json
  $matching=@($existing.assets | Where-Object { $_.name -eq $filename -and $_.size -eq $manifest.size })
  $metadata=@($existing.assets | Where-Object name -eq 'latest.json')
  if ($matching.Count -ne 1 -or $metadata.Count -ne 1) { throw 'Já existe uma release deste build com arquivos diferentes. Aumente o build; nenhum arquivo foi sobrescrito.' }
  if (-not $existing.isDraft) { Write-Output 'Esta release já está publicada no GitHub.'; return }
} else {
  $releaseArguments=@('release','create',$tag,'--repo',$repository,'--target','master','--title',('Inteliagent '+$manifest.version+' (build '+$manifest.versionCode+')'),'--notes-file',$notesPath,'--draft',$apkPath,$manifestPath)
  & gh @releaseArguments
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o rascunho da release no GitHub. Nenhum APK existente foi sobrescrito.' }
}
if ($Publish) {
  & gh release edit $tag --repo $repository --draft=false --latest
  if ($LASTEXITCODE -ne 0) { throw 'O rascunho está pronto, mas a publicação falhou.' }
  try { Invoke-RestMethod 'http://127.0.0.1:5174/internal/refresh' -Method Post -TimeoutSec 15 | Out-Null } catch { Write-Output 'O serviço buscará a release na próxima consulta automática.' }
  Write-Output 'Release publicada; o serviço detectará a atualização automaticamente.'
} else { Write-Output 'Release em rascunho no GitHub, com APK e latest.json. Publique quando estiver pronta.' }
