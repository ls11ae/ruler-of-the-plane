<#
.SYNOPSIS
  Static web server of the booth package: no installation, no admin rights.

.DESCRIPTION
  Serves the folder -Root at http://localhost:<Port>/ with System.Net.HttpListener (built into Windows
  PowerShell 5.1 and PowerShell 7). GET and HEAD only; MIME types for the app and tsp-boards (.js, .mjs,
  .wasm, .webmanifest, .svg, .woff2, ...); a folder is served by its index.html, never as a listing;
  nothing outside the root and no hidden files (.htaccess). "/" redirects to -HomePath. Only "localhost"
  is accepted as host name, so other machines and other names cannot reach it.

  /__stand/ping answers "ruler-of-the-plane-stand", so the start script can tell its own server from
  another program on the port. The server ends when -StopFile appears or when its process is ended.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1 -Root ..\web -Port 8137
#>
param(
  [Parameter(Mandatory = $true)][string]$Root,
  [int]$Port = 8137,
  [string]$HomePath = '/ruler-of-the-plane/',
  [string]$Log = '',
  [string]$StopFile = ''
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$Marker = 'ruler-of-the-plane-stand'

# Keys of a PowerShell hashtable ignore case, so ".JS" is found as well.
$Types = @{
  '.html'        = 'text/html; charset=utf-8'
  '.htm'         = 'text/html; charset=utf-8'
  '.js'          = 'text/javascript; charset=utf-8'
  '.mjs'         = 'text/javascript; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.json'        = 'application/json; charset=utf-8'
  '.map'         = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.txt'         = 'text/plain; charset=utf-8'
  '.md'          = 'text/markdown; charset=utf-8'
  '.xml'         = 'application/xml; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.webp'        = 'image/webp'
  '.jpg'         = 'image/jpeg'
  '.jpeg'        = 'image/jpeg'
  '.gif'         = 'image/gif'
  '.ico'         = 'image/x-icon'
  '.wasm'        = 'application/wasm'
  '.woff2'       = 'font/woff2'
  '.woff'        = 'font/woff'
  '.ttf'         = 'font/ttf'
  '.otf'         = 'font/otf'
  '.pdf'         = 'application/pdf'
}

# GetFullPath on both sides: Windows PowerShell's .NET expands 8.3 names (C:\Users\RUNNER~1), so a root
# given in short form must be compared in the same form as the request paths.
$RootFull = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Root).ProviderPath).TrimEnd([char[]]@('\', '/'))
$Separator = [System.IO.Path]::DirectorySeparatorChar

$LogWriter = $null
if ($Log) {
  # Keep the log small: start a new one when the old one passes 5 MB.
  if ((Test-Path -LiteralPath $Log) -and ((Get-Item -LiteralPath $Log).Length -gt 5MB)) {
    Move-Item -LiteralPath $Log -Destination "$Log.1" -Force
  }
  $LogWriter = New-Object System.IO.StreamWriter($Log, $true, (New-Object System.Text.UTF8Encoding($false)))
  $LogWriter.AutoFlush = $true
}

function Write-Log([string]$Line) {
  if ($LogWriter) { $LogWriter.WriteLine("$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) $Line") }
}

function Send-Text($Response, [int]$Status, [string]$Text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $Response.StatusCode = $Status
  $Response.ContentType = 'text/plain; charset=utf-8'
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Send-Redirect($Response, [int]$Status, [string]$Location) {
  $Response.StatusCode = $Status
  $Response.RedirectLocation = $Location
  $Response.ContentLength64 = 0
}

<# The file for a request path, or $null: no "..", no hidden names, no drive letters, streams or
   backslashes, and the result must lie inside the root. #>
function Resolve-RequestPath([string]$Path) {
  if ($Path.IndexOf([char]0) -ge 0) { return $null }
  $parts = @($Path.Split('/') | Where-Object { $_ -ne '' })
  foreach ($part in $parts) {
    if ($part.StartsWith('.') -or $part.Contains('\') -or $part.Contains(':')) { return $null }
  }
  if ($parts.Count -eq 0) { return $RootFull }
  $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($RootFull, ($parts -join $Separator)))
  if (-not $full.StartsWith($RootFull + $Separator, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  return $full
}

function Invoke-Request($Context) {
  $request = $Context.Request
  $response = $Context.Response
  $response.Headers.Add('X-Content-Type-Options', 'nosniff')
  $method = $request.HttpMethod
  $rawPath = $request.Url.AbsolutePath
  $query = $request.Url.Query

  if ($method -ne 'GET' -and $method -ne 'HEAD') {
    $response.Headers.Add('Allow', 'GET, HEAD')
    Send-Text $response 405 'Method not allowed'
    return 405
  }
  if ($rawPath -eq '/__stand/ping') {
    $response.Headers.Add('Cache-Control', 'no-store')
    Send-Text $response 200 $Marker
    return 200
  }
  if ($rawPath -eq '/') {
    Send-Redirect $response 302 ($HomePath + $query)
    return 302
  }

  $path = [System.Uri]::UnescapeDataString($rawPath)
  $full = Resolve-RequestPath $path
  if ($null -eq $full) {
    Send-Text $response 404 'Not found'
    return 404
  }
  if ([System.IO.Directory]::Exists($full)) {
    # Relative addresses inside a folder need the trailing slash (tsp-boards uses "./assets/...").
    if (-not $rawPath.EndsWith('/')) {
      Send-Redirect $response 301 ($rawPath + '/' + $query)
      return 301
    }
    $full = [System.IO.Path]::Combine($full, 'index.html')
  }
  if (-not [System.IO.File]::Exists($full)) {
    Send-Text $response 404 'Not found'
    return 404
  }

  $file = New-Object System.IO.FileInfo($full)
  $type = $Types[$file.Extension]
  if (-not $type) { $type = 'application/octet-stream' }
  # Revalidate every time (a new package replaces files under the same names), answer 304 if unchanged.
  $modified = $file.LastWriteTimeUtc
  $modified = $modified.AddTicks( - ($modified.Ticks % [TimeSpan]::TicksPerSecond))
  $response.Headers.Add('Cache-Control', 'no-cache')
  $response.Headers.Add('Last-Modified', $modified.ToString('r'))
  $since = $request.Headers['If-Modified-Since']
  if ($since) {
    $parsed = [DateTime]::MinValue
    $styles = [System.Globalization.DateTimeStyles]::AdjustToUniversal -bor [System.Globalization.DateTimeStyles]::AssumeUniversal
    if ([DateTime]::TryParse($since, [System.Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$parsed) -and
      $modified -le $parsed) {
      $response.StatusCode = 304
      $response.ContentLength64 = 0
      return 304
    }
  }
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $response.StatusCode = 200
  $response.ContentType = $type
  $response.ContentLength64 = $bytes.Length
  if ($method -eq 'GET') { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
  return 200
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  $message = $_.Exception.Message
  $code = 0
  if ($_.Exception -is [System.Net.HttpListenerException]) { $code = $_.Exception.ErrorCode }
  if ($code -eq 5) {
    $message += " -- Zugriff verweigert. Einmalig als Administrator ausführen: netsh http add urlacl url=http://localhost:$Port/ user=$env:USERDOMAIN\$env:USERNAME"
  } elseif ($code -eq 32 -or $code -eq 183 -or $message -match 'in use|verwendet') {
    $message += " -- Port $Port ist belegt: anderes Programm beenden oder mit -Port eine andere Nummer wählen."
  }
  Write-Log "ERROR start: $message"
  [Console]::Error.WriteLine("Server konnte nicht starten: $message")
  exit 2
}

Write-Log "START http://localhost:$Port/ root=$RootFull"
Write-Host "Server läuft: http://localhost:$Port/ (Ordner $RootFull)"

try {
  while ($listener.IsListening) {
    $next = $listener.GetContextAsync()
    while (-not $next.AsyncWaitHandle.WaitOne(500)) {
      if ($StopFile -and (Test-Path -LiteralPath $StopFile)) {
        Write-Log 'STOP (stop file)'
        exit 0
      }
    }
    $context = $null
    try {
      $context = $next.GetAwaiter().GetResult()
      $watch = [System.Diagnostics.Stopwatch]::StartNew()
      $status = Invoke-Request $context
      Write-Log "$status $($context.Request.HttpMethod) $($context.Request.Url.PathAndQuery) $($watch.ElapsedMilliseconds)ms"
    } catch {
      # A visitor's browser that went away mid-answer must not end the server.
      Write-Log "ERROR $($_.Exception.Message)"
      try { if ($context) { $context.Response.StatusCode = 500 } } catch { }
    } finally {
      if ($context) { try { $context.Response.Close() } catch { } }
    }
  }
} finally {
  try { $listener.Stop(); $listener.Close() } catch { }
  if ($LogWriter) { $LogWriter.Dispose() }
}
