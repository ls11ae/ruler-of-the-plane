<#
  Shared by start.ps1 and stop.ps1 (dot-sourced). Windows PowerShell 5.1, no admin rights needed.

  Everything the booth keeps between starts lives in %LOCALAPPDATA%\RulerOfThePlane: the browser
  profiles (leaderboards, staff settings and the app's offline copy are stored there, per browser),
  state.json (what is running and the power settings to restore), stop.flag and the logs.
#>

$StandRoot = Split-Path -Parent $PSScriptRoot
$WebRoot = Join-Path $StandRoot 'web'
$ServerScript = Join-Path $PSScriptRoot 'server.ps1'
$StateDir = if ($env:STAND_STATE_DIR) { $env:STAND_STATE_DIR } else { Join-Path $env:LOCALAPPDATA 'RulerOfThePlane' }
$StateFile = Join-Path $StateDir 'state.json'
$StopFlag = Join-Path $StateDir 'stop.flag'
$ServerLog = Join-Path $StateDir 'server.log'
$Marker = 'ruler-of-the-plane-stand'

if (-not (Test-Path -LiteralPath $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }

function Write-Step([string]$Text) { Write-Host "  $Text" }
function Write-Ok([string]$Text) { Write-Host "  OK  $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "  !!  $Text" -ForegroundColor Yellow }
function Write-Fail([string]$Text) { Write-Host "  XX  $Text" -ForegroundColor Red }

function Read-State {
  if (-not (Test-Path -LiteralPath $StateFile)) { return $null }
  try { return Get-Content -LiteralPath $StateFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch { return $null }
}

function Save-State($State) {
  $State | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $StateFile -Encoding UTF8
}

function Test-ProcessAlive($Id) {
  if (-not $Id) { return $false }
  return $null -ne (Get-Process -Id $Id -ErrorAction SilentlyContinue)
}

<# True if our server answers on the port (the system proxy is bypassed). #>
function Test-StandServer([int]$Port) {
  try {
    $request = [System.Net.HttpWebRequest]::Create("http://localhost:$Port/__stand/ping")
    $request.Proxy = $null
    $request.Timeout = 2000
    $response = $request.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $text = $reader.ReadToEnd()
    $response.Close()
    return $text -eq $Marker
  } catch {
    return $false
  }
}

<# True if anything at all listens on the port. #>
function Test-PortInUse([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $connect = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(500)) { return $false }
    $client.EndConnect($connect)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

<# Browser processes started with one of our profiles (by their command line). #>
function Get-StandBrowserProcesses {
  $profiles = Join-Path $StateDir 'profile-'
  $found = @()
  foreach ($name in @('chrome.exe', 'firefox.exe', 'msedge.exe')) {
    $found += @(Get-CimInstance Win32_Process -Filter "Name = '$name'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profiles) })
  }
  return $found
}

function Stop-StandBrowsers {
  $processes = @(Get-StandBrowserProcesses)
  if ($processes.Count -eq 0) { return }
  # Closing the window lets the browser save its state (no "restore pages" next time); then force.
  foreach ($p in $processes) {
    $process = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
    if ($process -and $process.MainWindowHandle -ne [IntPtr]::Zero) { [void]$process.CloseMainWindow() }
  }
  $deadline = (Get-Date).AddSeconds(5)
  while ((Get-Date) -lt $deadline -and @(Get-StandBrowserProcesses).Count -gt 0) { Start-Sleep -Milliseconds 300 }
  foreach ($p in @(Get-StandBrowserProcesses)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
}

# --- Power settings -------------------------------------------------------------------------------

$PowerSettings = @(
  @{ Sub = 'SUB_VIDEO'; Setting = 'VIDEOIDLE'; Name = 'Bildschirm ausschalten' },
  @{ Sub = 'SUB_SLEEP'; Setting = 'STANDBYIDLE'; Name = 'Energiesparmodus' },
  @{ Sub = 'SUB_SLEEP'; Setting = 'HIBERNATEIDLE'; Name = 'Ruhezustand' }
)

<# Current AC and DC value (seconds) of a setting of the active power plan, or $null. powercfg's text
   is translated, but the two current values are always the last two hex numbers of its answer. #>
function Get-PowerValue([string]$Sub, [string]$Setting) {
  $out = & powercfg.exe /query SCHEME_CURRENT $Sub $Setting 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $out) { return $null }
  $hex = @([regex]::Matches(($out -join "`n"), '0x[0-9a-fA-F]{8}') | ForEach-Object { $_.Value })
  if ($hex.Count -lt 2) { return $null }
  return @{
    AC = [Convert]::ToUInt32($hex[$hex.Count - 2].Substring(2), 16)
    DC = [Convert]::ToUInt32($hex[$hex.Count - 1].Substring(2), 16)
  }
}

function Set-PowerValue([string]$Sub, [string]$Setting, [uint32]$AC, [uint32]$DC) {
  & powercfg.exe /setacvalueindex SCHEME_CURRENT $Sub $Setting $AC 2>$null | Out-Null
  $ok = $LASTEXITCODE -eq 0
  & powercfg.exe /setdcvalueindex SCHEME_CURRENT $Sub $Setting $DC 2>$null | Out-Null
  $ok = $ok -and $LASTEXITCODE -eq 0
  & powercfg.exe /setactive SCHEME_CURRENT 2>$null | Out-Null
  return $ok
}

$NativeLoaded = $false
function Initialize-Native {
  if ($script:NativeLoaded) { return $true }
  try {
    Add-Type -Namespace RulerStand -Name Native -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
[DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint action, uint param, ref bool value, uint update);
[DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint action, uint param, IntPtr value, uint update);
'@
    $script:NativeLoaded = $true
  } catch {
    Write-Warn "Windows-Funktionen nicht verfügbar ($($_.Exception.Message))."
  }
  return $script:NativeLoaded
}

<# Keeps display and system awake while this process runs (released when it ends). #>
function Enable-KeepAwake {
  if (-not (Initialize-Native)) { return $false }
  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
  return [RulerStand.Native]::SetThreadExecutionState([Convert]::ToUInt32('80000003', 16)) -ne 0
}

function Get-ScreenSaverActive {
  if (-not (Initialize-Native)) { return $null }
  $active = $false
  [void][RulerStand.Native]::SystemParametersInfo(0x0010, 0, [ref]$active, 0)
  return $active
}

<# Switches the screen saver on or off for this session only (not written to the profile). #>
function Set-ScreenSaverActive([bool]$Active) {
  if (-not (Initialize-Native)) { return $false }
  $value = 0
  if ($Active) { $value = 1 }
  return [RulerStand.Native]::SystemParametersInfo(0x0011, $value, [IntPtr]::Zero, 0x02)
}

<# Undoes what start.ps1 changed: power plan values and the screen saver, as saved in state.json. #>
function Restore-PowerSettings($State) {
  if (-not $State) { return }
  $saved = $State.PSObject.Properties['power']
  if ($saved -and $saved.Value) {
    foreach ($entry in $saved.Value) {
      if (Set-PowerValue $entry.sub $entry.setting $entry.ac $entry.dc) {
        Write-Ok "$($entry.name): zurückgesetzt"
      } else {
        Write-Warn "$($entry.name) ließ sich nicht zurücksetzen (Einstellungen → System → Bildschirm und Energie)."
      }
    }
  }
  $screensaver = $State.PSObject.Properties['screensaver']
  if ($screensaver -and $screensaver.Value -eq $true) {
    if (Set-ScreenSaverActive $true) { Write-Ok 'Bildschirmschoner: wieder an' }
  }
}

<# Ends the booth: browsers, server, power settings. Safe to call twice (start.ps1 on Ctrl+C and stop.ps1). #>
function Stop-Stand {
  if (-not (Test-Path -LiteralPath $StopFlag)) { New-Item -ItemType File -Path $StopFlag -Force | Out-Null }
  $state = Read-State
  Stop-StandBrowsers
  Write-Ok 'Browser beendet'
  # The server watches the stop flag; end it by force if it does not go within 5 s.
  $deadline = (Get-Date).AddSeconds(5)
  $serverId = $null
  if ($state -and $state.PSObject.Properties['server']) { $serverId = $state.server }
  while ((Get-Date) -lt $deadline -and (Test-ProcessAlive $serverId)) { Start-Sleep -Milliseconds 300 }
  if (Test-ProcessAlive $serverId) { Stop-Process -Id $serverId -Force -ErrorAction SilentlyContinue }
  Write-Ok 'Server beendet'
  Restore-PowerSettings $state
  Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
}
