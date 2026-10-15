$ErrorActionPreference = 'Stop'
foreach ($name in @('ProjectLivingMapData','NativeProjectLivingMap','NativeJourneyProjectMap','ProjectLivingMapVerification')) {
    $folder = if ($name -eq 'ProjectLivingMapVerification') { 'Editor' } else { 'Scripts' }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "$name.cs") -Destination "C:\FILES\Projects\NLXRunity\Assets\NLXR\$folder\$name.cs"
}
$taskUnityRoot = 'C:\FILES\Projects\NLXRunity'
foreach ($edit in @(
    @{ path='Assets\NLXR\Scripts\NativeJourneyCreate.cs'; before='panel.Begin(area.name, project.name + " · local prototype Area");'; after='ProjectMapIcon("Open Living Map", "map", new Vector3(.99f, .67f, -.04f), () => DraftProjectLivingMap(project));' },
    @{ path='Assets\NLXR\Scripts\NativeJourneyCreatorInspector.cs'; before='panel.Begin(doc?.identity.commonName ?? specimen.plantId, "Distinct specimen · saved on this device");'; after='ProjectMapIcon("Open Living Map", "map", new Vector3(.99f, .67f, -.04f), () => DraftProjectLivingMap(project));' }
)) {
    $path = Join-Path $taskUnityRoot $edit.path
    $text = [IO.File]::ReadAllText($path)
    if (!$text.Contains($edit.before)) { throw "Source changed: $path" }
    $insert = $edit.before + "`r`n            " + $edit.after
    if (!$text.Contains($insert)) { [IO.File]::WriteAllText($path,$text.Replace($edit.before,$insert)) }
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'PROJECT-LIVING-MAP.md') -Destination (Join-Path $taskUnityRoot 'Documentation\PROJECT-LIVING-MAP.md')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'model-checks.json') -Destination (Join-Path $taskUnityRoot 'Evidence\project-living-map-model-result.json')
