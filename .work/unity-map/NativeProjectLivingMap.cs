using System;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;

namespace Nourishland.XR
{
    // Simple project overview. No fabricated landscape, paths or physical coordinates.
    // Detail pages bound meshes, colliders and text even for large published projects.
    public sealed class NativeProjectLivingMap : MonoBehaviour
    {
        public const int PageSize = 12;
        public ProjectLivingMapData Data { get; private set; }
        public string AreaKey { get; private set; }
        public int Page { get; private set; }
        public int Pages { get; private set; } = 1;
        public int VisibleCount => visuals.Count;
        public Action<ProjectMapNode> Selected;
        public Action ViewChanged;
        private Transform nodes;
        private Material green, timber, gold, land, rim;
        private TMP_FontAsset font;
        private bool reduced;
        private readonly List<Material> owned = new List<Material>();
        private readonly Dictionary<string, GameObject> visuals = new Dictionary<string, GameObject>();
        private readonly Dictionary<string, float> born = new Dictionary<string, float>();

        public void Initialize(Material material, TMP_FontAsset fontAsset, bool reducedMotion)
        {
            font = fontAsset; reduced = reducedMotion;
            Material Tint(Color color) { var result = new Material(material); result.color = color; owned.Add(result); return result; }
            green = Tint(new Color(.25f, .76f, .53f)); timber = Tint(new Color(.69f, .48f, .26f)); gold = Tint(new Color(.98f, .80f, .36f));
            land = Tint(new Color(.12f, .26f, .23f)); rim = Tint(new Color(.35f, .53f, .43f));
            Primitive("Map rim", PrimitiveType.Cylinder, transform, new Vector3(0, -.018f, 0), new Vector3(1.43f, .012f, 1.43f), rim, false);
            Primitive("Map surface", PrimitiveType.Cylinder, transform, new Vector3(0, -.008f, 0), new Vector3(1.38f, .009f, 1.38f), land, false);
            nodes = new GameObject("Project map nodes").transform; nodes.SetParent(transform, false);
        }
        public void SetData(ProjectLivingMapData data)
        {
            Data = data;
            if (!data.Areas.Any(a => a.Key == AreaKey)) AreaKey = null;
            Draw();
        }
        public void Overview() { AreaKey = null; Page = 0; Draw(); }
        public void FocusArea(string key) { AreaKey = Data.Areas.Any(a => a.Key == key) ? key : null; Page = 0; Draw(); }
        public void NextPage() { Page = (Page + 1) % Pages; Draw(); }
        private void Draw()
        {
            var all = (AreaKey == null ? Data.Areas : Data.Children(AreaKey)).ToArray();
            Pages = Math.Max(1, (all.Length + PageSize - 1) / PageSize); Page = Mathf.Clamp(Page, 0, Pages - 1);
            var visible = all.Skip(Page * PageSize).Take(PageSize).ToArray();
            var keys = new HashSet<string>(visible.Select(n => n.Key));
            foreach (var key in visuals.Keys.Where(k => !keys.Contains(k)).ToArray())
            { visuals[key].SetActive(false); Destroy(visuals[key]); visuals.Remove(key); born.Remove(key); }
            // Fit this view only; model coordinates and saved layout slots never change.
            var center = visible.Length == 0 ? Vector2.zero : visible.Aggregate(Vector2.zero, (sum, n) => sum + n.Point) / visible.Length;
            float radius = visible.Length == 0 ? .3f : Mathf.Max(.3f, visible.Max(n => (n.Point - center).magnitude));
            float scale = Mathf.Min(1, .50f / radius);
            foreach (var node in visible)
            {
                if (!visuals.TryGetValue(node.Key, out var go))
                {
                    go = new GameObject("Map " + node.Kind + ": " + node.Label); go.transform.SetParent(nodes, false);
                    visuals.Add(node.Key, go); born[node.Key] = Time.unscaledTime;
                    var target = go.AddComponent<BoxCollider>(); target.center = Vector3.up * .045f; target.size = new Vector3(.18f, .16f, .18f);
                    var action = go.AddComponent<KnowledgeAction>(); string key = node.Key;
                    action.invoke = () => { var current = Data.Nodes.FirstOrDefault(n => n.Key == key); if (current == null) return; if (current.Kind == "area") FocusArea(key); else Selected?.Invoke(current); };
                    var focus = Primitive("Focus outline", PrimitiveType.Cylinder, go.transform, Vector3.down * .004f, new Vector3(.26f, .003f, .26f), gold, false).GetComponent<Renderer>();
                    focus.enabled = false; action.highlightRenderer = focus;
                    Primitive("Arrival glow", PrimitiveType.Cylinder, go.transform, Vector3.down * .003f, new Vector3(.25f, .002f, .25f), gold, false);
                    if (node.Kind == "area") Primitive("Area island", PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(.23f, .012f, .23f), green, false);
                    else if (node.Kind == "totem")
                    {
                        Primitive("Totem stem", PrimitiveType.Cylinder, go.transform, Vector3.up * .065f, new Vector3(.035f, .065f, .035f), timber, false);
                        Primitive("Totem crown", PrimitiveType.Cube, go.transform, new Vector3(0, .11f, 0), new Vector3(.09f, .025f, .035f), gold, false);
                    }
                    else Primitive(node.Kind == "orb" ? "Plant Orb" : "Note", node.Kind == "orb" ? PrimitiveType.Sphere : PrimitiveType.Cube,
                        go.transform, Vector3.up * .055f, Vector3.one * .075f, node.Kind == "orb" ? green : gold, false);
                    var text = new GameObject("Identity").AddComponent<TextMeshPro>(); text.transform.SetParent(go.transform, false);
                    text.transform.localPosition = new Vector3(0, .12f, -.07f); text.transform.localRotation = Quaternion.Euler(38, 0, 0);
                    text.font = font; text.fontSize = .22f; text.color = Color.white; text.alignment = TextAlignmentOptions.Center;
                    text.richText = false; text.rectTransform.sizeDelta = new Vector2(.26f, .12f);
                }
                go.transform.localPosition = new Vector3((node.Point.x - center.x) * scale, 0, (node.Point.y - center.y) * scale);
                var label = go.GetComponentInChildren<TextMeshPro>();
                label.text = node.Label + "\n" + (node.Kind == "area" ? Data.Children(node.Key).Count() + " objects" : node.Kind == "orb" ? "Orb" : node.Kind == "totem" ? "Totem" : "Note");
            }
            ViewChanged?.Invoke();
        }
        private void Update()
        {
            foreach (var pair in visuals)
            {
                float t = reduced ? 1 : Mathf.Clamp01((Time.unscaledTime - born[pair.Key]) / .65f);
                pair.Value.transform.localScale = Vector3.one * Mathf.Max(.01f, Mathf.SmoothStep(0, 1, t));
                var glow = pair.Value.transform.Find("Arrival glow"); if (glow) glow.gameObject.SetActive(t < 1);
            }
        }
        private static GameObject Primitive(string name, PrimitiveType kind, Transform parent, Vector3 at, Vector3 size, Material material, bool collider)
        {
            var go = GameObject.CreatePrimitive(kind); go.name = name; go.transform.SetParent(parent, false); go.transform.localPosition = at; go.transform.localScale = size;
            go.GetComponent<Renderer>().sharedMaterial = material;
            if (!collider) { go.GetComponent<Collider>().enabled = false; Destroy(go.GetComponent<Collider>()); }
            return go;
        }
        private void OnDestroy() { foreach (var material in owned) if (material) Destroy(material); }
    }
}
