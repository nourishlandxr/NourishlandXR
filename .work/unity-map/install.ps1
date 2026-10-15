$ErrorActionPreference = 'Stop'
$taskUnityRoot = 'C:\FILES\Projects\NLXRunity'
$taskStage = $PSScriptRoot
function Update-TaskSource([string]$relative, [string]$before, [string]$after) {
    $path = Join-Path $taskUnityRoot $relative
    $source = [IO.File]::ReadAllText($path)
    if (!$source.Contains($before)) { throw "Source has changed: $relative" }
    [IO.File]::WriteAllText($path, $source.Replace($before,$after))
}
foreach ($name in @('ProjectLivingMapData','NativeProjectLivingMap','NativeJourneyProjectMap','ProjectLivingMapVerification')) {
    $folder = if ($name -eq 'ProjectLivingMapVerification') { 'Assets\NLXR\Editor' } else { 'Assets\NLXR\Scripts' }
    $destination = Join-Path $taskUnityRoot "$folder\$name.cs"
    if (Test-Path -LiteralPath $destination) { throw "New file already exists: $destination" }
    Copy-Item -LiteralPath (Join-Path $taskStage "$name.cs") -Destination $destination
    [IO.File]::WriteAllText("$destination.meta", "fileFormatVersion: 2`nguid: $([guid]::NewGuid().ToString('N'))`n")
}
Update-TaskSource 'Assets\NLXR\Scripts\NativeJourneySharedProject.cs' 'private void SharedProject(string id)' 'private void SharedProject(string id, bool showMap = false)'
Update-TaskSource 'Assets\NLXR\Scripts\NativeJourneySharedProject.cs' 'sharedCached = response.FromCache; DrawSharedSites(0);' 'sharedCached = response.FromCache; if (showMap) PublishedProjectLivingMap(); else DrawSharedSites(0);'
Update-TaskSource 'Assets\NLXR\Scripts\NativeJourneySharedProject.cs' 'private void SharedBack(Action back)' 'private void SharedBack(Action back)'
$taskSharedPath = Join-Path $taskUnityRoot 'Assets\NLXR\Scripts\NativeJourneySharedProject.cs'
$taskShared = [IO.File]::ReadAllText($taskSharedPath)
$taskShared = $taskShared.Replace('panel.Button("Back", new Vector3(-.74f', 'if (sharedProject != null) ProjectMapIcon("Open Living Map", "map", new Vector3(.99f, .67f, -.04f), PublishedProjectLivingMap);' + "`r`n            " + 'panel.Button("Back", new Vector3(-.74f')
[IO.File]::WriteAllText($taskSharedPath,$taskShared)
Update-TaskSource 'Assets\NLXR\Scripts\NativeJourneyCreate.cs' 'panel.Begin(project.name, "Local draft · " + project.areas.Count + " Areas · saved on this device");' ('panel.Begin(project.name, "Local draft · " + project.areas.Count + " Areas · saved on this device");' + "`r`n            " + 'ProjectMapIcon("Open Living Map", "map", new Vector3(.99f, .67f, -.04f), () => DraftProjectLivingMap(project));')
Update-TaskSource 'Assets\NLXR\Scripts\NativeJourney.cs' 'selectedModel = null; livingMap = null;livingFrame=null;portal=null;' 'selectedModel = null; livingMap = null;livingFrame=null;portal=null;projectLivingMap=null;'
# Native and web versions are separate; keep the existing native build convention.
Update-TaskSource 'Assets\NLXR\Editor\ProjectSetup.cs' 'bundleVersion = "0.2.25"' 'bundleVersion = "0.2.26"'
Update-TaskSource 'Assets\NLXR\Editor\ProjectSetup.cs' 'bundleVersionCode = 26' 'bundleVersionCode = 27'
Update-TaskSource 'ProjectSettings\ProjectSettings.asset' 'bundleVersion: 0.2.25' 'bundleVersion: 0.2.26'
Update-TaskSource 'ProjectSettings\ProjectSettings.asset' 'AndroidBundleVersionCode: 26' 'AndroidBundleVersionCode: 27'
Write-Output 'Installed project Living Map source and route integration. No device actions.'
