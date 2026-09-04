# 从临时文件读取 token（不通过命令行参数传递）
$tokenFile = 'C:\Users\Admin\.gh_token'
if (-not (Test-Path $tokenFile)) { Write-Host 'ERROR: token file not found'; exit 1 }
$token = (Get-Content $tokenFile -Raw).Trim()
if (-not $token) { Write-Host 'ERROR: token empty'; exit 1 }

$owner = 'Magician-axiang'
$repo = 'linmo-portfolio'
$apiBase = "https://api.github.com/repos/$owner/$repo/contents"
$headers = @{
    Authorization = "Bearer $token"
    Accept = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
}

# 项目根目录
$projectRoot = 'C:\Users\Admin\Documents\trae_projects\portfolio-cms'

# 收集所有文件（排除 node_modules, .env, uploads, deploy.ps1）
$files = Get-ChildItem -Path $projectRoot -Recurse -File |
    Where-Object { $_.FullName -notmatch 'node_modules|\\.env$|uploads|deploy\.ps1' }

Write-Host "Found $($files.Count) files to upload"

$success = 0
$failed = 0
foreach ($f in $files) {
    $relPath = $f.FullName.Substring($projectRoot.Length + 1) -replace '\\', '/'
    $content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
    $body = @{ message = "Add $relPath"; content = $content } | ConvertTo-Json -Compress

    try {
        $resp = Invoke-RestMethod -Uri "$apiBase/$relPath" -Method Put -Headers $headers -Body $body -ContentType 'application/json; charset=utf-8'
        Write-Host "OK: $relPath"
        $success++
    } catch {
        Write-Host "FAIL: $relPath - $($_.Exception.Message)"
        $failed++
    }
    Start-Sleep -Milliseconds 300
}

Write-Host "`nDone: $success success, $failed failed"
