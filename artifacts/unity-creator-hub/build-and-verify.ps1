$ErrorActionPreference = 'Stop'
$taskUnityRoot = 'C:/FILES/Projects/NLXRunity'
$taskEvidence = Join-Path $taskUnityRoot 'Evidence'
$taskResult = Get-Content -LiteralPath (Join-Path $taskEvidence 'editor-menu-result.json') -Raw | ConvertFrom-Json
if (-not $taskResult.passed -or $taskResult.version -ne '0.2.27' -or $taskResult.menuChecks -lt 245) { throw 'Current Creator hub menu checks must pass before packaging.' }
$taskApk = Join-Path $taskUnityRoot 'Builds/Quest/NourishlandXR.apk'
if (Test-Path -LiteralPath $taskApk) {
    $taskBuildTools = 'C:/Program Files/Unity/Hub/Editor/6000.6.5f1/Editor/Data/PlaybackEngines/AndroidPlayer/SDK/build-tools'
    $taskAapt = Get-ChildItem -LiteralPath $taskBuildTools -Filter 'aapt2.exe' -Recurse | Sort-Object FullName -Descending | Select-Object -First 1
    $taskBadging = (& $taskAapt.FullName dump badging $taskApk) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing package before preserving it.' }
    $taskVersionMatch = [regex]::Match($taskBadging, "versionName='([0-9]+\.[0-9]+\.[0-9]+)'")
    if (-not $taskVersionMatch.Success) { throw 'Existing package has no recognizable version.' }
    $taskPrevious = Join-Path $taskUnityRoot ('Builds/Quest/NourishlandXR-' + $taskVersionMatch.Groups[1].Value + '.apk')
    if (-not (Test-Path -LiteralPath $taskPrevious)) { Copy-Item -LiteralPath $taskApk -Destination $taskPrevious }
    elseif ((Get-FileHash -LiteralPath $taskPrevious).Hash -ne (Get-FileHash -LiteralPath $taskApk).Hash) {
        $taskHash = (Get-FileHash -LiteralPath $taskApk).Hash.Substring(0,12)
        $taskPrevious = Join-Path $taskUnityRoot ('Builds/Quest/NourishlandXR-preserved-' + $taskHash + '.apk')
        if (-not (Test-Path -LiteralPath $taskPrevious)) { Copy-Item -LiteralPath $taskApk -Destination $taskPrevious }
    }
}
& (Join-Path $taskUnityRoot 'Tools/Build-Unity.ps1') -Target Quest
& (Join-Path $taskUnityRoot 'Tools/Verify-QuestPackage.ps1') -Version '0.2.27' -VersionCode 28
$taskCandidate = Join-Path $taskUnityRoot 'Builds/Quest/NourishlandXR-0.2.27.apk'
if (Test-Path -LiteralPath $taskCandidate) {
    if ((Get-FileHash -LiteralPath $taskCandidate).Hash -ne (Get-FileHash -LiteralPath $taskApk).Hash) { throw 'A different 0.2.27 candidate already exists; preserve it for review.' }
} else { Copy-Item -LiteralPath $taskApk -Destination $taskCandidate }
Write-Output ('Creator hub Quest candidate ready: ' + $taskCandidate)
