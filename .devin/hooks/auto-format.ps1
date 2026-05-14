# Auto-format: Format files after Devin edits
$filePath = $env:DEVIN_FILE_PATH
if (-not $filePath) {
    exit 0
}

$fileExtension = [System.IO.Path]::GetExtension($filePath)

# Format based on file type
switch ($fileExtension) {
    ".js" { 
        if (Get-Command npx -ErrorAction SilentlyContinue) {
            npx prettier --write $filePath 2>$null
        }
    }
    ".ts" { 
        if (Get-Command npx -ErrorAction SilentlyContinue) {
            npx prettier --write $filePath 2>$null
        }
    }
    ".jsx" { 
        if (Get-Command npx -ErrorAction SilentlyContinue) {
            npx prettier --write $filePath 2>$null
        }
    }
    ".tsx" { 
        if (Get-Command npx -ErrorAction SilentlyContinue) {
            npx prettier --write $filePath 2>$null
        }
    }
    ".py" { 
        if (Get-Command black -ErrorAction SilentlyContinue) {
            black $filePath 2>$null
        }
    }
    ".go" { 
        if (Get-Command gofmt -ErrorAction SilentlyContinue) {
            gofmt -w $filePath 2>$null
        }
    }
    ".rs" { 
        if (Get-Command rustfmt -ErrorAction SilentlyContinue) {
            rustfmt $filePath 2>$null
        }
    }
}

exit 0
