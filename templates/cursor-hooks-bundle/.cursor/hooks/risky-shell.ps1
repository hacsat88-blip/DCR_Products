# Cursor hook: gate obviously destructive shell commands (fail-open on parse errors).

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Emit-Allow {
    [Console]::Out.WriteLine('{"permission":"allow"}')
}

function Emit-Ask([string]$Reason) {
    $msg = "Potentially destructive or irreversible command. Confirm before running."
    $agent = "risky-shell.ps1: $Reason"
    $json = @{
        permission    = "ask"
        user_message  = $msg
        agent_message = $agent
    } | ConvertTo-Json -Compress -Depth 4
    [Console]::Out.WriteLine($json)
}

try { $raw = [Console]::In.ReadToEnd() } catch { Emit-Allow; exit 0 }
if ([string]::IsNullOrWhiteSpace($raw)) { Emit-Allow; exit 0 }

try { $obj = $raw | ConvertFrom-Json } catch { Emit-Allow; exit 0 }

$cmd = [string]$obj.command
if ([string]::IsNullOrWhiteSpace($cmd)) { Emit-Allow; exit 0 }

$checks = @(
    @{ Pattern = "(?i)\brm(\s+-\w+)*\s+/"; Reason = "rm on absolute root/system path risk" }
    @{ Pattern = "(?i)\bdd\s+"; Reason = "dd raw disk write" }
    @{ Pattern = "(?i)\bmkfs\b"; Reason = "mkfs" }
    @{ Pattern = "(?i)Format-Volume\b"; Reason = "Format-Volume" }
    @{ Pattern = "(?i)\bClear-Disk\b"; Reason = "Clear-Disk" }
    @{ Pattern = "(?i)\bRemove-Item\b.*\s-Recurse"; Reason = "recursive delete" }
    @{ Pattern = "(?i)\bgit\s+push\b[^\r\n]*(\s-f\b|\s--force\b)"; Reason = "git force push" }
    @{ Pattern = "(?i)\bgit\s+reset\b[^\r\n]*--hard\b"; Reason = "git reset --hard" }
)

foreach ($c in $checks) {
    if ($cmd -match $c.Pattern) { Emit-Ask $c.Reason; exit 0 }
}

Emit-Allow
exit 0
