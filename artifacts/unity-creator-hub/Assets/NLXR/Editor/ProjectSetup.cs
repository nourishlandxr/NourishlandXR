using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using TMPro;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;
using UnityEngine.XR.Management;
using UnityEditor.XR.Management;
using UnityEditor.XR.Management.Metadata;
using UnityEditor.XR.OpenXR;
using UnityEngine.XR.OpenXR;
using UnityEngine.XR.OpenXR.Features;

namespace Nourishland.XR.Editor
{
    public static class ProjectSetup
    {
        private const string ScenePath = "Assets/NLXR/Scenes/KnowledgeShell.unity";
        [MenuItem("Nourishland/Prepare project and verify")]
        public static void Prepare()
        {
            Directory.CreateDirectory("Evidence");
            if (!AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset"))
            {
                var essential = Directory.GetFiles("Library/PackageCache", "TMP Essential Resources.unitypackage", SearchOption.AllDirectories).Single();
                UnityEditor.AssetPackage.Package.Import(essential, false);
                AssetDatabase.Refresh();
            }
            PlayerSettings.companyName = "Nourishland";
            PlayerSettings.productName = "Nourishland XR";
            PlayerSettings.bundleVersion = "0.2.27";
            PlayerSettings.Android.bundleVersionCode = 28;
            PlayerSettings.runInBackground = true;
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "org.nourishland.nlxr.transition");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel32;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.Vulkan });
            var mobile = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/Settings/Mobile_RPAsset.asset");
            mobile.supportsHDR = false; mobile.msaaSampleCount = 4; mobile.renderScale = 1f; EditorUtility.SetDirty(mobile);
            EditorSettings.serializationMode = SerializationMode.ForceText;
            EditorBuildSettings.RemoveConfigObject("com.unity.input.settings.actions");
            MetaSdkVerification.Inspect();
            ConfigureXR();
            Directory.CreateDirectory("Assets/NLXR/Scenes");
            Directory.CreateDirectory("Assets/NLXR/Materials");
            AssetDatabase.Refresh();
            var material = AssetDatabase.LoadAssetAtPath<Material>("Assets/NLXR/Materials/ShellUnlit.mat");
            if (!material)
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
                AssetDatabase.CreateAsset(material, "Assets/NLXR/Materials/ShellUnlit.mat");
            }
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var root = new GameObject("Nourishland Knowledge Shell");
            var shell = root.AddComponent<TransitionShell>();
            shell.unlit = material;
            shell.font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset");
            if (!shell.font) throw new Exception("TMP font did not import.");
            EditorSceneManager.SaveScene(SceneManager.GetActiveScene(), ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Verify();
            BakeModelPrefabs();
            FruitAssetPreparation.Bake();
            LivingMapAssetPreparation.Bake();
            PortalAssetPreparation.Bake();
            MetaIntegrationSetup.PreparePhysicalView();
            MetaIntegrationSetup.Verify();
            Debug.Log("NLXR_READY: scene generated, XR configured, parity checks passed.");
        }
        private static void BakeModelPrefabs()
        {
            Directory.CreateDirectory("Assets/Resources/NLXR/ModelPrefabs"); AssetDatabase.Refresh();
            var content = ExperienceContent.Load(); var reports = new List<string>();
            foreach (var model in content.models)
            {
                var sourcePath = "Assets/NLXR/ModelSources/" + model.file.Replace("NLXR/Models/", "");
                var importer = AssetImporter.GetAtPath(sourcePath);
                if (importer == null) { reports.Add("MISSING: " + sourcePath); continue; }
                var importerSettings = new SerializedObject(importer);
                var animationMethod = importerSettings.FindProperty("importSettings.animationMethod");
                if (animationMethod != null && animationMethod.intValue != (int)GLTFast.AnimationMethod.Legacy)
                { animationMethod.intValue = (int)GLTFast.AnimationMethod.Legacy; importerSettings.ApplyModifiedPropertiesWithoutUndo(); importer.SaveAndReimport(); }
                var source = AssetDatabase.LoadAssetAtPath<GameObject>(sourcePath);
                if (source == null) { reports.Add("IMPORT FAILED: " + sourcePath); continue; }
                var output = "Assets/Resources/NLXR/ModelPrefabs/" + model.id.Replace('/', '_') + ".prefab";
                var instance = UnityEngine.Object.Instantiate(source);
                try
                {
                    PrefabUtility.SaveAsPrefabAsset(instance, output);
                    var renderers = instance.GetComponentsInChildren<Renderer>(true);
                    if (renderers.Length == 0) throw new Exception("No model renderers: " + model.id);
                    foreach (var renderer in renderers)
                        foreach (var material in renderer.sharedMaterials)
                            if (!material || !material.shader) throw new Exception("Invalid material: " + model.id);
                    reports.Add("IMPORTED: " + model.id + " renderers=" + renderers.Length);
                }
                finally { UnityEngine.Object.DestroyImmediate(instance); }
            }
            AssetDatabase.SaveAssets(); File.WriteAllLines("Evidence/model-imports.txt", reports);
            if (reports.Any(r => !r.StartsWith("IMPORTED:"))) throw new Exception("Some original models failed native import; see Evidence/model-imports.txt.");
        }
        public static void ConfigureXR()
        {
            const string key = "com.unity.xr.management.loader_settings";
            if (!EditorBuildSettings.TryGetConfigObject(key, out XRGeneralSettingsPerBuildTarget settings))
            {
                settings = ScriptableObject.CreateInstance<XRGeneralSettingsPerBuildTarget>();
                Directory.CreateDirectory("Assets/XR"); AssetDatabase.Refresh();
                AssetDatabase.CreateAsset(settings, "Assets/XR/XRGeneralSettingsPerBuildTarget.asset");
                EditorBuildSettings.AddConfigObject(key, settings, true);
            }
            foreach (var group in new[] { BuildTargetGroup.Standalone, BuildTargetGroup.Android })
            {
                var general = settings.SettingsForBuildTarget(group);
                if (general == null)
                {
                    general = ScriptableObject.CreateInstance<XRGeneralSettings>(); general.name = group + " Settings";
                    AssetDatabase.AddObjectToAsset(general, settings); settings.SetSettingsForBuildTarget(group, general);
                }
                if (!general.Manager)
                {
                    var manager = ScriptableObject.CreateInstance<XRManagerSettings>(); manager.name = group + " Manager";
                    AssetDatabase.AddObjectToAsset(manager, settings); general.Manager = manager;
                }
                general.InitManagerOnStart = true;
                if (!XRPackageMetadataStore.AssignLoader(general.Manager, "UnityEngine.XR.OpenXR.OpenXRLoader", group))
                    throw new Exception("OpenXR loader assignment failed: " + group);
                var openXR = OpenXRSettings.GetSettingsForBuildTargetGroup(group);
                openXR.renderMode = OpenXRSettings.RenderMode.SinglePassInstanced;
                if (group == BuildTargetGroup.Android)
                    openXR.latencyOptimization = OpenXRSettings.LatencyOptimization.PrioritizeInputPolling;
                foreach (var feature in openXR.GetFeatures())
                {
                    var name = feature.GetType().Name;
                    if (name == "OculusTouchControllerProfile" || name == "HandTracking" || name == "HandInteractionProfile" || (group == BuildTargetGroup.Android &&
                        (name == "MetaQuestFeature" || name == "MetaXRFeature"))) feature.enabled = true;
                    if (name == "MetaXRFeature") feature.enabled = true;
                    if (name == "ARCameraFeature" || name == "ARSessionFeature") feature.enabled = false;
                    if (group == BuildTargetGroup.Android && feature is UnityEngine.XR.OpenXR.Features.Meta.ARCameraFeature cameraFeature)
                        cameraFeature.cameraImageSupportEnabled = true;
                }
                EditorUtility.SetDirty(general); EditorUtility.SetDirty(general.Manager); EditorUtility.SetDirty(openXR);
            }
            EditorUtility.SetDirty(settings);
            MetaIntegrationSetup.ConfigureProject();
        }
        [MenuItem("Nourishland/Verify data and coordinates")]
        public static void Verify()
        {
            var doc = KnowledgeDocument.Load();
            var experience = ExperienceContent.Load();
            var library = KnowledgeLibrary.Documents;
            var rawBank = Newtonsoft.Json.Linq.JObject.Parse(Resources.Load<TextAsset>("NLXR/public-demo-library").text);
            for (var i = 0; i < library.Length; i++)
                if (!Newtonsoft.Json.Linq.JToken.DeepEquals(rawBank["documents"][i], Newtonsoft.Json.Linq.JObject.Parse(library[i].PortableJson())))
                    throw new Exception("Public knowledge round-trip changed fields: " + library[i].plantId);
            foreach (var marker in experience.markers)
            {
                if (!MarkerDictionary.Bits(marker.id).SequenceEqual(marker.bits)) throw new Exception("Marker bit parity failed " + marker.id);
                if (!MarkerDictionary.TryDecode(marker.bits, out var decoded, out var rotation) || decoded != marker.id) throw new Exception("Marker decode failed " + marker.id);
                var bits = (int[])marker.bits.Clone();
                for (var turn = 1; turn < 4; turn++)
                {
                    var rotated = new int[25];
                    for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) rotated[c * 5 + 4 - r] = bits[r * 5 + c];
                    bits = rotated;
                    if (!MarkerDictionary.TryDecode(bits, out decoded, out rotation) || decoded != marker.id || rotation != 4 - turn)
                        throw new Exception("Marker rotation parity failed " + marker.id + ": " + turn);
                }
            }
            foreach (var cell in experience.limCells)
            {
                if (!string.IsNullOrEmpty(cell.parentId) && !experience.limCells.Any(c => c.id == cell.parentId)) throw new Exception("LIM parent missing " + cell.id);
                foreach (var related in cell.relatedFaceIds ?? Array.Empty<string>())
                    if (!experience.limCells.Any(c => c.id == related)) throw new Exception("LIM related lens missing " + related);
            }
            foreach (var root in experience.limoCells)
                if (!string.IsNullOrEmpty(root.parentId) && !experience.limoCells.Any(c => c.id == root.parentId)) throw new Exception("LIMO parent missing " + root.id);
            var reference = JsonUtility.FromJson<ReferenceIds>(File.ReadAllText("Assets/NLXR/Reference/pim-reference-outputs.json"));
            if (!doc.nodes.Select(n => n.id).SequenceEqual(reference.canonicalNodeIds)) throw new Exception("Canonical node ID/order parity failed.");
            foreach (var test in reference.searchQueries)
            {
                var actual = doc.Search(test.query);
                if (actual.Length != test.result.Length) throw new Exception("PIM search count parity failed: " + test.query);
                for (var i = 0; i < actual.Length; i++)
                    if ((actual[i].nodeId ?? "") != (test.result[i].nodeId ?? "") || actual[i].score != test.result[i].score)
                        throw new Exception("PIM search ranking parity failed: " + test.query + " result " + i);
            }
            if (doc.Children(null).Length != 6) throw new Exception("Expected six primary knowledge categories.");
            foreach (var node in doc.nodes)
                if (!doc.Breadcrumb(node.id).StartsWith(doc.identity.commonName)) throw new Exception("Broken breadcrumb: " + node.id);
            var spatial = JsonUtility.FromJson<SpatialCases>(File.ReadAllText("Assets/NLXR/Reference/spatial-conversion-cases.json"));
            foreach (var p in spatial.points)
            {
                var actual = SpatialCoordinates.FromWebPoint(new Vector3(p.source[0], p.source[1], p.source[2]));
                if (Vector3.Distance(actual, new Vector3(p.expectedUnity[0], p.expectedUnity[1], p.expectedUnity[2])) > .00001f) throw new Exception("Point parity failed.");
            }
            foreach (var m in spatial.matrices)
            {
                var actual = SpatialCoordinates.FromWebColumnMajor(m.sourceColumnMajor);
                for (var col = 0; col < 4; col++) for (var row = 0; row < 4; row++)
                    if (Mathf.Abs(actual[row, col] - m.expectedUnityColumnMajor[col * 4 + row]) > .00001f) throw new Exception("Matrix parity failed: " + m.name);
            }
            var report = new Verification { passed = true, canonicalNodes = doc.nodes.Length, sources = doc.sources.Length,
                pointCases = spatial.points.Length, matrixCases = spatial.matrices.Length, searchCases = reference.searchQueries.Length,
                markerRotationCases = 40, limCells = experience.limCells.Length, limoCells = experience.limoCells.Length, editorVersion = Application.unityVersion };
            report.plantDocuments = library.Length; report.plantNodes = library.Sum(doc => doc.nodes.Length);
            VerifyGrabOwnership();
            FruitVerification.Verify();
            LivingMapVerification.Verify();
            LivingFrameVerification.Verify();

            PortalVerification.Verify();
            MarkerVerification.Run();
            PublicPimVerification.Run();
            File.WriteAllText("Evidence/parity-result.json", JsonUtility.ToJson(report, true));
            Debug.Log("NLXR_PARITY_PASSED " + doc.nodes.Length + " nodes");
        }
        private static void VerifyGrabOwnership()
        {
            var source = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText("Documentation/fruit-interaction-reference.json"));
            var expected = source["triggerCases"][2]["snapshot"]["position"].ToObject<float[]>();
            var expectedPosition = SpatialCoordinates.FromWebPoint(new Vector3(expected[0], expected[1], expected[2]));
            var go = new GameObject("Grab ownership verification");
            try
            {
                go.transform.SetPositionAndRotation(new Vector3(.4f, 1.2f, .6f), Quaternion.Euler(0, -.3f * Mathf.Rad2Deg, 0));
                var originalPosition = go.transform.position; var originalRotation = go.transform.rotation;
                var target = go.AddComponent<GrabTarget>(); var releases = 0; target.released = () => releases++;
                target.Begin(new Vector3(.2f, 1, .4f), Quaternion.Euler(0, -.1f * Mathf.Rad2Deg, 0), 0);
                target.Begin(Vector3.zero, Quaternion.identity, 1);
                if (target.OwnerSlot != 0 || !target.Held) throw new Exception("Second controller stole the grab owner.");
                target.Move(new Vector3(.3f, 1.1f, .5f), Quaternion.Euler(0, -.5f * Mathf.Rad2Deg, 0));
                if (Vector3.Distance(go.transform.position, expectedPosition) > .00001f) throw new Exception("Grab offset differs from original fruit interaction.");
                target.Cancel();
                if (target.Held || target.OwnerSlot != -1 || releases != 0 || Vector3.Distance(go.transform.position, originalPosition) > .00001f || Quaternion.Angle(go.transform.rotation, originalRotation) > .001f)
                    throw new Exception("Tracking cancellation changed ownership, pose or fired a placement.");
                target.Begin(Vector3.zero, Quaternion.identity, 1); target.Release(); target.Release();
                if (target.Held || target.OwnerSlot != -1 || releases != 1) throw new Exception("Grab release was not exactly once.");
            }
            finally { UnityEngine.Object.DestroyImmediate(go); }
        }
        [MenuItem("Nourishland/Build Windows preview")]
        public static void BuildWindows()
        {
            Prepare();
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                scenes = new[] { ScenePath }, locationPathName = "Builds/Windows/NourishlandXR.exe",
                target = BuildTarget.StandaloneWindows64, options = BuildOptions.None
            });
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("Windows build failed: " + report.summary.result);
            File.WriteAllText("Evidence/windows-build.txt", report.summary.result + "\nBytes: " + report.summary.totalSize + "\nDuration: " + report.summary.totalTime);
        }
        [MenuItem("Nourishland/Build Quest port")]
        public static void BuildAndroid()
        {
            Prepare();
            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android)) throw new Exception("Android target unavailable.");
            EditorUserBuildSettings.selectedBuildTargetGroup = BuildTargetGroup.Android;
            var issues = new List<OpenXRFeature.ValidationRule>();
            OpenXRProjectValidation.GetCurrentValidationIssues(issues, BuildTargetGroup.Android);
            foreach (var issue in issues.Where(i => i.error && i.fixItAutomatic && i.fixIt != null)) issue.fixIt();
            issues.Clear(); OpenXRProjectValidation.GetCurrentValidationIssues(issues, BuildTargetGroup.Android);
            File.WriteAllLines("Evidence/android-validation.txt", issues.Select(i => (i.error ? "ERROR: " : "WARNING: ") + i.message));
            if (issues.Any(i => i.error)) throw new Exception("Unresolved OpenXR validation errors; see Evidence/android-validation.txt.");
            AssetDatabase.SaveAssets();
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                scenes = new[] { ScenePath }, locationPathName = "Builds/Quest/NourishlandXR.apk",
                target = BuildTarget.Android, options = BuildOptions.None
            });
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("Quest build failed: " + report.summary.result);
            File.WriteAllText("Evidence/android-build.txt", report.summary.result + "\nBytes: " + report.summary.totalSize + "\nDuration: " + report.summary.totalTime);
        }
        [Serializable] private sealed class ReferenceIds { public string[] canonicalNodeIds; public SearchCase[] searchQueries; }
        [Serializable] private sealed class SearchCase { public string query; public SearchResult[] result; }
        [Serializable] private sealed class SpatialCases { public PointCase[] points; public MatrixCase[] matrices; }
        [Serializable] private sealed class PointCase { public float[] source, expectedUnity; }
        [Serializable] private sealed class MatrixCase { public string name; public float[] sourceColumnMajor, expectedUnityColumnMajor; }
        [Serializable] private sealed class Verification { public bool passed; public int canonicalNodes, sources, pointCases, matrixCases, searchCases, markerRotationCases, limCells, limoCells, plantDocuments, plantNodes; public string editorVersion; }
    }
}



