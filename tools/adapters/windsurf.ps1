param(
    [string]$RepoRoot = ".",
    [string]$OutputRoot,
    [switch]$Quiet
)

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$commandsDir = Join-Path $RepoRoot ".claude\commands"
$cursorKernel = Join-Path $RepoRoot ".cursor\rules\dcr-kernel.md"
$templateRoot = Join-Path $RepoRoot "templates\windsurf\.windsurf"
$templateWorkflowsDir = Join-Path $templateRoot "workflows"
$templateHooksPath = Join-Path $templateRoot "hooks.json"
$templateMcpPath = Join-Path $templateRoot "mcp_config.example.json"

$outRoot = if ($OutputRoot) { $OutputRoot } else { Join-Path $RepoRoot ".windsurf" }
$outRulesDir = Join-Path $outRoot "rules"
$outWorkflowsDir = Join-Path $outRoot "workflows"
$manifestPath = Join-Path $outRoot ".dcr-managed-files.json"

function Write-WindsurfStatus {
    param(
        [string]$Message,
        [string]$Color = "Green"
    )

    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

Write-WindsurfStatus -Message "[windsurf] Generating .windsurf/rules/*.md and .windsurf/workflows/*.md..." -Color "Cyan"

function Get-Targets {
    param([string]$Path)

    $text = Get-Content -Path $Path -Raw -Encoding utf8
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        return [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | ForEach-Object { $_.Groups[1].Value }
    }

    return @()
}

function Get-FrontmatterField {
    param(
        [string]$Path,
        [string]$Field
    )

    $text = Get-Content -Path $Path -Raw -Encoding utf8
    if ($text -match '(?s)^---\s*\n(.*?)\n---') {
        $frontmatter = $Matches[1]
        if ($frontmatter -match "(?m)^${Field}:\s*(.*)$") {
            return $Matches[1].Trim().Trim([char]34, [char]39)
        }
    }

    return $null
}

function Remove-LeadingFrontmatter {
    param([string]$Content)

    if (-not $Content) {
        return $Content
    }

    if ($Content -match '(?s)^---\r?\n.*?\r?\n---\r?\n?') {
        return $Content.Substring($Matches[0].Length)
    }

    return $Content
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Read-ManagedFiles {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return @()
    }

    try {
        $manifestContent = Get-Content -Path $Path -Raw -Encoding utf8 | ConvertFrom-Json
        return @($manifestContent) | ForEach-Object { "$_" }
    }
    catch {
        Write-Warning "Managed manifest is invalid and will be rebuilt: $Path"
        return @()
    }
}

function Register-ManagedFile {
    param(
        [System.Collections.Generic.List[string]]$ManagedFiles,
        [string]$RelativePath
    )

    $ManagedFiles.Add($RelativePath)
}

New-Item -ItemType Directory -Path $outRulesDir -Force | Out-Null
New-Item -ItemType Directory -Path $outWorkflowsDir -Force | Out-Null

$managedFiles = New-Object System.Collections.Generic.List[string]

# 1) Always-on kernel rule from existing cursor kernel
if (Test-Path $cursorKernel) {
    $kernelRaw = Get-Content -Path $cursorKernel -Raw -Encoding utf8
    $kernelBody = Remove-LeadingFrontmatter -Content $kernelRaw
    $kernelOut = @(
        "---"
        "trigger: always_on"
        "description: DCR kernel baseline for Windsurf Cascade"
        "---"
        ""
        $kernelBody.TrimEnd()
        ""
    ) -join "`r`n"

    $kernelPath = Join-Path $outRulesDir "dcr-kernel.md"
    Write-Utf8NoBom -Path $kernelPath -Content $kernelOut
    Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "rules/dcr-kernel.md"
    Write-WindsurfStatus -Message "  [OK] rules/dcr-kernel.md"
}

# 2) Catalog rules -> Windsurf rules (model_decision)
$ruleFiles = Get-ChildItem -Path $rulesDir -File -Filter *.md | Where-Object { -not $_.BaseName.StartsWith("_") } | Sort-Object Name
foreach ($ruleFile in $ruleFiles) {
    $targets = @(Get-Targets -Path $ruleFile.FullName)
    if ($targets.Count -eq 0) {
        $targets = @("vscode", "cursor", "claude", "codex", "windsurf")
    }

    if (-not ($targets -contains "windsurf")) {
        continue
    }

    $description = Get-FrontmatterField -Path $ruleFile.FullName -Field "description"
    if (-not $description) {
        $description = $ruleFile.BaseName
    }

    $bodyRaw = Get-Content -Path $ruleFile.FullName -Raw -Encoding utf8
    $body = Remove-LeadingFrontmatter -Content $bodyRaw
    if (-not $body) {
        continue
    }

    $content = @(
        "---"
        "trigger: model_decision"
        "description: $description"
        "---"
        ""
        $body.TrimEnd()
        ""
    ) -join "`r`n"

    $destName = "$($ruleFile.BaseName).md"
    $destPath = Join-Path $outRulesDir $destName
    Write-Utf8NoBom -Path $destPath -Content $content
    Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "rules/$destName"
    Write-WindsurfStatus -Message "  [OK] rules/$destName"
}

# 3) Claude commands -> Windsurf workflows
if (Test-Path $commandsDir) {
    $commandFiles = Get-ChildItem -Path $commandsDir -File -Filter *.md | Sort-Object Name
    foreach ($commandFile in $commandFiles) {
        $raw = Get-Content -Path $commandFile.FullName -Raw -Encoding utf8
        if (-not $raw) {
            continue
        }

        $workflowName = $commandFile.BaseName
        $workflowBody = $raw.TrimEnd()
        $workflowOutPath = Join-Path $outWorkflowsDir ("$workflowName.md")
        Write-Utf8NoBom -Path $workflowOutPath -Content ($workflowBody + "`r`n")
        Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "workflows/$workflowName.md"
        Write-WindsurfStatus -Message "  [OK] workflows/$workflowName.md"
    }
}

# 4) Template workflows -> Windsurf workflows
if (Test-Path $templateWorkflowsDir) {
    $templateWorkflowFiles = Get-ChildItem -Path $templateWorkflowsDir -File -Filter *.md | Sort-Object Name
    foreach ($templateWorkflowFile in $templateWorkflowFiles) {
        $raw = Get-Content -Path $templateWorkflowFile.FullName -Raw -Encoding utf8
        if (-not $raw) {
            continue
        }

        $workflowName = $templateWorkflowFile.BaseName
        $workflowOutPath = Join-Path $outWorkflowsDir ("$workflowName.md")
        Write-Utf8NoBom -Path $workflowOutPath -Content ($raw.TrimEnd() + "`r`n")
        Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "workflows/$workflowName.md"
        Write-WindsurfStatus -Message "  [OK] workflows/$workflowName.md (template)"
    }
}

# 5) Standard Windsurf config templates (hooks + mcp)
if (Test-Path $templateHooksPath) {
    $hooksOutPath = Join-Path $outRoot "hooks.json"
    $hooksRaw = Get-Content -Path $templateHooksPath -Raw -Encoding utf8
    Write-Utf8NoBom -Path $hooksOutPath -Content ($hooksRaw.TrimEnd() + "`r`n")
    Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "hooks.json"
    Write-WindsurfStatus -Message "  [OK] hooks.json"
}

if (Test-Path $templateMcpPath) {
    $mcpOutPath = Join-Path $outRoot "mcp_config.example.json"
    $mcpRaw = Get-Content -Path $templateMcpPath -Raw -Encoding utf8
    Write-Utf8NoBom -Path $mcpOutPath -Content ($mcpRaw.TrimEnd() + "`r`n")
    Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "mcp_config.example.json"
    Write-WindsurfStatus -Message "  [OK] mcp_config.example.json"
}

# 6) Cleanup stale generated files
$previous = @(Read-ManagedFiles -Path $manifestPath)
$currentSet = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($item in $managedFiles) {
    [void]$currentSet.Add($item)
}

foreach ($old in $previous) {
    $oldPath = Join-Path $outRoot $old
    if (-not $currentSet.Contains($old) -and (Test-Path $oldPath)) {
        Remove-Item -Path $oldPath -Force
        Write-WindsurfStatus -Message "  [REMOVE] $old" -Color "DarkYellow"
    }
}

Write-Utf8NoBom -Path $manifestPath -Content ((@($managedFiles) | Sort-Object -Unique | ConvertTo-Json -Depth 3))
    Write-WindsurfStatus -Message "  [OK] .windsurf/.dcr-managed-files.json"
Write-WindsurfStatus -Message "" -Color "Green"
