function Get-DcrRuleDescription {
    param(
        [string]$Path
    )

    $lines = Get-Content -Path $Path -Encoding utf8
    $inFrontmatter = $false
    $frontmatterStarted = $false

    for ($index = 0; $index -lt $lines.Count; $index++) {
        $line = $lines[$index]
        $trimmed = $line.Trim()
        if (-not $frontmatterStarted -and $trimmed -eq '---') {
            $frontmatterStarted = $true
            $inFrontmatter = $true
            continue
        }
        if ($inFrontmatter) {
            if ($trimmed -eq '---') {
                $inFrontmatter = $false
                continue
            }

            if ($trimmed -match '^description:\s*(.*)$') {
                $description = $Matches[1].Trim()
                if ($description) {
                    return $description.Trim([char]34, [char]39)
                }

                $descriptionLines = @()
                for ($nextIndex = $index + 1; $nextIndex -lt $lines.Count; $nextIndex++) {
                    $nextLine = $lines[$nextIndex]
                    if ($nextLine -notmatch '^\s+') {
                        break
                    }

                    $descriptionLines += $nextLine.Trim()
                    $index = $nextIndex
                }

                if ($descriptionLines.Count -gt 0) {
                    return (($descriptionLines -join ' ') -replace '\s+', ' ').Trim([char]34, [char]39)
                }
            }

            continue
        }
        if (-not $trimmed) {
            continue
        }
        if ($trimmed.StartsWith("#")) {
            continue
        }
        if ($trimmed.StartsWith('```')) {
            continue
        }
        return $trimmed.Replace([char]34, [char]39)
    }

    return [System.IO.Path]::GetFileNameWithoutExtension($Path)
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Remove-DcrLeadingFrontmatter {
    param(
        [string]$Content
    )

    if (-not $Content) {
        return $Content
    }

    # Strip only the first YAML frontmatter block at file start.
    if ($Content -match '(?s)^---\r?\n.*?\r?\n---\r?\n?') {
        return $Content.Substring($Matches[0].Length)
    }

    return $Content
}

function New-DcrCursorRulePackage {
    param(
        [string]$RulesSource,
        [string]$SkillsSource,
        [string]$KernelSource,
        [string]$OutputDir,
        [switch]$VerboseOutput
    )

    if (-not (Test-Path $RulesSource)) {
        throw "Source rules not found: $RulesSource"
    }

    if (-not (Test-Path $KernelSource)) {
        throw "Runtime kernel not found: $KernelSource"
    }

    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }

    $ruleFiles = Get-ChildItem -Path $RulesSource -File -Filter *.md |
        Where-Object { $_.BaseName -notlike "_*" } |
        Sort-Object Name
    foreach ($ruleFile in $ruleFiles) {
        $description = Get-DcrRuleDescription -Path $ruleFile.FullName
        $body = Get-Content -Path $ruleFile.FullName -Raw -Encoding utf8
        $body = Remove-DcrLeadingFrontmatter -Content $body
        $cursorContent = @(
            "---"
            "description: $description"
            'globs: ""'
            "alwaysApply: false"
            "---"
            ""
            $body.TrimEnd()
            ""
        ) -join "`r`n"

        $destination = Join-Path $OutputDir ($ruleFile.BaseName + ".mdc")
        Write-Utf8NoBom -Path $destination -Content $cursorContent
        if ($VerboseOutput) {
            Write-Host "  [OK] $($ruleFile.BaseName).mdc" -ForegroundColor Green
        }
    }

    if (Test-Path $SkillsSource) {
        $skillDirs = Get-ChildItem -Path $SkillsSource -Directory |
            Where-Object { $_.Name -notlike "_*" } |
            Sort-Object Name
        foreach ($skillDir in $skillDirs) {
            $skillFile = Join-Path $skillDir.FullName "SKILL.md"
            if (Test-Path $skillFile) {
                $description = Get-DcrRuleDescription -Path $skillFile
                $body = Get-Content -Path $skillFile -Raw -Encoding utf8
                $body = Remove-DcrLeadingFrontmatter -Content $body
                if (-not $body) { continue }
                $cursorContent = @(
                    "---"
                    "description: $description"
                    'globs: ""'
                    "alwaysApply: false"
                    "---"
                    ""
                    $body.TrimEnd()
                    ""
                ) -join "`r`n"

                $destination = Join-Path $OutputDir ("skill-" + $skillDir.Name + ".mdc")
                Write-Utf8NoBom -Path $destination -Content $cursorContent
                if ($VerboseOutput) {
                    Write-Host "  [OK] skill-$($skillDir.Name).mdc" -ForegroundColor Green
                }
            }
        }
    }

    Copy-Item -Path $KernelSource -Destination (Join-Path $OutputDir "dcr-kernel.md") -Force
    if ($VerboseOutput) {
        Write-Host "  [OK] dcr-kernel.md" -ForegroundColor Green
    }
}

function New-CursorRulePackage {
    param(
        [string]$RulesSource,
        [string]$SkillsSource,
        [string]$KernelSource,
        [string]$OutputDir,
        [switch]$VerboseOutput
    )

    New-DcrCursorRulePackage `
        -RulesSource $RulesSource `
        -SkillsSource $SkillsSource `
        -KernelSource $KernelSource `
        -OutputDir $OutputDir `
        -VerboseOutput:$VerboseOutput
}
