# Updates hooks.json "EncodedCommand" from .cursor/hooks/risky-shell-launcher.ps1 (UTF-16LE Base64 per PowerShell -EncodedCommand).
$ErrorActionPreference = "Stop"
$bundleRoot = Split-Path $PSScriptRoot -Parent
$src = Join-Path $bundleRoot ".cursor/hooks/risky-shell-launcher.ps1"
$hooksPath = Join-Path $bundleRoot ".cursor/hooks.json"
$raw = (Get-Content -LiteralPath $src -Raw -Encoding UTF8).Trim()
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($raw))
$cmd = "powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand $b64"
$json = @"
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "$cmd",
        "timeout": 8
      }
    ]
  }
}
"@
Set-Content -LiteralPath $hooksPath -Value $json.Trim() -Encoding utf8
Write-Host "Updated $hooksPath"
