param(
    [string]$RepoRoot = ".",
    [string]$OutputRoot,
    [switch]$Quiet
)

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths
$DeprecatedAliases = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\deprecated-aliases.ps1"
. $DeprecatedAliases

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$commandsDir = Join-Path $RepoRoot ".claude\commands"
$runtimeKernel = Join-Path $RepoRoot ".ai\kernel\dcr-kernel.md"
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

function Test-Deprecated {
    param([string]$Path)

    $value = Get-FrontmatterField -Path $Path -Field "deprecated"
    return ($value -and $value.ToLowerInvariant() -eq "true")
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

function Get-WindsurfMcpJsonIssues {
    param(
        [string]$Path,
        [string]$ExpectedArg,
        [string]$Label
    )

    $issues = @()
    if (-not (Test-Path $Path)) {
        return @("[MISSING] $Label : $Path")
    }

    $raw = Get-Content -Path $Path -Raw -Encoding utf8
    try {
        $config = $raw | ConvertFrom-Json
    }
    catch {
        return @("[INVALID_JSON] $Label : $Path")
    }

    $serversProperty = $config.PSObject.Properties["mcpServers"]
    if (-not $serversProperty) {
        return @("[MISSING] $Label : mcpServers")
    }

    $entryProperty = $serversProperty.Value.PSObject.Properties["opencode-bridge"]
    if (-not $entryProperty) {
        return @("[MISSING] $Label : opencode-bridge")
    }

    $entry = $entryProperty.Value
    if ($entry.command -ne "python") {
        $issues += "[MODIFIED] $Label : opencode-bridge command must be python"
    }

    $args = @($entry.args)
    if ($args.Count -ne 1 -or $args[0] -ne $ExpectedArg) {
        $issues += "[MODIFIED] $Label : opencode-bridge args must be $ExpectedArg"
    }

    if ($raw -match '[A-Za-z]:[\\/]' -or $raw -match '\\Users\\') {
        $issues += "[LOCAL_PATH] $Label : template/generated repo config must not contain machine-local paths"
    }

    return @($issues)
}

function Get-WindsurfTemplateQualityIssues {
    $issues = @()

    $issues += Get-WindsurfMcpJsonIssues `
        -Path $templateMcpPath `
        -ExpectedArg "<REPO_ROOT>/tools/mcp-servers/opencode-bridge/server.py" `
        -Label "Windsurf MCP template"

    if (Test-Path $templateHooksPath) {
        try {
            Get-Content -Path $templateHooksPath -Raw -Encoding utf8 | ConvertFrom-Json | Out-Null
        }
        catch {
            $issues += "[INVALID_JSON] Windsurf hooks template : $templateHooksPath"
        }
    }

    if (Test-Path $templateWorkflowsDir) {
        $workflowTemplates = Get-ChildItem -Path $templateWorkflowsDir -File -Filter *.md
        foreach ($workflowTemplate in $workflowTemplates) {
            $content = Get-Content -Path $workflowTemplate.FullName -Raw -Encoding utf8
            if (-not $content.Trim()) {
                $issues += "[EMPTY] Windsurf workflow template : $($workflowTemplate.FullName)"
            }
        }
    }

    $templateRulesDir = Join-Path $templateRoot "rules"
    if (Test-Path $templateRulesDir) {
        $unusedRuleTemplates = Get-ChildItem -Path $templateRulesDir -File -Filter *.md -Recurse
        foreach ($unusedRuleTemplate in $unusedRuleTemplates) {
            $issues += "[UNUSED_TEMPLATE_RULE] Windsurf rules are generated from .ai/kernel and .ai/catalog/rules, not templates: $($unusedRuleTemplate.FullName)"
        }
    }

    return @($issues)
}

function Get-WindsurfGeneratedQualityIssues {
    param(
        [string]$OutputRoot,
        [System.Collections.Generic.List[string]]$ManagedFiles,
        [bool]$RequireDeprecatedAliases
    )

    $issues = @()
    $requiredFiles = @(
        "rules/dcr-kernel.md",
        "mcp_config.example.json",
        "mcp_config.json"
    )

    if ($RequireDeprecatedAliases) {
        $requiredFiles += "rules/deprecated-aliases.md"
    }

    foreach ($requiredFile in $requiredFiles) {
        if (-not ($ManagedFiles -contains $requiredFile)) {
            $issues += "[MISSING_MANAGED] Windsurf generated manifest missing $requiredFile"
        }
        if (-not (Test-Path (Join-Path $OutputRoot $requiredFile))) {
            $issues += "[MISSING_OUTPUT] Windsurf generated output missing $requiredFile"
        }
    }

    $uniqueManaged = @($ManagedFiles | Sort-Object -Unique)
    if ($uniqueManaged.Count -ne $ManagedFiles.Count) {
        $issues += "[DUPLICATE_MANAGED] Windsurf generated manifest contains duplicate entries"
    }

    foreach ($managedFile in $ManagedFiles) {
        $managedPath = Join-Path $OutputRoot $managedFile
        if (-not (Test-Path $managedPath)) {
            $issues += "[MISSING_OUTPUT] Windsurf managed file not written: $managedFile"
        }
    }

    $rulesDir = Join-Path $OutputRoot "rules"
    if (Test-Path $rulesDir) {
        $ruleOutputs = Get-ChildItem -Path $rulesDir -File -Filter *.md
        foreach ($ruleOutput in $ruleOutputs) {
            $content = Get-Content -Path $ruleOutput.FullName -Raw -Encoding utf8
            if ($content -notmatch '(?s)^---\r?\n.*?\r?\n---') {
                $issues += "[MISSING_FRONTMATTER] Windsurf rule missing frontmatter: $($ruleOutput.Name)"
            }
            if ($content -notmatch '(?m)^trigger:\s*(always_on|model_decision)\s*$') {
                $issues += "[MISSING_TRIGGER] Windsurf rule missing supported trigger: $($ruleOutput.Name)"
            }
            if ($content -notmatch '(?m)^description:\s*\S') {
                $issues += "[MISSING_DESCRIPTION] Windsurf rule missing description: $($ruleOutput.Name)"
            }
        }
    }

    $kernelPath = Join-Path $OutputRoot "rules/dcr-kernel.md"
    if ((Test-Path $kernelPath) -and ((Get-Content -Path $kernelPath -Raw -Encoding utf8) -notmatch '(?m)^trigger:\s*always_on\s*$')) {
        $issues += "[MODIFIED] Windsurf dcr-kernel.md must be always_on"
    }

    $expectedArg = "<REPO_ROOT>/tools/mcp-servers/opencode-bridge/server.py"
    $issues += Get-WindsurfMcpJsonIssues -Path (Join-Path $OutputRoot "mcp_config.example.json") -ExpectedArg $expectedArg -Label "Windsurf generated MCP example"
    $issues += Get-WindsurfMcpJsonIssues -Path (Join-Path $OutputRoot "mcp_config.json") -ExpectedArg $expectedArg -Label "Windsurf generated MCP config"

    return @($issues)
}

function Assert-WindsurfQuality {
    param(
        [string]$Label,
        [string[]]$Issues
    )

    if ($Issues.Count -eq 0) {
        Write-WindsurfStatus -Message "  [OK] $Label"
        return
    }

    $Issues | ForEach-Object { Write-WindsurfStatus -Message "  $_" -Color "Yellow" }
    throw "$Label failed."
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

function ConvertTo-StableJsonStringArray {
    param([string[]]$Items)

    $quoted = @($Items | Sort-Object -Unique | ForEach-Object { $_ | ConvertTo-Json -Compress })
    if ($quoted.Count -eq 0) {
        return "[]"
    }

    return "[`r`n  " + ($quoted -join ",`r`n  ") + "`r`n]"
}

Assert-WindsurfQuality -Label "Windsurf template quality" -Issues @(Get-WindsurfTemplateQualityIssues)

New-Item -ItemType Directory -Path $outRulesDir -Force | Out-Null
New-Item -ItemType Directory -Path $outWorkflowsDir -Force | Out-Null

$managedFiles = New-Object System.Collections.Generic.List[string]

# 1) Always-on kernel rule from shared runtime kernel.
# Shared thinking source of truth: .ai/book/
if (Test-Path $runtimeKernel) {
    $kernelRaw = Get-Content -Path $runtimeKernel -Raw -Encoding utf8
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
$deprecatedRules = New-Object System.Collections.Generic.List[object]
$deprecatedRuleNames = @{}
foreach ($ruleFile in $ruleFiles) {
    $targets = @(Get-Targets -Path $ruleFile.FullName)
    if ($targets.Count -eq 0) {
        $targets = @("vscode", "claude", "codex", "windsurf")
    }

    if (-not ($targets -contains "windsurf")) {
        continue
    }

    if (Test-Deprecated -Path $ruleFile.FullName) {
        $successor = Get-FrontmatterField -Path $ruleFile.FullName -Field "successor"
        $deprecatedRules.Add([pscustomobject]@{
            Name = $ruleFile.BaseName
            Successor = $successor
        })
        $deprecatedRuleNames[$ruleFile.BaseName] = $true
        Write-WindsurfStatus -Message "  [SKIP] rules/$($ruleFile.BaseName).md (deprecated -> $successor)" -Color "DarkGray"
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

foreach ($alias in @(Get-DcrDeprecatedAliases -RepoRoot $RepoRoot -Kind rule | Where-Object { $_.state -eq "removed" })) {
    if ($deprecatedRuleNames.ContainsKey($alias.name)) { continue }
    $deprecatedRules.Add([pscustomobject]@{
        Name = $alias.name
        Successor = $alias.successor
    })
    $deprecatedRuleNames[$alias.name] = $true
}

if ($deprecatedRules.Count -gt 0) {
    $aliasLines = @(
        "---"
        "trigger: model_decision"
        "description: Deprecated DCR rule aliases for Windsurf; route old names to successors"
        "---"
        ""
        "# Deprecated Rule Aliases"
        ""
        "When a user or document references a deprecated rule name, silently use the successor rule instead."
        ""
    )
    foreach ($rule in ($deprecatedRules | Sort-Object Name)) {
        $aliasLines += "- $($rule.Name) -> $($rule.Successor)"
    }
    $aliasLines += ""

    $aliasesPath = Join-Path $outRulesDir "deprecated-aliases.md"
    Write-Utf8NoBom -Path $aliasesPath -Content ($aliasLines -join "`r`n")
    Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "rules/deprecated-aliases.md"
    Write-WindsurfStatus -Message "  [OK] rules/deprecated-aliases.md"
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
    $mcpRaw = Get-Content -Path $templateMcpPath -Raw -Encoding utf8

    $mcpOutPath = Join-Path $outRoot "mcp_config.example.json"
    Write-Utf8NoBom -Path $mcpOutPath -Content ($mcpRaw.TrimEnd() + "`r`n")
    Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "mcp_config.example.json"
    Write-WindsurfStatus -Message "  [OK] mcp_config.example.json"

    $mcpConcreteOutPath = Join-Path $outRoot "mcp_config.json"
    Write-Utf8NoBom -Path $mcpConcreteOutPath -Content ($mcpRaw.TrimEnd() + "`r`n")
    Register-ManagedFile -ManagedFiles $managedFiles -RelativePath "mcp_config.json"
    Write-WindsurfStatus -Message "  [OK] mcp_config.json"
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

Write-Utf8NoBom -Path $manifestPath -Content (ConvertTo-StableJsonStringArray -Items @($managedFiles))
    Write-WindsurfStatus -Message "  [OK] .windsurf/.dcr-managed-files.json"
Assert-WindsurfQuality -Label "Windsurf generated quality" -Issues @(Get-WindsurfGeneratedQualityIssues -OutputRoot $outRoot -ManagedFiles $managedFiles -RequireDeprecatedAliases ($deprecatedRules.Count -gt 0))
Write-WindsurfStatus -Message "" -Color "Green"
