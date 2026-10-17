<#
  CI test of Start-Stand.cmd and Stop-Stand.cmd on Windows (booth workflow, windows-latest):
  the server answers, the browser loads the app (the server log shows its service worker), a browser
  closed by force comes back, and Stop-Stand.cmd ends browser and server and restores the power plan.
#>
param(
  [Parameter(Mandatory = $true)][string]$Stand,
  [ValidateSet('chrome', 'firefox', 'edge')][string]$Browser = 'chrome',
  [int]$Port = 8137
)
$ErrorActionPreference = 'Stop'
$Stand = (Resolve-Path -LiteralPath $Stand).ProviderPath
. (Join-Path $Stand 'scripts\common.ps1')

function Wait-Until([scriptblock]$Condition, [int]$Seconds, [string]$What) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (& $Condition) { Write-Host "ok: $What"; return }
    Start-Sleep -Milliseconds 500
  }
  throw "timed out after $Seconds s: $What"
}

function Get-ServerLog {
  if (Test-Path -LiteralPath $ServerLog) { return Get-Content -LiteralPath $ServerLog -Raw }
  return ''
}

$before = @{}
foreach ($s in $PowerSettings) { $before[$s.Setting] = Get-PowerValue $s.Sub $s.Setting }
Remove-Item -LiteralPath $ServerLog -Force -ErrorAction SilentlyContinue

Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$Stand\Start-Stand.cmd`" -Browser $Browser -Port $Port" -WindowStyle Minimized
Wait-Until { Test-StandServer $Port } 60 'server answers'
Wait-Until { (Get-ServerLog) -match 'GET /ruler-of-the-plane/sw\.js' } 120 "$Browser loaded the app and its service worker"
Wait-Until { (Get-ServerLog) -match 'GET /ruler-of-the-plane/levels/' } 120 'the service worker precaches the levels'
Wait-Until { @(Get-StandBrowserProcesses).Count -gt 0 } 10 "$Browser runs with the booth profile"
$state = Read-State
if (-not $state -or $state.browser -ne $Browser) { throw "state.json names browser '$($state.browser)'" }
foreach ($s in $PowerSettings) {
  $now = Get-PowerValue $s.Sub $s.Setting
  if ($now -and ($now.AC -ne 0 -or $now.DC -ne 0)) { Write-Warning "$($s.Setting) is $($now.AC)/$($now.DC), not 0 (not allowed here?)" }
}

# A visitor closes the browser (Alt+F4): the start window opens it again.
foreach ($p in @(Get-StandBrowserProcesses)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
Wait-Until { @(Get-StandBrowserProcesses).Count -eq 0 } 15 'browser closed'
Wait-Until { @(Get-StandBrowserProcesses).Count -gt 0 } 30 'browser reopened by the start window'

& cmd.exe /c "`"$Stand\Stop-Stand.cmd`""
Wait-Until { -not (Test-StandServer $Port) } 20 'server ended'
Wait-Until { @(Get-StandBrowserProcesses).Count -eq 0 } 20 'browser ended'
Wait-Until { -not (Test-Path -LiteralPath $StateFile) } 20 'state.json removed'
foreach ($s in $PowerSettings) {
  $now = Get-PowerValue $s.Sub $s.Setting
  $was = $before[$s.Setting]
  if ($was -and $now -and ($now.AC -ne $was.AC -or $now.DC -ne $was.DC)) {
    throw "$($s.Setting) not restored: $($now.AC)/$($now.DC) instead of $($was.AC)/$($was.DC)"
  }
}
Write-Host 'ok: power settings restored'
