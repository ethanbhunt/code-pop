$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "scripts\start-mobile-android.js"

$nodeCandidates = @(
    (Get-Command node -ErrorAction SilentlyContinue | ForEach-Object { $_.Source }),
    "C:\Program Files\nodejs\node.exe"
) | Where-Object { $_ -and (Test-Path $_) }

if (-not $nodeCandidates -or $nodeCandidates.Count -eq 0) {
    throw "Node.js is required to run the cross-platform mobile startup script."
}

$nodeExe = $nodeCandidates[0]
& $nodeExe $scriptPath @args
exit $LASTEXITCODE
