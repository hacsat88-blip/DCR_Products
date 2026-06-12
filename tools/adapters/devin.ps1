param(
    [string]$RepoRoot = ".",
    [string]$OutputRoot,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$agentsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"
$commandsDir = Join-Path $RepoRoot ".claude\commands"

$devinRoot = if ($OutputRoot) { $OutputRoot } else { Join-Path $RepoRoot ".devin" }
$windsurfRoot = if ($OutputRoot) { Join-Path (Split-Path $OutputRoot -Parent) ".windsurf" } else { Join-Path $RepoRoot ".windsurf" }

function Write-DevinStatus {
    param(
        [string]$Message,
        [string]$Color = "Green"
    )

    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $parent = Split-Path $Path -Parent
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Get-RelativePath {
    param(
        [string]$Root,
        [string]$Path
    )

    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $pathFull = [System.IO.Path]::GetFullPath($Path)
    return $pathFull.Substring($rootFull.Length + 1).Replace('\', '/')
}

function Remove-LeadingFrontmatter {
    param([string]$Content)

    if (-not $Content) { return $Content }
    if ($Content -match '(?s)^---\r?\n.*?\r?\n---\r?\n?') {
        return $Content.Substring($Matches[0].Length)
    }

    return $Content
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

function Get-TomlStringField {
    param(
        [string]$Path,
        [string]$Field
    )

    $text = Get-Content -Path $Path -Raw -Encoding utf8
    if ($text -match "(?m)^$Field\s*=\s*`"([^`"]+)`"") {
        return $Matches[1]
    }

    return $null
}

function New-SkillFrontmatter {
    param(
        [string]$Name,
        [string]$Description,
        [string]$Body
    )

    $safeDescription = $Description.Replace("`r", " ").Replace("`n", " ").Trim()
    return @(
        "---"
        "name: $Name"
        "description: $safeDescription"
        "---"
        ""
        $Body.TrimEnd()
        ""
    ) -join "`r`n"
}

function Copy-Tree {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (-not (Test-Path $Source)) { return }
    if (Test-Path $Destination) {
        Remove-Item -LiteralPath $Destination -Recurse -Force
    }
    New-Item -ItemType Directory -Path (Split-Path $Destination -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
    Normalize-GeneratedTextTree -Root $Destination
}

function Normalize-GeneratedTextTree {
    param([string]$Root)

    if (-not (Test-Path $Root)) { return }

    $textExtensions = @(
        ".css", ".html", ".js", ".json", ".md", ".ps1", ".py", ".sh",
        ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml"
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    Get-ChildItem -Path $Root -Recurse -File -Force |
        Where-Object { $_.Extension.ToLowerInvariant() -in $textExtensions } |
        ForEach-Object {
            $content = [System.IO.File]::ReadAllText($_.FullName)
            $normalized = $content -replace '[ \t]+(\r?\n)', '$1'
            $normalized = $normalized -replace '[ \t]+\z', ''
            if ($normalized -ne $content) {
                [System.IO.File]::WriteAllText($_.FullName, $normalized, $utf8NoBom)
            }
        }
}

function Read-ManagedFiles {
    param([string]$Path)

    if (-not (Test-Path $Path)) { return @() }
    try {
        return @(Get-Content -Path $Path -Raw -Encoding utf8 | ConvertFrom-Json) | ForEach-Object { "$_" }
    }
    catch {
        Write-Warning "Managed manifest is invalid and will be rebuilt: $Path"
        return @()
    }
}

function Remove-StaleManagedFiles {
    param(
        [string]$Root,
        [string[]]$Previous,
        [string[]]$Current
    )

    if (-not (Test-Path $Root)) { return }

    $rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\', '/')
    $currentSet = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($item in $Current) { [void]$currentSet.Add($item) }

    foreach ($old in $Previous) {
        if ($currentSet.Contains($old)) { continue }
        $oldPath = Join-Path $Root $old
        if (-not (Test-Path $oldPath)) { continue }

        $resolvedOld = (Resolve-Path -LiteralPath $oldPath).Path
        if (-not $resolvedOld.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove path outside Devin deploy target: $resolvedOld"
        }

        Remove-Item -LiteralPath $resolvedOld -Recurse -Force
        Write-DevinStatus -Message "  [REMOVE] $old" -Color "DarkYellow"
    }
}

function Remove-DevinLegacyRoots {
    param([string]$Root)

    if (-not (Test-Path $Root)) { return }

    $rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\', '/')
    foreach ($relativeRoot in @("rules", "workflows")) {
        $legacyPath = Join-Path $Root $relativeRoot
        if (-not (Test-Path $legacyPath)) { continue }

        $resolvedLegacy = (Resolve-Path -LiteralPath $legacyPath).Path
        if (-not $resolvedLegacy.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove path outside Devin deploy target: $resolvedLegacy"
        }

        Remove-Item -LiteralPath $resolvedLegacy -Recurse -Force
        Write-DevinStatus -Message "  [REMOVE] legacy $relativeRoot" -Color "DarkYellow"
    }
}

function Get-ManagedFiles {
    param([string]$Root)

    if (-not (Test-Path $Root)) { return @() }
    return @(Get-ChildItem -Path $Root -Recurse -File -Force |
        Where-Object { $_.Name -notin @(".dcr-managed-files.json", "config.local.json") } |
        ForEach-Object { Get-RelativePath -Root $Root -Path $_.FullName } |
        Sort-Object -Unique)
}

function New-DevinConfig {
    $config = [ordered]@{
        mcpServers = [ordered]@{}
        read_config_from = [ordered]@{
            cursor = $true
            windsurf = $true
            claude = $true
        }
        permissions = [ordered]@{
            allow = @()
            ask = @("mcp__*")
            deny = @()
        }
    }

    return ($config | ConvertTo-Json -Depth 10)
}

function New-EmptyMcpConfig {
    $config = [ordered]@{
        mcpServers = [ordered]@{}
    }

    return ($config | ConvertTo-Json -Depth 10)
}

function New-WindsurfRule {
    param(
        [string]$Name,
        [string]$Description,
        [string]$SourcePath,
        [string]$Trigger = "model_decision"
    )

    $safeDescription = $Description.Replace("`r", " ").Replace("`n", " ").Trim()
    return @(
        "---"
        "trigger: $Trigger"
        "description: $safeDescription"
        "---"
        ""
        "# $Name"
        ""
        "Generated compatibility rule for Devin Desktop / legacy Cascade."
        ""
        "Source of truth: `$SourcePath`."
        ""
        "Before applying this rule, read the source file and follow the current `.ai/` policy. Do not edit this generated mirror directly."
        ""
    ) -join "`r`n"
}

Write-DevinStatus -Message "[devin] Generating .devin canonical mirror and .windsurf compatibility mirror..." -Color "Cyan"

$devinManifest = Join-Path $devinRoot ".dcr-managed-files.json"
$windsurfManifest = Join-Path $windsurfRoot ".dcr-managed-files.json"
$previousDevin = @(Read-ManagedFiles -Path $devinManifest)
$previousWindsurf = @(Read-ManagedFiles -Path $windsurfManifest)

New-Item -ItemType Directory -Path $devinRoot -Force | Out-Null
New-Item -ItemType Directory -Path $windsurfRoot -Force | Out-Null

# Devin Local now uses skills as the canonical surface. Legacy Cascade rules and
# workflows are generated only in the .windsurf compatibility mirror.
Remove-DevinLegacyRoots -Root $devinRoot

Write-Utf8NoBom -Path (Join-Path $devinRoot "config.json") -Content ((New-DevinConfig).TrimEnd() + "`r`n")
Write-DevinStatus -Message "  [OK] .devin/config.json"

$emptyMcpConfig = (New-EmptyMcpConfig).TrimEnd() + "`r`n"
Write-Utf8NoBom -Path (Join-Path $windsurfRoot "mcp_config.example.json") -Content $emptyMcpConfig
Write-Utf8NoBom -Path (Join-Path $windsurfRoot "mcp_config.json") -Content $emptyMcpConfig
Write-DevinStatus -Message "  [OK] .windsurf/mcp_config*.json"

# Project skills: copy the full skill directory so scripts/references/assets stay usable.
$devinSkillsRoot = Join-Path $devinRoot "skills"
$windsurfSkillsRoot = Join-Path $windsurfRoot "skills"
New-Item -ItemType Directory -Path $devinSkillsRoot, $windsurfSkillsRoot -Force | Out-Null

$skillDirs = Get-ChildItem -Path $skillsDir -Directory | Where-Object { $_.Name -notlike "_*" } | Sort-Object Name
foreach ($skillDir in $skillDirs) {
    $devinSkillDest = Join-Path $devinSkillsRoot $skillDir.Name
    $windsurfSkillDest = Join-Path $windsurfSkillsRoot $skillDir.Name
    Copy-Tree -Source $skillDir.FullName -Destination $devinSkillDest
    Copy-Tree -Source $skillDir.FullName -Destination $windsurfSkillDest
}
Write-DevinStatus -Message "  [OK] mirrored $($skillDirs.Count) catalog skills"

# Claude command workflows become Devin skills because Devin Local does not support Cascade workflows.
if (Test-Path $commandsDir) {
    $commandFiles = Get-ChildItem -Path $commandsDir -File -Filter *.md | Sort-Object Name
    foreach ($commandFile in $commandFiles) {
        $workflowName = "workflow-$($commandFile.BaseName)"
        $raw = Get-Content -Path $commandFile.FullName -Raw -Encoding utf8
        $relativeCommandPath = $commandFile.FullName.Replace($RepoRoot + '\', '')
        $body = @(
            "# $workflowName"
            ""
            "This Devin skill mirrors the legacy workflow from ``$relativeCommandPath``."
            ""
            $raw.TrimEnd()
            ""
        ) -join "`r`n"
        $skillContent = New-SkillFrontmatter -Name $workflowName -Description "Run the $($commandFile.BaseName) workflow from Devin CLI or Devin Local." -Body $body

        Write-Utf8NoBom -Path (Join-Path $devinSkillsRoot "$workflowName\SKILL.md") -Content $skillContent
        Write-Utf8NoBom -Path (Join-Path $windsurfSkillsRoot "$workflowName\SKILL.md") -Content $skillContent
    }
    Write-DevinStatus -Message "  [OK] converted $($commandFiles.Count) workflows to Devin skills"
}

# Agents are exposed as model-invoked Devin skills.
$agentFiles = @()
if (Test-Path $agentsDir) {
    $agentFiles = Get-ChildItem -Path $agentsDir -File -Filter *.md |
        Where-Object { $_.BaseName -ne "README" } |
        Sort-Object Name
}

foreach ($agentFile in $agentFiles) {
    $agentName = $agentFile.BaseName
    $skillName = "agent-$agentName"
    $description = Get-FrontmatterField -Path $agentFile.FullName -Field "description"
    if (-not $description) {
        $tomlPath = Join-Path $agentsDir "$agentName.toml"
        if (Test-Path $tomlPath) {
            $description = Get-TomlStringField -Path $tomlPath -Field "description"
        }
    }
    if (-not $description) { $description = "Use the $agentName agent perspective in Devin." }

    $raw = Get-Content -Path $agentFile.FullName -Raw -Encoding utf8
    $body = @(
        "# $skillName"
        ""
        "Use this skill when the task would benefit from the $agentName agent perspective."
        ""
        "Source of truth: `.ai/catalog/agents-source/$($agentFile.Name)`."
        ""
        (Remove-LeadingFrontmatter -Content $raw).TrimEnd()
        ""
    ) -join "`r`n"
    $skillContent = New-SkillFrontmatter -Name $skillName -Description $description -Body $body

    Write-Utf8NoBom -Path (Join-Path $devinSkillsRoot "$skillName\SKILL.md") -Content $skillContent
    Write-Utf8NoBom -Path (Join-Path $windsurfSkillsRoot "$skillName\SKILL.md") -Content $skillContent
}
Write-DevinStatus -Message "  [OK] converted $($agentFiles.Count) agents to Devin skills"

# Windsurf compatibility: concise rules and legacy Cascade workflows.
$windsurfRulesRoot = Join-Path $windsurfRoot "rules"
$windsurfWorkflowsRoot = Join-Path $windsurfRoot "workflows"
New-Item -ItemType Directory -Path $windsurfRulesRoot, $windsurfWorkflowsRoot -Force | Out-Null

$kernelRule = @(
    "---"
    "trigger: always_on"
    "description: DCR kernel baseline for Devin Desktop legacy Cascade compatibility"
    "---"
    ""
    "# DCR Kernel Compatibility Entrypoint"
    ""
    "This is a generated compatibility rule for Devin Desktop / legacy Cascade."
    ""
    "Canonical always-on instructions live in `AGENTS.md`. Shared runtime policy lives in `.ai/book/` and `.ai/kernel/`."
    ""
    "Use `.ai/*` as the source of truth. Do not edit `.windsurf/` directly."
    ""
) -join "`r`n"
Write-Utf8NoBom -Path (Join-Path $windsurfRulesRoot "dcr-kernel.md") -Content $kernelRule

$ruleFiles = Get-ChildItem -Path $rulesDir -File -Filter *.md |
    Where-Object { $_.BaseName -notlike "_*" } |
    Sort-Object Name

foreach ($ruleFile in $ruleFiles) {
    $description = Get-FrontmatterField -Path $ruleFile.FullName -Field "description"
    if (-not $description) { $description = $ruleFile.BaseName }
    $content = New-WindsurfRule -Name $ruleFile.BaseName -Description $description -SourcePath ".ai/catalog/rules/$($ruleFile.Name)"
    Write-Utf8NoBom -Path (Join-Path $windsurfRulesRoot $ruleFile.Name) -Content $content
}

$deprecatedRule = @(
    "---"
    "trigger: model_decision"
    "description: Deprecated DCR aliases for Devin Desktop legacy Cascade compatibility"
    "---"
    ""
    "# Deprecated Aliases"
    ""
    "Deprecated alias routing is generated from `.ai/catalog/_deprecated-aliases.json` and resolved by the shared DCR router."
    ""
    "Read `.ai/module/deprecation-lifecycle.md` before restoring or invoking removed aliases."
    ""
) -join "`r`n"
Write-Utf8NoBom -Path (Join-Path $windsurfRulesRoot "deprecated-aliases.md") -Content $deprecatedRule
Write-DevinStatus -Message "  [OK] generated $($ruleFiles.Count + 2) Windsurf compatibility rules"

if (Test-Path $commandsDir) {
    $commandFiles = Get-ChildItem -Path $commandsDir -File -Filter *.md | Sort-Object Name
    foreach ($commandFile in $commandFiles) {
        $raw = Get-Content -Path $commandFile.FullName -Raw -Encoding utf8
        Write-Utf8NoBom -Path (Join-Path $windsurfWorkflowsRoot $commandFile.Name) -Content ($raw.TrimEnd() + "`r`n")
    }
    Write-DevinStatus -Message "  [OK] generated $($commandFiles.Count) legacy Windsurf workflows"
}

$devinCurrent = @(Get-ManagedFiles -Root $devinRoot)
$windsurfCurrent = @(Get-ManagedFiles -Root $windsurfRoot)
Remove-StaleManagedFiles -Root $devinRoot -Previous $previousDevin -Current $devinCurrent
Remove-StaleManagedFiles -Root $windsurfRoot -Previous $previousWindsurf -Current $windsurfCurrent

$devinCurrent = @(Get-ManagedFiles -Root $devinRoot)
$windsurfCurrent = @(Get-ManagedFiles -Root $windsurfRoot)
Write-Utf8NoBom -Path $devinManifest -Content (($devinCurrent | ConvertTo-Json -Depth 3) + "`r`n")
Write-Utf8NoBom -Path $windsurfManifest -Content (($windsurfCurrent | ConvertTo-Json -Depth 3) + "`r`n")

Write-DevinStatus -Message "  [OK] .devin/.dcr-managed-files.json"
Write-DevinStatus -Message "  [OK] .windsurf/.dcr-managed-files.json"
Write-DevinStatus -Message ""
