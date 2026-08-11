# Builds the client and packages the app for cPanel upload.
# Output: deploy\expenses-tracker-update.zip
#
# IMPORTANT: this bundle EXCLUDES data/ and .env on purpose, so uploading it can
# never overwrite your live data or secrets on the server.
#
# Run from D:\ExpensesTracker:
#   powershell -ExecutionPolicy Bypass -File .\make-deploy-zip.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "1/4  Building client..." -ForegroundColor Cyan
Push-Location "$root\client"
npm run build
Pop-Location

Write-Host "2/4  Copying client build into server\public..." -ForegroundColor Cyan
Remove-Item "$root\server\public" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$root\client\dist" "$root\server\public" -Recurse

Write-Host "3/4  Staging bundle (node_modules included; data/ and .env excluded)..." -ForegroundColor Cyan
$stage = "$root\deploy\expenses-tracker"
Remove-Item "$root\deploy" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($item in @("app.cjs", "package.json", ".env.example", "src", "scripts", "public", "node_modules")) {
    Copy-Item "$root\server\$item" "$stage\$item" -Recurse
}

Write-Host "4/4  Zipping (portable, forward-slash paths)..." -ForegroundColor Cyan
# NOTE: do NOT use Compress-Archive here. On Windows PowerShell 5.1 it writes zip
# entries with BACKSLASH separators, which Linux extractors (cPanel File Manager)
# mishandle for brand-new nested folders -> "Cannot find module" at runtime. We
# build the archive by hand so every entry uses forward slashes.
$zip = "$root\deploy\expenses-tracker-update.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stageParent = Split-Path $stage -Parent
$fs = [System.IO.File]::Open($zip, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in Get-ChildItem $stage -Recurse -File) {
        $rel = $file.FullName.Substring($stageParent.Length + 1) -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $rel) | Out-Null
    }
} finally {
    $archive.Dispose()
    $fs.Dispose()
}

$size = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ""
Write-Host "Done -> $zip  ($size MB)" -ForegroundColor Green
Write-Host "Next: upload it to /home/nipapada/ in cPanel File Manager, Extract (overwrite), then Restart the Node app." -ForegroundColor Green
