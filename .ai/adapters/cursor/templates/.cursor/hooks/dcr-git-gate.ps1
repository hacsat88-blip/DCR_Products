# Cursor hook: validate.ps1 + deploy.ps1 -Check before git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>"/push (optional; wire in hooks.json to enable).

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Emit-Allow {
    [Console]::Out.WriteLine('{"permission":"allow"}')
}

function Invoke-SilentRepoScript {
    param(
        [Parameter(Mandatory)][string]$RelativeScript,
        [string[]]$ScriptArguments = @()
    )

    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    $scriptPath = Join-Path $repoRoot $RelativeScript
    if (-not (Test-Path -LiteralPath $scriptPath)) { return -1 }

    $pwsh = (Get-Process -Id $PID).Path
    $tmpOut = [System.IO.Path]::GetTempFileName()
    $tmpErr = [System.IO.Path]::GetTempFileName()
    try {
        $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $scriptPath) + $ScriptArguments
        $p = Start-Process -FilePath $pwsh `
            -ArgumentList $argList `
            -WorkingDirectory $repoRoot `
            -Wait -PassThru `
            -RedirectStandardOutput $tmpOut `
            -RedirectStandardError $tmpErr
        return $p.ExitCode
    }
    finally {
        Remove-Item -LiteralPath $tmpOut, $tmpErr -ErrorAction SilentlyContinue
    }
}

try { $raw = [Console]::In.ReadToEnd() } catch { Emit-Allow; exit 0 }
if ([string]::IsNullOrWhiteSpace($raw)) { Emit-Allow; exit 0 }

try { $obj = $raw | ConvertFrom-Json } catch { Emit-Allow; exit 0 }

$cmd = [string]$obj.command
if ($cmd -notmatch "(?i)\bgit\s+(push|commit)\b") { Emit-Allow; exit 0 }

$v = Invoke-SilentRepoScript -RelativeScript "validate.ps1"
if ($v -ne 0) { exit 2 }

$d = Invoke-SilentRepoScript -RelativeScript "deploy.ps1" -ScriptArguments @("-Check")
if ($d -ne 0) { exit 2 }

Emit-Allow
exit 0
