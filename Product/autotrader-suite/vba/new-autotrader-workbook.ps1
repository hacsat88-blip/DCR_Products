<#
.SYNOPSIS
  AutoTrader VBA runtime workbook scaffold を作成する

.DESCRIPTION
  repo root の autotrader.xlsm を生成し、Control / Market / OHLC_Data / Log を初期化する。
  既定では Product/autotrader-suite/vba/src の VBA text source も import し、ThisWorkbook を同期する。
  Excel の「VBA プロジェクト オブジェクト モデルへのアクセスを信頼する」が無効な場合は、
  workbook scaffold の保存までは行い、VBA import だけ warning として通知する。

.PARAMETER WorkbookPath
  生成先 workbook path。既定値は repo root の autotrader.xlsm。

.PARAMETER Force
  既存の workbook を上書きする。

.PARAMETER SkipVbaImport
  シート scaffold のみを作成し、VBA import を行わない。

.PARAMETER UseRssFormulas
    MarketSpeed II RSS が使える環境向けに、Market!B2:G2 を live RssMarket formula で初期化する。
    指定しない場合は manual smoke 用の安全な初期値を入れる。

.PARAMETER Visible
  Excel を可視化して生成する。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Product\autotrader-suite\vba\new-autotrader-workbook.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Product\autotrader-suite\vba\new-autotrader-workbook.ps1 -Force -Visible
#>

[CmdletBinding()]
param(
    [string]$WorkbookPath,
    [switch]$Force,
    [switch]$SkipVbaImport,
    [switch]$UseRssFormulas,
    [switch]$Visible
)

$ErrorActionPreference = "Stop"

$SourceDir = Join-Path $PSScriptRoot "src"

function Resolve-RepoRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartPath
    )

    $resolvedStartPath = (Resolve-Path $StartPath).Path
    $current = Get-Item -LiteralPath $resolvedStartPath

    while ($null -ne $current) {
        $hasDeployScript = Test-Path (Join-Path $current.FullName "deploy.ps1")
        $hasProductDir = Test-Path (Join-Path $current.FullName "Product")
        $hasDocsDir = Test-Path (Join-Path $current.FullName "docs")

        if ($hasDeployScript -and $hasProductDir -and $hasDocsDir) {
            return $current.FullName
        }

        $current = $current.Parent
    }

    throw "Repository root could not be resolved from: $StartPath"
}

$RepoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot

if (-not $WorkbookPath) {
    $WorkbookPath = Join-Path $RepoRoot "autotrader.xlsm"
}

$WorkbookPath = [System.IO.Path]::GetFullPath($WorkbookPath)

if (-not (Test-Path $SourceDir)) {
    throw "VBA source directory not found: $SourceDir"
}

$ModulePaths = @(
    Join-Path $SourceDir "modConfig.bas"
    Join-Path $SourceDir "modOHLC.bas"
    Join-Path $SourceDir "modHTTP.bas"
    Join-Path $SourceDir "modOrder.bas"
    Join-Path $SourceDir "modTimer.bas"
)
$ThisWorkbookPath = Join-Path $SourceDir "ThisWorkbook.cls"

foreach ($path in $ModulePaths + $ThisWorkbookPath) {
    if (-not (Test-Path $path)) {
        throw "Required VBA source file not found: $path"
    }
}

function Set-CellValue {
    param(
        [Parameter(Mandatory = $true)]
        $Worksheet,
        [Parameter(Mandatory = $true)]
        [string]$Address,
        [AllowNull()][object]$Value,
        [bool]$UseFormula = $false
    )

    if ($UseFormula) {
        $Worksheet.Range($Address).Formula = $Value
        return
    }

    $Worksheet.Range($Address).Value2 = $Value
}

function Format-HeaderRow {
    param(
        [Parameter(Mandatory = $true)]
        $Worksheet,
        [Parameter(Mandatory = $true)]
        [string]$RangeAddress
    )

    $range = $Worksheet.Range($RangeAddress)
    $range.Font.Bold = $true
    $range.Interior.ColorIndex = 15
}

function Get-VbaComponent {
    param(
        [Parameter(Mandatory = $true)]
        $VbProject,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    foreach ($component in $VbProject.VBComponents) {
        if ($component.Name -eq $Name) {
            return $component
        }
    }

    return $null
}

function Remove-VbaComponentIfExists {
    param(
        [Parameter(Mandatory = $true)]
        $VbProject,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $component = Get-VbaComponent -VbProject $VbProject -Name $Name
    if ($null -ne $component) {
        $VbProject.VBComponents.Remove($component) | Out-Null
    }
}

function Get-DocumentModuleCode {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $lines = Get-Content -Path $Path -Encoding UTF8
    $optionExplicitIndex = -1
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match '^\s*Option\s+Explicit\b') {
            $optionExplicitIndex = $index
            break
        }
    }

    if ($optionExplicitIndex -ge 0) {
        $filteredLines = $lines[$optionExplicitIndex..($lines.Count - 1)]
    }
    else {
        $filteredLines = foreach ($line in $lines) {
            if ($line -match '^\s*(VERSION\s|BEGIN$|END$|Attribute\s|MultiUse\s*=)') {
                continue
            }

            $line
        }
    }

    return (($filteredLines -join "`r`n").Trim() + "`r`n")
}

function Get-ModuleCode {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $lines = Get-Content -Path $Path -Encoding UTF8
    $filteredLines = foreach ($line in $lines) {
        if ($line -match '^\s*Attribute\s+') {
            continue
        }

        $line
    }

    return (($filteredLines -join "`r`n").Trim() + "`r`n")
}

function Import-StandardModuleFromUtf8 {
    param(
        [Parameter(Mandatory = $true)]
        $VbProject,
        [Parameter(Mandatory = $true)]
        [string]$ModulePath
    )

    $moduleName = [System.IO.Path]::GetFileNameWithoutExtension($ModulePath)
    Remove-VbaComponentIfExists -VbProject $VbProject -Name $moduleName

    $component = $VbProject.VBComponents.Add(1)
    $component.Name = $moduleName

    $moduleCode = Get-ModuleCode -Path $ModulePath
    $codeModule = $component.CodeModule
    if ($codeModule.CountOfLines -gt 0) {
        $codeModule.DeleteLines(1, $codeModule.CountOfLines)
    }
    $codeModule.AddFromString($moduleCode)
}

function Import-VbaSources {
    param(
        [Parameter(Mandatory = $true)]
        $Workbook
    )

    $vbProject = $Workbook.VBProject

    foreach ($modulePath in $ModulePaths) {
        Import-StandardModuleFromUtf8 -VbProject $vbProject -ModulePath $modulePath
    }

    $thisWorkbookComponent = Get-VbaComponent -VbProject $vbProject -Name "ThisWorkbook"
    if ($null -eq $thisWorkbookComponent) {
        throw "ThisWorkbook component was not found in workbook VBProject."
    }

    $documentCode = Get-DocumentModuleCode -Path $ThisWorkbookPath
    $codeModule = $thisWorkbookComponent.CodeModule
    if ($codeModule.CountOfLines -gt 0) {
        $codeModule.DeleteLines(1, $codeModule.CountOfLines)
    }
    $codeModule.AddFromString($documentCode)
}

function Set-WorkbookLayout {
    param(
        [Parameter(Mandatory = $true)]
        $Workbook
    )

    $desiredSheetNames = @("Control", "Market", "OHLC_Data", "Log", "BrokerBridge")

    while ($Workbook.Worksheets.Count -lt $desiredSheetNames.Count) {
        $null = $Workbook.Worksheets.Add()
    }

    for ($index = 1; $index -le $desiredSheetNames.Count; $index++) {
        $Workbook.Worksheets.Item($index).Name = $desiredSheetNames[$index - 1]
    }

    while ($Workbook.Worksheets.Count -gt $desiredSheetNames.Count) {
        $Workbook.Worksheets.Item($Workbook.Worksheets.Count).Delete() | Out-Null
    }

    $controlSheet = $Workbook.Worksheets.Item("Control")
    $marketSheet = $Workbook.Worksheets.Item("Market")
    $ohlcSheet = $Workbook.Worksheets.Item("OHLC_Data")
    $logSheet = $Workbook.Worksheets.Item("Log")
    $bridgeSheet = $Workbook.Worksheets.Item("BrokerBridge")

    $controlSheet.Cells.Clear() | Out-Null
    $marketSheet.Cells.Clear() | Out-Null
    $ohlcSheet.Cells.Clear() | Out-Null
    $logSheet.Cells.Clear() | Out-Null
    $bridgeSheet.Cells.Clear() | Out-Null

    $controlValues = @(
        @{ Address = "A1"; Value = "Server URL" }
        @{ Address = "B1"; Value = "http://127.0.0.1:8000" }
        @{ Address = "A2"; Value = "Poll Interval (sec)" }
        @{ Address = "B2"; Value = "5" }
        @{ Address = "A3"; Value = "Status" }
        @{ Address = "B3"; Value = "STOPPED" }
        @{ Address = "A4"; Value = "Market Symbol" }
        @{ Address = "B4"; Value = "=Market!A2"; Formula = $true }
        @{ Address = "A5"; Value = "Reference Status" }
        @{ Address = "B5"; Value = "missing" }
        @{ Address = "A6"; Value = "Reference As Of" }
        @{ Address = "B6"; Value = "-" }
        @{ Address = "A7"; Value = "Warning" }
        @{ Address = "B7"; Value = "" }
        @{ Address = "A8"; Value = "News Halt" }
        @{ Address = "B8"; Value = "FALSE" }
        @{ Address = "A9"; Value = "News Note" }
        @{ Address = "B9"; Value = "" }
        @{ Address = "A10"; Value = "Run Mode" }
        @{ Address = "B10"; Value = "paper" }
        @{ Address = "A11"; Value = "Order Mode" }
        @{ Address = "B11"; Value = "stub only" }
        @{ Address = "A12"; Value = "Auto Start" }
        @{ Address = "B12"; Value = "FALSE" }
        @{ Address = "A13"; Value = "Last Tick At" }
        @{ Address = "B13"; Value = "-" }
        @{ Address = "A14"; Value = "Last Action" }
        @{ Address = "B14"; Value = "hold" }
        @{ Address = "A15"; Value = "Last Error" }
        @{ Address = "B15"; Value = "-" }
        @{ Address = "A16"; Value = "Live Armed" }
        @{ Address = "B16"; Value = "FALSE" }
        @{ Address = "A17"; Value = "Order Confirm Timeout (sec)" }
        @{ Address = "B17"; Value = "5" }
        @{ Address = "A18"; Value = "Broker Preflight" }
        @{ Address = "B18"; Value = "not checked" }
        @{ Address = "A19"; Value = "Broker Cash Actual" }
        @{ Address = "B19"; Value = "-" }
        @{ Address = "A20"; Value = "Broker Checked At" }
        @{ Address = "B20"; Value = "-" }
        @{ Address = "A21"; Value = "Broker Message" }
        @{ Address = "B21"; Value = "-" }
    )

    foreach ($entry in $controlValues) {
        $address = [string]$entry["Address"]
        $cellValue = $entry["Value"]
        $useFormula = [bool]$entry["Formula"]
        Set-CellValue -Worksheet $controlSheet -Address $address -Value $cellValue -UseFormula $useFormula
    }

    $marketValues = @(
        @{ Address = "A1"; Value = "Code" }
        @{ Address = "B1"; Value = "Price" }
        @{ Address = "C1"; Value = "Volume" }
        @{ Address = "D1"; Value = "Date" }
        @{ Address = "E1"; Value = "Time" }
        @{ Address = "F1"; Value = "Bid" }
        @{ Address = "G1"; Value = "Ask" }
        @{ Address = "A2"; Value = "7203" }
    )

    if ($UseRssFormulas) {
        $marketValues += @(
            @{ Address = "B2"; Value = "=RssMarket(A2&"".T"",""現在値"")"; Formula = $true }
            @{ Address = "C2"; Value = "=RssMarket(A2&"".T"",""出来高"")"; Formula = $true }
            @{ Address = "D2"; Value = "=RssMarket(A2&"".T"",""現在日付"")"; Formula = $true }
            @{ Address = "E2"; Value = "=RssMarket(A2&"".T"",""現在値時刻"")"; Formula = $true }
            @{ Address = "F2"; Value = "=RssMarket(A2&"".T"",""最良買気配値"")"; Formula = $true }
            @{ Address = "G2"; Value = "=RssMarket(A2&"".T"",""最良売気配値"")"; Formula = $true }
        )
    }
    else {
        $marketValues += @(
            @{ Address = "B2"; Value = "2500" }
            @{ Address = "C2"; Value = "100000" }
            @{ Address = "D2"; Value = "=TODAY()"; Formula = $true }
            @{ Address = "E2"; Value = "=NOW()"; Formula = $true }
            @{ Address = "F2"; Value = "" }
            @{ Address = "G2"; Value = "" }
        )
    }

    foreach ($entry in $marketValues) {
        $address = [string]$entry["Address"]
        $cellValue = $entry["Value"]
        $useFormula = [bool]$entry["Formula"]
        Set-CellValue -Worksheet $marketSheet -Address $address -Value $cellValue -UseFormula $useFormula
    }

    $ohlcHeaders = @("bar_time", "open", "high", "low", "close", "volume")
    for ($index = 0; $index -lt $ohlcHeaders.Count; $index++) {
        Set-CellValue -Worksheet $ohlcSheet -Address ([char](65 + $index) + "1") -Value $ohlcHeaders[$index]
    }

    $logHeaders = @(
        "timestamp",
        "code",
        "price",
        "action",
        "qty",
        "reason",
        "reference_status",
        "reference_price",
        "reference_as_of",
        "reference_gap_pct",
        "warning_code",
        "warning_message"
    )
    for ($index = 0; $index -lt $logHeaders.Count; $index++) {
        Set-CellValue -Worksheet $logSheet -Address ([char](65 + $index) + "1") -Value $logHeaders[$index]
    }

    Format-HeaderRow -Worksheet $controlSheet -RangeAddress "A1:A15"
    Format-HeaderRow -Worksheet $marketSheet -RangeAddress "A1:G1"
    Format-HeaderRow -Worksheet $ohlcSheet -RangeAddress "A1:F1"
    Format-HeaderRow -Worksheet $logSheet -RangeAddress "A1:L1"
    $bridgeSheet.Visible = 2

    foreach ($worksheet in @($controlSheet, $marketSheet, $ohlcSheet, $logSheet)) {
        $worksheet.Columns.AutoFit() | Out-Null
    }

    foreach ($name in @($Workbook.Names)) {
        if ($name.Name -eq "RSS_TICK") {
            $name.Delete()
        }
    }
    $Workbook.Names.Add("RSS_TICK", '=Market!$A$2:$G$2') | Out-Null
}

$workbookDir = Split-Path -Parent $WorkbookPath
if (-not (Test-Path $workbookDir)) {
    New-Item -ItemType Directory -Path $workbookDir -Force | Out-Null
}

if ((Test-Path $WorkbookPath) -and -not $Force) {
    throw "Workbook already exists: $WorkbookPath. Use -Force to overwrite it."
}

if ((Test-Path $WorkbookPath) -and $Force) {
    Remove-Item -Path $WorkbookPath -Force
}

$excel = $null
$workbook = $null
$vbaImported = $false
$vbaWarning = $null

try {
    Write-Verbose "Creating Excel COM application"
    [void]($excel = New-Object -ComObject Excel.Application)
    $excel.DisplayAlerts = $false
    $excel.Visible = [bool]$Visible
    $excel.AskToUpdateLinks = $false
    $excel.EnableEvents = $false
    $excel.ScreenUpdating = $false
    try {
        $excel.Calculation = -4135
    }
    catch {
        Write-Verbose "Excel calculation mode could not be set to manual: $($_.Exception.Message)"
    }

    Write-Verbose "Creating workbook"
    [void]($workbook = $excel.Workbooks.Add())
    Write-Verbose "Applying workbook layout"
    Set-WorkbookLayout -Workbook $workbook

    if (-not $SkipVbaImport) {
        try {
            Write-Verbose "Importing VBA sources"
            Import-VbaSources -Workbook $workbook
            $vbaImported = $true
        }
        catch {
            $vbaWarning = $_.Exception.Message
            Write-Warning "Workbook scaffold was created, but VBA import failed. Enable 'Trust access to the VBA project object model' and re-run if needed. Detail: $vbaWarning"
        }
    }

    $xlOpenXmlWorkbookMacroEnabled = 52
    Write-Verbose "Saving workbook to $WorkbookPath"
    $workbook.SaveAs($WorkbookPath, $xlOpenXmlWorkbookMacroEnabled)
    Write-Verbose "Workbook saved"

    [pscustomobject]@{
        WorkbookPath = $WorkbookPath
        Sheets = "Control, Market, OHLC_Data, Log"
        VbaImported = $vbaImported
        VbaImportWarning = $vbaWarning
    }
}
finally {
    if ($null -ne $workbook) {
        try {
            Write-Verbose "Closing workbook"
            $workbook.Close($false)
        }
        catch {
            Write-Warning "Workbook close failed during cleanup: $($_.Exception.Message)"
        }
        finally {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null
        }
    }

    if ($null -ne $excel) {
        try {
            Write-Verbose "Quitting Excel"
            $excel.Quit()
        }
        catch {
            Write-Warning "Excel quit failed during cleanup: $($_.Exception.Message)"
        }
        finally {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
        }
    }

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
