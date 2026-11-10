# Windows end-to-end check for install.mjs: park the running .exe on update and uninstall,
# then delete it through the bounded WMI helper once the process stops.
# Run from a PowerShell step on a Windows runner (never from `bun test`):
#   pwsh -File scripts/e2e/windows-deferred-removal.e2e.ps1
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$base = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
$testRoot = Join-Path $base "forge614-ai-deferred-removal"
$forgeHome = Join-Path $testRoot ".forge614"
$nodeHome = Join-Path $forgeHome "demo"
$bin = Join-Path $nodeHome "bin"
$launcher = Join-Path $bin "forge614-demo.exe"
$portFile = Join-Path $testRoot "port.txt"
$installer = Join-Path $repo "standard/templates/install.mjs"
$registryKey = "Software\Forge614-Test-$([guid]::NewGuid().ToString())"
$running = @()
$server = $null

function Assert-True($condition, $message) { if (-not $condition) { throw $message } }

function Wait-Until([scriptblock]$condition, [int]$seconds) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    if (& $condition) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return [bool](& $condition)
}

function Invoke-Installer([string[]]$arguments) {
  & node $installer @arguments | Out-Host
  return $LASTEXITCODE
}

function Start-Fixture {
  $process = Start-Process -FilePath $launcher -ArgumentList "wait" -PassThru -WindowStyle Hidden
  $script:running += $process
  Start-Sleep -Seconds 2
  Assert-True (-not $process.HasExited) "the fixture launcher exited instead of waiting"
  return $process
}

function Stop-Fixture($process) {
  Stop-Process -Id $process.Id -Force
  $process.WaitForExit()
}

if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
New-Item -Path "HKCU:\$registryKey" -Force | Out-Null

try {
  foreach ($version in @("1.0.0", "1.1.0", "1.2.0")) {
    $source = Join-Path $testRoot "launcher-$version.ts"
    @"
const args = process.argv.slice(2);
// 1.2.0 passes the staged smoke test but answers wrongly once published in bin\, to force the rollback.
if (args[0] === "--version") console.log(("$version" === "1.2.0" && /\\bin\\/.test(process.execPath)) ? "forge614-demo wrong" : "forge614-demo $version");
else if (args[0] === "wait") setInterval(() => {}, 1000);
"@ | Set-Content -LiteralPath $source -Encoding utf8
    & bun build $source --compile --target=bun-windows-x64 --outfile (Join-Path $testRoot "launcher-$version.exe")
    if ($LASTEXITCODE -ne 0) { throw "could not compile the launcher fixture $version" }
  }

  $env:FORGE614_E2E_PORT_FILE = $portFile
  $env:FORGE614_E2E_EXE_100 = Join-Path $testRoot "launcher-1.0.0.exe"
  $env:FORGE614_E2E_EXE_110 = Join-Path $testRoot "launcher-1.1.0.exe"
  $env:FORGE614_E2E_EXE_120 = Join-Path $testRoot "launcher-1.2.0.exe"
  $server = Start-Process -FilePath node -ArgumentList @((Join-Path $PSScriptRoot "windows-release-server.mjs")) -PassThru -WindowStyle Hidden
  Assert-True (Wait-Until { Test-Path -LiteralPath $portFile } 15) "the local release server did not start"

  $env:HOME = $testRoot
  $env:USERPROFILE = $testRoot
  $env:FORGE614_HOME = $forgeHome
  $env:FORGE614_INSTALL_NODE = "demo"
  $env:FORGE614_INSTALL_REPOSITORY = "jotredev/forge614-demo"
  $env:FORGE614_INSTALL_TEST_BASE_URL = "http://127.0.0.1:$((Get-Content -LiteralPath $portFile -Raw).Trim())"
  $env:FORGE614_TEST_WINDOWS_ENV_KEY = $registryKey
  $env:FORGE614_LOCALE = "en"

  # 1. Install 1.0.0 and keep its launcher running.
  $exitCode = Invoke-Installer @("--version", "v1.0.0")
  Assert-True ($exitCode -eq 0) "install 1.0.0 failed (exit code: $exitCode)"
  $first = Start-Fixture

  # 2. Update while the launcher runs: exit 0, new launcher in place, old one parked.
  $exitCode = Invoke-Installer @("--version", "v1.1.0")
  Assert-True ($exitCode -eq 0) "update with the launcher running did not exit 0 (exit code: $exitCode)"
  Assert-True ((& $launcher --version) -eq "forge614-demo 1.1.0") "the new launcher is not in place"
  $parked = @(Get-ChildItem -LiteralPath $bin -Filter ".old-forge614-demo-*.exe" -File)
  Assert-True ($parked.Count -eq 1) "expected one parked launcher in bin, found $($parked.Count)"

  # 3. Stop the process: the helper must remove the parked file in under 60 seconds.
  Stop-Fixture $first
  Assert-True (Wait-Until { @(Get-ChildItem -LiteralPath $bin -Filter ".old-forge614-demo-*.exe" -File -ErrorAction SilentlyContinue).Count -eq 0 } 60) "the parked launcher was not deleted within 60 seconds"

  # 3b. Failed update to 1.2.0 with the 1.1.0 launcher running: non-zero exit, old launcher restored, nothing parked left.
  $second = Start-Fixture
  $exitCode = Invoke-Installer @("--version", "v1.2.0")
  Assert-True ($exitCode -ne 0) "the update with a failing smoke test must not exit 0 (exit code: $exitCode)"
  Assert-True ((& $launcher --version) -eq "forge614-demo 1.1.0") "the rollback did not leave the 1.1.0 launcher in place"
  Assert-True (@(Get-ChildItem -LiteralPath $bin -Filter ".old-forge614-demo-*.exe" -File -ErrorAction SilentlyContinue).Count -eq 0) "the rollback left a parked launcher in bin"
  Stop-Fixture $second

  # 4. Uninstall while the (restored) launcher runs.
  $second = Start-Fixture
  $exitCode = Invoke-Installer @("--uninstall")
  Assert-True ($exitCode -eq 0) "uninstall with the launcher running did not exit 0 (exit code: $exitCode)"
  Assert-True (-not (Test-Path -LiteralPath $nodeHome)) "the node folder still exists after uninstall"
  $parkedHome = @(Get-ChildItem -LiteralPath $forgeHome -Filter ".forge614-demo-old-*.exe" -File)
  Assert-True ($parkedHome.Count -ge 1) "expected a parked executable in FORGE614_HOME"
  Stop-Fixture $second
  Assert-True (Wait-Until { @(Get-ChildItem -LiteralPath $forgeHome -Filter ".forge614-demo-old-*.exe" -File -ErrorAction SilentlyContinue).Count -eq 0 } 60) "the parked executable was not deleted within 60 seconds"
  Write-Host "WINDOWS_DEFERRED_REMOVAL_OK"
} finally {
  foreach ($process in $running) { if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } }
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath "HKCU:\$registryKey" -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
