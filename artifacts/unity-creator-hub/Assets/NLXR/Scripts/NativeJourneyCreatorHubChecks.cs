using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private IEnumerator CreatorHubChecks(PrototypeProject project, List<string> errors, Action<int> count)
        {
            int checks = 0; var area = project.areas[0]; string id = project.id;
            void Check(bool value, string message) { checks++; if (!value) errors.Add(message); }
            void Click(string label)
            {
                var action = panel.GetComponentsInChildren<KnowledgeAction>().FirstOrDefault(item => item.name == label);
                Check(action, "Creator hub action missing: " + label); if (action) action.Activate();
            }
            void Fits()
            {
                foreach (var label in panel.GetComponentsInChildren<TMPro.TextMeshPro>()) label.ForceMeshUpdate();
                Check(panel.GetComponentsInChildren<TMPro.TextMeshPro>().All(label => label.textBounds.size.x <= label.rectTransform.sizeDelta.x + .01f && label.textBounds.size.y <= label.rectTransform.sizeDelta.y + .01f),
                    "Creator hub text exceeds its bounds on " + route);
                foreach (var action in panel.GetComponentsInChildren<KnowledgeAction>().Where(item => item.transform.localScale.x >= .5f))
                {
                    var label = panel.GetComponentsInChildren<TMPro.TextMeshPro>().FirstOrDefault(item => item.text == action.name);
                    if (!label) continue;
                    float left = label.transform.localPosition.x - label.rectTransform.sizeDelta.x * .5f;
                    float right = label.transform.localPosition.x + label.rectTransform.sizeDelta.x * .5f;
                    Check(left >= action.transform.localPosition.x - action.transform.localScale.x * .5f - .01f &&
                        right <= action.transform.localPosition.x + action.transform.localScale.x * .5f + .01f,
                        "Button label is outside its hit target: " + action.name);
                }
            }
            ProjectWorkspace(project); yield return null;
            Check(route == "project-workspace" && RecentCreatorProject()?.id == id, "Hub loses the selected project");
            var actions = panel.GetComponentsInChildren<KnowledgeAction>().Select(action => action.name).OrderBy(name => name).ToArray();
            Check(actions.SequenceEqual(new[] { "Areas & objects", "Discovery Paths", "Open IMAP", "PIMOs & content", "Preview", "Project details", "Projects" }.OrderBy(name => name)), "Project tools are not together in one hub");
            Fits();
#if UNITY_EDITOR
            CaptureCreatorHub("Evidence/creator-hub-preview.png");
#endif
            Click("Areas & objects"); yield return null;
            Check(route == "project-areas", "Hub cannot open Area editing");
            Click("Project hub"); Check(route == "project-workspace", "Areas cannot return to the same hub");
            Click("PIMOs & content"); Click(area.name); yield return null;
            Check(route == "creator-pimo-content", "PIMO access loses Area context"); Fits();
            Click("Edit plant records"); Check(route == "draft-specimens", "PIMO content cannot open saved plant records");
            CreatorPimoContent(project, area); Click("Preview PIMOs"); yield return null;
            Check(route == "draft-preview" && world.GetComponentsInChildren<NativePlantOrb>().Length == area.plants.Count, "PIMO preview does not use the same saved specimens");
            ProjectWorkspace(project); Click("Discovery Paths"); Click(area.name); yield return null;
            Check(route == "creator-discovery-paths" && string.IsNullOrEmpty(area.checklistJson), "Opening Discovery Paths silently creates or changes a Guide"); Fits();
            Check(panel.GetComponentsInChildren<TMPro.TextMeshPro>().Any(label => label.text.Contains("Hunt and Quiz: planned")), "Discovery Paths claims unavailable Hunt/Quiz functionality");
#if UNITY_EDITOR
            CaptureCreatorHub("Evidence/creator-paths-preview.png");
#endif
            Click("Create a Guide"); Check(route == "draft-checklist", "Discovery Paths is not connected to the existing Guide editor");
            ProjectWorkspace(project); Click("Preview"); Click(area.name); yield return null;
            Check(route == "creator-preview-options", "Hub cannot choose AR or VR preview"); Fits();
            Click("Preview in VR"); yield return null;
            Check(route == "draft-preview" && practiceMode, "Hub VR preview does not enter the Area's immersive preview");
            ProjectWorkspace(project); yield return null;
            Check(!practiceMode && sceneObjects.Count == 0 && !shell.IsPanelOpen, "Returning to hub leaks preview content");
            Click("Project details"); yield return null; Fits();
            Click("Guided setup"); Check(route == "creator-setup", "Project setup cannot be resumed from the hub");
            Click("Project hub"); Check(route == "project-workspace", "Project creation cannot return to its hub");
            CreatorProjectDetails(project); Click("Export draft");
            Check(route == "draft-export", "Project details cannot open the local draft export");
            var empty = new PrototypeProject { id = "hub-empty", siteId = "hub-empty-site", name = "Empty project" };
            CreatorHubAreas(empty, "paths"); yield return null;
            Check(panel.GetComponentsInChildren<KnowledgeAction>().Any(action => action.name == "Create first Area"), "Empty project has a dead-end tool entry"); Fits();
            ProjectWorkspace(project); yield return null;
            Check(project.id == id && area.plants.Count == 2 && string.IsNullOrEmpty(area.checklistJson), "Hub navigation duplicates content or changes identity");
            Check(Application.version == "0.2.27", "Creator hub fixture is running a stale application version");
            count(checks);
        }
#if UNITY_EDITOR
        private void CaptureCreatorHub(string destination)
        {
            var camera = Camera.main; var position = camera.transform.position; var rotation = camera.transform.rotation;
            float fov = camera.fieldOfView, aspect = camera.aspect;
            var target = new RenderTexture(1600, 1000, 24); target.Create(); var previous = RenderTexture.active;
            try
            {
                foreach (var label in panel.GetComponentsInChildren<TMPro.TextMeshPro>()) label.ForceMeshUpdate();
                camera.transform.position = panel.transform.TransformPoint(new Vector3(0, -.05f, -3f));
                camera.transform.LookAt(panel.transform.TransformPoint(new Vector3(0, -.05f, 0)));
                camera.fieldOfView = 45; camera.aspect = 1.6f;
                UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(camera, new UnityEngine.Rendering.Universal.UniversalRenderPipeline.SingleCameraRequest { destination = target });
                RenderTexture.active = target; var image = new Texture2D(1600, 1000, TextureFormat.RGB24, false);
                image.ReadPixels(new Rect(0, 0, 1600, 1000), 0, 0); image.Apply();
                System.IO.File.WriteAllBytes(destination, image.EncodeToPNG()); Destroy(image);
            }
            finally
            {
                RenderTexture.active = previous; camera.transform.SetPositionAndRotation(position, rotation);
                camera.fieldOfView = fov; camera.aspect = aspect; target.Release(); Destroy(target);
            }
        }
#endif
    }
}
