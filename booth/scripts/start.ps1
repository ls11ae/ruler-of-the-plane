<#
.SYNOPSIS
  Starts the booth: local server, browser in kiosk mode on the app, screen kept awake.
  Called by Start-Stand.cmd. Windows PowerShell 5.1, no admin rights needed.

.DESCRIPTION
  1. Checks that the package is complete (scripts\files.txt) and unblocks its files.
  2. Starts server.ps1 hidden on http://localhost:<Port>/ (or reuses one that is still running).
  3. Keeps display and system awake while this window is open; sets the power plan's timeouts for the
     screen, sleep and hibernation to "never" and switches the screen saver off, and saves the old
     values for Stop-Stand.cmd. Where that is not allowed, says what to set by hand.
  4. Opens Chrome in kiosk mode on /ruler-of-the-plane/?kiosk with its own profile (no first-run
     pages, no translation bar, no pinch zoom or swipe navigation, no "restore pages" bubble);
     Firefox --kiosk if Chrome is missing, then Edge.
  5. Watches: a browser closed by a visitor (Alt+F4) comes back, and so does a server that died.
  Ends with Stop-Stand.cmd, or Ctrl+C in this window.
#>
param(
  [ValidateSet('auto', 'chrome', 'firefox', 'edge')][string]$Browser = 'auto',
  [int]$Port = 8137,
  [switch]$NoBrowser,
  [switch]$KeepPowerSettings
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$AppUrl = "http://localhost:$Port/ruler-of-the-plane/?kiosk"
try { Start-Transcript -Path (Join-Path $StateDir 'start.log') -Append | Out-Null } catch { }
$Host.UI.RawUI.WindowTitle = 'Ruler of the Plane - Stand'

Write-Host ''
Write-Host '  Ruler of the Plane - Stand' -ForegroundColor Cyan
Write-Host "  $StandRoot"
Write-Host ''

if ($env:OS -ne 'Windows_NT') {
  Write-Fail 'Dieses Skript ist für Windows. (Den Server allein startet server.ps1.)'
  exit 1
}

# --- Already running? -------------------------------------------------------------------------------
$old = Read-State
if (Test-StandWatchdog $old) {
  Write-Fail 'Der Stand läuft schon (Fenster "Ruler of the Plane - Stand"). Erst Stop-Stand.cmd, dann neu starten.'
  exit 1
}
Remove-Item -LiteralPath $StopFlag -Force -ErrorAction SilentlyContinue

# --- 1. Package complete? ---------------------------------------------------------------------------
$listFile = Join-Path $PSScriptRoot 'files.txt'
if (-not (Test-Path -LiteralPath $listFile)) {
  Write-Fail 'scripts\files.txt fehlt: Paket unvollständig. ZIP neu entpacken.'
  exit 1
}
$bad = @()
foreach ($line in [System.IO.File]::ReadAllLines($listFile)) {
  if (-not $line) { continue }
  $tab = $line.IndexOf("`t")
  $size = [int64]$line.Substring(0, $tab)
  $relative = $line.Substring($tab + 1).Replace('/', '\')
  $file = Join-Path $StandRoot $relative
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { $bad += "fehlt: $relative" }
  elseif ((Get-Item -LiteralPath $file).Length -ne $size) { $bad += "anders: $relative" }
}
if ($bad.Count -gt 0) {
  Write-Fail "Paket unvollständig ($($bad.Count) Dateien). ZIP neu entpacken (Rechtsklick → Alle extrahieren)."
  $bad | Select-Object -First 10 | ForEach-Object { Write-Step $_ }
  exit 1
}
# Files from a downloaded ZIP carry the "from the internet" mark; drop it (allowed without admin).
Get-ChildItem -LiteralPath $StandRoot -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
Write-Ok 'Paket vollständig'

# --- 2. Server --------------------------------------------------------------------------------------
$powershell = (Get-Process -Id $PID).Path
function Start-StandServer {
  $arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$ServerScript`" -Root `"$WebRoot`" " +
    "-Port $Port -Log `"$ServerLog`" -StopFile `"$StopFlag`""
  $process = Start-Process -FilePath $powershell -ArgumentList $arguments -WindowStyle Hidden -PassThru
  $deadline = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $deadline) {
    if (Test-StandServer $Port) { return $process.Id }
    if ($process.HasExited) { break }
    Start-Sleep -Milliseconds 300
  }
  Write-Fail "Der Server startet nicht (Port $Port). Letzte Zeilen von $ServerLog :"
  if (Test-Path -LiteralPath $ServerLog) { Get-Content -LiteralPath $ServerLog -Tail 5 | ForEach-Object { Write-Step $_ } }
  return $null
}

$serverId = $null
if (Test-StandServer $Port) {
  Write-Ok "Server läuft schon: http://localhost:$Port/"
  if ($old -and $old.PSObject.Properties['server']) { $serverId = $old.server }
} elseif (Test-PortInUse $Port) {
  Write-Fail "Port $Port ist von einem anderen Programm belegt. Start-Stand.cmd -Port 8138 nimmt einen anderen (die Bestenlisten gehören dann zu diesem Port)."
  exit 1
} else {
  $serverId = Start-StandServer
  if (-not $serverId) { exit 1 }
  Write-Ok "Server: http://localhost:$Port/"
}

$state = [ordered]@{
  watchdog    = $PID
  server      = $serverId
  port        = $Port
  browser     = $null
  power       = @()
  screensaver = $false
  started     = (Get-Date).ToString('s')
}
Save-State $state

# --- 3. Stay awake ----------------------------------------------------------------------------------
if (Enable-KeepAwake) { Write-Ok 'Bildschirm bleibt an, solange dieses Fenster offen ist' }
$manual = @()
if (-not $KeepPowerSettings) {
  foreach ($s in $PowerSettings) {
    $value = Get-PowerValue $s.Sub $s.Setting
    if ($null -eq $value) { continue }
    if ($value.AC -eq 0 -and $value.DC -eq 0) { continue }
    $saved = [pscustomobject]@{ sub = $s.Sub; setting = $s.Setting; name = $s.Name; ac = $value.AC; dc = $value.DC }
    $set = Set-PowerValue $s.Sub $s.Setting 0 0
    $now = Get-PowerValue $s.Sub $s.Setting
    if ($set -and $now -and $now.AC -eq 0 -and $now.DC -eq 0) {
      $state.power += $saved
      Write-Ok "$($s.Name): nie (wird beim Beenden zurückgesetzt)"
    } else {
      $manual += $s.Name
    }
  }
  if ((Get-ScreenSaverActive) -eq $true) {
    if (Set-ScreenSaverActive $false) {
      $state.screensaver = $true
      Write-Ok 'Bildschirmschoner: aus (nur bis zum Beenden)'
    } else {
      $manual += 'Bildschirmschoner'
    }
  }
  Save-State $state
}
if ($manual.Count -gt 0) {
  Write-Warn "Nicht erlaubt, bitte von Hand auf ""Nie"" stellen: $($manual -join ', ')"
  Write-Step '    Einstellungen → System → Bildschirm und Energie (Netzbetrieb und Akku);'
  Write-Step '    Bildschirmschoner: Einstellungen → Personalisierung → Sperrbildschirm → Bildschirmschoner.'
}
$policy = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -ErrorAction SilentlyContinue
if ($policy -and $policy.PSObject.Properties['InactivityTimeoutSecs'] -and $policy.InactivityTimeoutSecs -gt 0) {
  Write-Warn "Eine Richtlinie sperrt den Laptop nach $($policy.InactivityTimeoutSecs) s ohne Eingabe (die IT kann das abstellen)."
}
if ((Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') -or
  (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending')) {
  Write-Warn 'Windows wartet auf einen Neustart für Updates: jetzt neu starten, sonst startet es womöglich am Stand neu.'
}

# --- 4. Browser -------------------------------------------------------------------------------------
function Find-Program([string]$Exe, [string[]]$Candidates) {
  foreach ($c in $Candidates) { if ($c -and (Test-Path -LiteralPath $c)) { return $c } }
  foreach ($hive in @('HKLM', 'HKCU')) {
    $key = "$($hive):\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$Exe"
    $path = (Get-ItemProperty -LiteralPath $key -ErrorAction SilentlyContinue).'(default)'
    if ($path -and (Test-Path -LiteralPath $path.Trim('"'))) { return $path.Trim('"') }
  }
  return $null
}

$pf86 = ${env:ProgramFiles(x86)}
$browsers = [ordered]@{
  chrome  = Find-Program 'chrome.exe' @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$pf86\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
  firefox = Find-Program 'firefox.exe' @(
    "$env:ProgramFiles\Mozilla Firefox\firefox.exe",
    "$pf86\Mozilla Firefox\firefox.exe",
    "$env:LOCALAPPDATA\Mozilla Firefox\firefox.exe")
  edge    = Find-Program 'msedge.exe' @(
    "$pf86\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")
}

$chosen = $null
if ($Browser -eq 'auto') {
  foreach ($name in $browsers.Keys) { if ($browsers[$name]) { $chosen = $name; break } }
} elseif ($browsers[$Browser]) {
  $chosen = $Browser
}

<# Chromium flags: own profile, no first-run or default-browser pages, no translation bar, no pinch
   zoom, no swipe navigation, no crash bubble, no permission prompts, no background traffic. #>
function Get-ChromiumArguments([string]$ProfileDir) {
  $flags = @(
    "--user-data-dir=`"$ProfileDir`"",
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate,TranslateUI,OverscrollHistoryNavigation,MediaRouter',
    '--overscroll-history-navigation=0',
    '--disable-pinch',
    '--hide-crash-restore-bubble',
    '--disable-session-crashed-bubble',
    '--noerrdialogs',
    '--deny-permission-prompts',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--no-pings',
    '--lang=de',
    '--kiosk',
    "`"$AppUrl`""
  )
  return $flags -join ' '
}

<# A browser that was ended by force would offer to restore its pages; tell it that it closed normally. #>
function Clear-CrashFlag([string]$ProfileDir) {
  $prefs = Join-Path (Join-Path $ProfileDir 'Default') 'Preferences'
  if (-not (Test-Path -LiteralPath $prefs)) { return }
  try {
    $text = [System.IO.File]::ReadAllText($prefs)
    $text = $text -replace '"exit_type":"[^"]*"', '"exit_type":"Normal"' -replace '"exited_cleanly":false', '"exited_cleanly":true'
    [System.IO.File]::WriteAllText($prefs, $text)
  } catch { }
}

<# Firefox preferences, written before every start (user.js wins over what Firefox stored). #>
$FirefoxPrefs = @'
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("startup.homepage_welcome_url", "");
user_pref("startup.homepage_welcome_url.additional", "");
user_pref("browser.aboutwelcome.enabled", false);
user_pref("trailhead.firstrun.didSeeAboutWelcome", true);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
user_pref("browser.rights.3.shown", true);
user_pref("browser.translations.enable", false);
user_pref("browser.translations.automaticallyPopup", false);
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("toolkit.startup.max_resumed_crashes", -1);
user_pref("browser.tabs.warnOnClose", false);
user_pref("browser.gesture.swipe.left", "");
user_pref("browser.gesture.swipe.right", "");
user_pref("browser.gesture.pinch.in", "");
user_pref("browser.gesture.pinch.out", "");
user_pref("apz.allow_zooming", false);
user_pref("apz.overscroll.enabled", false);
user_pref("widget.disable-swipe-tracker", true);
user_pref("mousewheel.with_control.action", 1);
user_pref("full-screen-api.warning.timeout", 0);
user_pref("permissions.default.desktop-notification", 2);
user_pref("network.captive-portal-service.enabled", false);
user_pref("network.connectivity-service.enabled", false);
user_pref("extensions.pocket.enabled", false);
user_pref("signon.rememberSignons", false);
user_pref("intl.locale.requested", "de");
'@

function Start-StandBrowser {
  $exe = $browsers[$chosen]
  $profileDir = Join-Path $StateDir "profile-$chosen"
  if (-not (Test-Path -LiteralPath $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force | Out-Null }
  if ($chosen -eq 'firefox') {
    [System.IO.File]::WriteAllText((Join-Path $profileDir 'user.js'), $FirefoxPrefs)
    $arguments = "-no-remote -profile `"$profileDir`" --kiosk `"$AppUrl`""
  } else {
    Clear-CrashFlag $profileDir
    $arguments = Get-ChromiumArguments $profileDir
    if ($chosen -eq 'edge') { $arguments += ' --edge-kiosk-type=fullscreen' }
  }
  Start-Process -FilePath $exe -ArgumentList $arguments | Out-Null
}

if ($NoBrowser) {
  Write-Ok "Ohne Browser: $AppUrl selbst öffnen"
} elseif (-not $chosen) {
  Write-Fail "Kein Browser gefunden ($Browser). Chrome oder Firefox installieren, oder $AppUrl von Hand öffnen."
} else {
  Start-StandBrowser
  $state.browser = $chosen
  Save-State $state
  Write-Ok "$chosen im Kiosk-Modus: $AppUrl"
}

Write-Host ''
Write-Host '  Der Stand läuft. Dieses Fenster offen lassen.' -ForegroundColor Cyan
Write-Host '  Beenden: Stop-Stand.cmd doppelklicken, oder hier Strg+C.'
Write-Host '  (Zum Desktop: Windows-Taste oder Alt+Tab.)'
Write-Host ''

# --- 5. Watch -----------------------------------------------------------------------------------------
$restarts = New-Object System.Collections.Generic.List[datetime]
$serverMisses = 0
try {
  while (-not (Test-Path -LiteralPath $StopFlag)) {
    Start-Sleep -Seconds 3
    if (Test-Path -LiteralPath $StopFlag) { break }
    [void](Enable-KeepAwake)
    if (Test-StandServer $Port) {
      $serverMisses = 0
    } elseif ((++$serverMisses) -ge 2) {
      Write-Warn "$((Get-Date).ToString('HH:mm:ss')) Server antwortet nicht, starte ihn neu"
      $state.server = Start-StandServer
      Save-State $state
      $serverMisses = 0
    }
    if ($state.browser -and @(Get-StandBrowserProcesses).Count -eq 0 -and -not (Test-Path -LiteralPath $StopFlag)) {
      $recent = @($restarts | Where-Object { $_ -gt (Get-Date).AddMinutes(-2) })
      if ($recent.Count -ge 5) {
        Write-Fail 'Der Browser wurde 5-mal in 2 Minuten geschlossen; kein weiterer Neustart. Start-Stand.cmd neu starten.'
        $state.browser = $null
        continue
      }
      Write-Warn "$((Get-Date).ToString('HH:mm:ss')) Browser wurde geschlossen, öffne ihn wieder"
      $restarts.Add((Get-Date))
      Start-Sleep -Seconds 1
      Start-StandBrowser
    }
  }
} finally {
  # Stop-Stand.cmd (stop flag) or Ctrl+C: end everything and restore the settings.
  Write-Host ''
  Write-Host '  Stand wird beendet ...'
  Stop-Stand
  Write-Host '  Stand beendet.' -ForegroundColor Cyan
  try { Stop-Transcript | Out-Null } catch { }
}
