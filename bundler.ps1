# --- CONFIGURATION ---
$outputFile = "full_project_context.txt"
# Folders to ignore (add more as needed)
$ignoreDirs = @(".git", "node_modules", "venv", "__pycache__", "dist", "build", ".vs", "bin", "obj")
# File extensions to include
$includeExts = @(".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".md", ".java", ".cs", ".sql", ".txt")

# --- EXECUTION ---
Write-Host "Starting bundle..." -ForegroundColor Cyan

# Remove old file if it exists
if (Test-Path $outputFile) { Remove-Item $outputFile }

# Get all files recursively
$files = Get-ChildItem -Recurse -File

foreach ($file in $files) {
    # 1. Check if file is in an ignored folder
    $relPath = $file.FullName.Substring($PWD.Path.Length)
    $isIgnored = $false
    
    foreach ($dir in $ignoreDirs) {
        if ($relPath -match "[\\/]$dir[\\/]") {
            $isIgnored = $true
            break
        }
    }
    
    # 2. Check if extension matches
    if (-not $isIgnored -and ($includeExts -contains $file.Extension.ToLower())) {
        try {
            # Read content
            $content = Get-Content $file.FullName -Raw -ErrorAction Stop
            
            # Write Header to output
            Add-Content -Path $outputFile -Value "`n=================================================="
            Add-Content -Path $outputFile -Value "FILE_PATH: $relPath"
            Add-Content -Path $outputFile -Value "==================================================`n"
            
            # Write Code content
            Add-Content -Path $outputFile -Value $content
            
            Write-Host "Added: $relPath" -ForegroundColor Green
        }
        catch {
            Write-Host "Error reading $($file.Name): $_" -ForegroundColor Red
        }
    }
}

Write-Host "`nDone! All code bundled into: $outputFile" -ForegroundColor Cyan