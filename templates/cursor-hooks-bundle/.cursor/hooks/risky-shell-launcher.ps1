# Regenerate hooks.json: run tools/encode-risky-shell-launcher.ps1 from this bundle folder.

$ProgressPreference = "SilentlyContinue"
$InformationPreference = "SilentlyContinue"
$d = (Get-Location).Path
$p = $null
for ($i = 0; $i -lt 32; $i++) {
  $c = [IO.Path]::Combine($d, ".cursor", "hooks", "risky-shell.ps1")
  if (Test-Path -LiteralPath $c) { $p = $c; break }
  $n = Split-Path $d -Parent
  if ([string]::IsNullOrEmpty($n) -or ($n -eq $d)) { break }
  $d = $n
}
if ($p) {
  & $p
  exit $LASTEXITCODE
} else {
  [Console]::Out.WriteLine((@{ permission = "allow" } | ConvertTo-Json -Compress))
  exit 0
}
