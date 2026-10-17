<#
.SYNOPSIS
  Ends the booth started by start.ps1: browser, server, and the power settings it changed.
  Called by Stop-Stand.cmd. Windows PowerShell 5.1, no admin rights needed.
#>
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

Write-Host ''
Write-Host '  Ruler of the Plane - Stand beenden' -ForegroundColor Cyan
Write-Host ''

# The start window sees the stop flag within 3 s and ends everything itself; wait for it, then make sure.
New-Item -ItemType File -Path $StopFlag -Force | Out-Null
$state = Read-State
if ($state -and $state.PSObject.Properties['watchdog'] -and $state.watchdog -ne $PID) {
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline -and (Test-ProcessAlive $state.watchdog)) { Start-Sleep -Milliseconds 300 }
}
Stop-Stand
Write-Host ''
Write-Host '  Stand beendet.' -ForegroundColor Cyan
