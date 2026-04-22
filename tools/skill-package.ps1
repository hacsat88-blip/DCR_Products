<#
.SYNOPSIS
  DCR Skill Package — スキルのパッケージング・レジストリ管理ツール

.DESCRIPTION
  skills/*/SKILL.md の package: frontmatter を読み取り、
  .dcr/registry.yaml を自動生成する。
  -Export でスキルを .tar.gz 相当のディレクトリにエクスポートする。

.PARAMETER GenerateRegistry
  .dcr/registry.yaml を package: 付きスキルから再生成する

.PARAMETER Export
  指定スキルを export/ ディレクトリにエクスポートする

.PARAMETER SkillName
  エクスポート対象のスキル名

.PARAMETER Check
  package: の整合性のみ検証する（書き込みなし）

.EXAMPLE
  .\tools\skill-package.ps1 -GenerateRegistry
  .\tools\skill-package.ps1 -Export -SkillName brainstorming
  .\tools\skill-package.ps1 -Check
#>

param(
    [switch]$GenerateRegistry,
    [switch]$Export,
    [string]$SkillName,
    [switch]$Check
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$CatalogPaths = Join-Path $RepoRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths
$SkillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$RegistryFile = Join-Path $RepoRoot ".dcr\registry.yaml"

# ─────────────────────────────────────────────
# Helper: Parse package: from SKILL.md frontmatter
# ─────────────────────────────────────────────
function Get-SkillPackage {
    param([string]$SkillPath)

    $content = Get-Content -Path $SkillPath -Encoding utf8
    $inFrontmatter = $false
    $inPackage = $false
    $pkg = @{}
    $currentKey = $null
    $currentList = @()

    foreach ($line in $content) {
        $trimmed = $line.Trim()
        if (-not $inFrontmatter -and $trimmed -eq '---') {
            $inFrontmatter = $true; continue
        }
        if ($inFrontmatter -and $trimmed -eq '---') { break }
        if (-not $inFrontmatter) { continue }

        if ($trimmed -eq 'package:') { $inPackage = $true; continue }
        if ($inPackage) {
            $isIndented = $line -match '^\s{2}\w'
            if ($isIndented -and $trimmed -match '^(\w+):\s*"?([^"]*)"?$') {
                if ($currentKey -and $currentList.Count -gt 0) {
                    $pkg[$currentKey] = $currentList
                    $currentList = @()
                }
                $key = $Matches[1]
                $val = $Matches[2]
                if ($val -eq '[]') {
                    $pkg[$key] = @()
                    $currentKey = $null
                } elseif ($val -ne '') {
                    $pkg[$key] = $val
                    $currentKey = $null
                } else {
                    $currentKey = $key
                    $currentList = @()
                }
                continue
            }
            if ($trimmed -match '^\-\s+"?([^"]*)"?$') {
                $currentList += $Matches[1]
                continue
            }
            if ($line -notmatch '^\s') {
                if ($currentKey -and $currentList.Count -gt 0) {
                    $pkg[$currentKey] = $currentList
                }
                break
            }
        }
    }
    if ($currentKey -and $currentList.Count -gt 0) {
        $pkg[$currentKey] = $currentList
    }

    return $pkg
}

# ─────────────────────────────────────────────
# Helper: Parse composable: from SKILL.md frontmatter
# ─────────────────────────────────────────────
function Get-SkillComposable {
    param([string]$SkillPath)

    $content = Get-Content -Path $SkillPath -Encoding utf8
    $inFrontmatter = $false
    $inComposable = $false
    $comp = @{}
    $currentKey = $null
    $currentList = @()

    foreach ($line in $content) {
        $trimmed = $line.Trim()
        if (-not $inFrontmatter -and $trimmed -eq '---') {
            $inFrontmatter = $true; continue
        }
        if ($inFrontmatter -and $trimmed -eq '---') { break }
        if (-not $inFrontmatter) { continue }

        if ($trimmed -eq 'composable:') { $inComposable = $true; continue }
        if ($inComposable) {
            $isIndented = $line -match '^\s{2}\w'
            if ($isIndented -and $trimmed -match '^(\w+):\s*"?([^"]*)"?$') {
                if ($currentKey -and $currentList.Count -gt 0) {
                    $comp[$currentKey] = $currentList
                    $currentList = @()
                }
                $key = $Matches[1]
                $val = $Matches[2]
                if ($val -ne '') {
                    $comp[$key] = $val
                    $currentKey = $null
                } else {
                    $currentKey = $key
                    $currentList = @()
                }
                continue
            }
            if ($trimmed -match '^\-\s+"?([^"]*)"?$') {
                $currentList += $Matches[1]
                continue
            }
            if ($line -notmatch '^\s') {
                if ($currentKey -and $currentList.Count -gt 0) {
                    $comp[$currentKey] = $currentList
                }
                break
            }
        }
    }
    if ($currentKey -and $currentList.Count -gt 0) {
        $comp[$currentKey] = $currentList
    }

    return $comp
}

# ─────────────────────────────────────────────
# -Check: Validate package: fields
# ─────────────────────────────────────────────
if ($Check) {
    Write-Host "Checking package: integrity..." -ForegroundColor Cyan
    $issues = 0

    $skillDirs = Get-ChildItem -Path $SkillsDir -Directory |
        Where-Object { $_.Name -notlike "_*" }

    foreach ($dir in $skillDirs) {
        $skillFile = Join-Path $dir.FullName "SKILL.md"
        if (-not (Test-Path $skillFile)) { continue }

        $content = Get-Content -Path $skillFile -Raw -Encoding utf8
        if ($content -notmatch '(?m)^package:') { continue }

        $pkg = Get-SkillPackage -SkillPath $skillFile

        # Check version
        if (-not $pkg.ContainsKey('version') -or $pkg['version'] -eq '') {
            Write-Host "[WARN] $($dir.Name) — package.version missing" -ForegroundColor Yellow
            $issues++
        }

        # Check dependencies exist
        if ($pkg.ContainsKey('dependencies') -and $pkg['dependencies'] -is [array]) {
            foreach ($dep in $pkg['dependencies']) {
                $depDir = Join-Path $SkillsDir $dep
                if (-not (Test-Path $depDir)) {
                    Write-Host "[FAIL] $($dir.Name) — dependency '$dep' not found" -ForegroundColor Red
                    $issues++
                }
            }
        }
    }

    if ($issues -eq 0) {
        Write-Host "All packages OK" -ForegroundColor Green
    } else {
        Write-Host "$issues issues found" -ForegroundColor Red
    }
    exit $issues
}

# ─────────────────────────────────────────────
# -GenerateRegistry: Rebuild .dcr/registry.yaml
# ─────────────────────────────────────────────
if ($GenerateRegistry) {
    Write-Host "Generating registry from package: metadata..." -ForegroundColor Cyan

    $lines = @()
    $lines += "# DCR Skill Registry"
    $lines += "# Auto-generated by tools/skill-package.ps1 -GenerateRegistry"
    $lines += "# Do not edit manually."
    $lines += ""
    $lines += "registry_version: `"1.0.0`""
    $lines += "dcr_compat: `">= 2.0`""
    $lines += "generated_at: `"$(Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz')`""
    $lines += ""
    $lines += "skills:"

    $skillDirs = Get-ChildItem -Path $SkillsDir -Directory |
        Where-Object { $_.Name -notlike "_*" } |
        Sort-Object Name

    $count = 0
    foreach ($dir in $skillDirs) {
        $skillFile = Join-Path $dir.FullName "SKILL.md"
        if (-not (Test-Path $skillFile)) { continue }

        $content = Get-Content -Path $skillFile -Raw -Encoding utf8
        if ($content -notmatch '(?m)^package:') { continue }

        $pkg = Get-SkillPackage -SkillPath $skillFile
        $comp = Get-SkillComposable -SkillPath $skillFile

        # Extract description from frontmatter
        $desc = ""
        if ($content -match '(?m)^description:\s*"?([^"\n]+)"?') {
            $desc = $Matches[1]
        }

        $lines += ""
        $lines += "  $($dir.Name):"
        $version = if ($pkg.ContainsKey('version')) { $pkg['version'] } else { "0.0.0" }
        $lines += "    version: `"$version`""
        $lines += "    description: `"$desc`""

        # Tags
        if ($pkg.ContainsKey('tags') -and $pkg['tags'] -is [array] -and $pkg['tags'].Count -gt 0) {
            $lines += "    tags:"
            foreach ($tag in $pkg['tags']) { $lines += "      - $tag" }
        }

        # Composable info
        if ($comp.ContainsKey('input_type')) {
            $lines += "    input_type: $($comp['input_type'])"
        }
        if ($comp.ContainsKey('output_type')) {
            $lines += "    output_type: $($comp['output_type'])"
        }

        # Dependencies
        if ($pkg.ContainsKey('dependencies') -and $pkg['dependencies'] -is [array] -and $pkg['dependencies'].Count -gt 0) {
            $lines += "    dependencies:"
            foreach ($dep in $pkg['dependencies']) { $lines += "      - $dep" }
        } else {
            $lines += "    dependencies: []"
        }

        $count++
    }

    $output = $lines -join "`n"
    [System.IO.File]::WriteAllText($RegistryFile, $output, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Registry generated: $count skills" -ForegroundColor Green
    exit 0
}

# ─────────────────────────────────────────────
# -Export: Package a skill for sharing
# ─────────────────────────────────────────────
if ($Export) {
    if (-not $SkillName) {
        Write-Host "Usage: .\tools\skill-package.ps1 -Export -SkillName <name>" -ForegroundColor Red
        exit 1
    }

    $skillDir = Join-Path $SkillsDir $SkillName
    if (-not (Test-Path $skillDir)) {
        Write-Host "Skill not found: $SkillName" -ForegroundColor Red
        exit 1
    }

    $skillFile = Join-Path $skillDir "SKILL.md"
    $pkg = Get-SkillPackage -SkillPath $skillFile

    $exportDir = Join-Path $RepoRoot "export\$SkillName"
    if (Test-Path $exportDir) {
        Remove-Item -Path $exportDir -Recurse -Force
    }
    New-Item -Path $exportDir -ItemType Directory -Force | Out-Null

    # Copy exports
    $exports = @("SKILL.md")
    if ($pkg.ContainsKey('exports') -and $pkg['exports'] -is [array]) {
        $exports = $pkg['exports']
    }
    foreach ($file in $exports) {
        $src = Join-Path $skillDir $file
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $exportDir $file)
        }
    }

    # Write manifest
    $manifest = @{
        name         = $SkillName
        version      = if ($pkg.ContainsKey('version')) { $pkg['version'] } else { "0.0.0" }
        compat       = if ($pkg.ContainsKey('compat')) { $pkg['compat'] } else { "dcr >= 2.0" }
        dependencies = if ($pkg.ContainsKey('dependencies')) { $pkg['dependencies'] } else { @() }
    }
    $manifestJson = $manifest | ConvertTo-Json -Depth 3
    [System.IO.File]::WriteAllText((Join-Path $exportDir "manifest.json"), $manifestJson, [System.Text.UTF8Encoding]::new($false))

    Write-Host "Exported: $exportDir" -ForegroundColor Green
    Write-Host "  Files: $($exports -join ', ')" -ForegroundColor DarkGray
    Write-Host "  Version: $($manifest.version)" -ForegroundColor DarkGray
    exit 0
}

# No action specified
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  .\tools\skill-package.ps1 -GenerateRegistry   # Rebuild .dcr/registry.yaml"
Write-Host "  .\tools\skill-package.ps1 -Export -SkillName X # Export skill to export/"
Write-Host "  .\tools\skill-package.ps1 -Check               # Validate package: fields"
