$ErrorActionPreference = 'Stop'
$taskDotnet = 'C:\Program Files\Unity\Hub\Editor\6000.6.5f1\Editor\Data\NetCoreRuntime\dotnet.exe'
$taskCsc = 'C:\Program Files\Unity\Hub\Editor\6000.6.5f1\Editor\Data\DotNetSdk\sdk\8.0.318\Roslyn\bincore\csc.dll'
$taskOutput = $PSScriptRoot
$taskEditorReference = Get-ChildItem Library/Bee/artifacts -Filter 'Assembly-CSharp-Editor.rsp' -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
foreach ($assembly in @('Assembly-CSharp','Assembly-CSharp-Editor')) {
    $reference = Get-Item -LiteralPath (Join-Path $taskEditorReference.DirectoryName "$assembly.rsp")
    $lines = @(Get-Content -LiteralPath $reference.FullName | Where-Object { $_ -notmatch '^-(out|refout|analyzer):' })
    if ($assembly -eq 'Assembly-CSharp') {
        foreach ($name in @('ProjectLivingMapData','NativeProjectLivingMap','NativeJourneyProjectMap')) {
            $source = '"Assets/NLXR/Scripts/' + $name + '.cs"'
            if ($lines -notcontains $source) { $lines += $source }
        }
    } else {
        $lines = @($lines | ForEach-Object { if ($_ -match '^-r:.*Assembly-CSharp(?:\.ref)?\.dll"$') { '-r:"' + $taskOutput.Replace('\','/') + '/Assembly-CSharp.dll"' } else { $_ } })
        $source = '"Assets/NLXR/Editor/ProjectLivingMapVerification.cs"'
        if ($lines -notcontains $source) { $lines += $source }
    }
    $lines += '-out:"' + $taskOutput.Replace('\','/') + '/' + $assembly + '.dll"'
    [IO.File]::WriteAllLines((Join-Path $taskOutput "$assembly.rsp"),$lines)
    & $taskDotnet $taskCsc ('@' + (Join-Path $taskOutput "$assembly.rsp"))
    if ($LASTEXITCODE -ne 0) { throw "$assembly compilation failed" }
    Write-Output "$assembly compiled with Unity references into isolated validation output."
}
