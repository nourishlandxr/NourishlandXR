using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed class NativePanel : MonoBehaviour
    {
        public TMP_FontAsset font;
        public Material baseMaterial;
        public Vector2 panelSize = new Vector2(2.4f, 1.5f);
        private readonly List<GameObject> drawn = new List<GameObject>();
        private readonly List<Material> materials = new List<Material>();
        public static readonly Color Green = new Color(.12f, .31f, .23f);
        public static readonly Color Ink = new Color(.08f, .15f, .12f);
        private static readonly Color PanelBackground = new Color(.025f, .09f, .10f);
        private static readonly Color PanelText = new Color(.95f, .95f, .87f);
        private static readonly Color PanelMutedText = new Color(.66f, .87f, .79f);
        private static readonly Color ButtonBackground = new Color(.055f, .20f, .19f);
        public void Clear()
        {
            foreach (var go in drawn) { go.SetActive(false); Destroy(go); } drawn.Clear();
            foreach (var mat in materials) Destroy(mat); materials.Clear();
        }
        public void Begin(string title, string hint = "")
        {
            Clear();
            Box("Launch template panel surface", Vector3.zero, new Vector3(panelSize.x, panelSize.y, .025f), PanelBackground, false);
            MenuArt("NLXR/Menu/panel-frame", new Vector3(0, 0, -.014f),
                new Vector2(panelSize.x - .08f, panelSize.y - .08f), new Color(.25f, .72f, .68f, .22f));
            Box("Launch template header accent", new Vector3(-panelSize.x * .45f, .78f, -.035f),
                new Vector3(.035f, .17f, .005f), new Color(.57f, .79f, .59f), false);
            Text("NOURISHLAND XR", new Vector3(-panelSize.x * .39f, .84f, -.04f), panelSize.x * .76f, .13f, .38f,
                PanelMutedText, TextAlignmentOptions.MidlineLeft);
            Text(title, new Vector3(0, .67f, -.04f), panelSize.x - .28f, .19f, .72f, PanelText,
                TextAlignmentOptions.Center);
            if (!string.IsNullOrEmpty(hint)) Text(hint, new Vector3(0, .49f, -.04f), panelSize.x - .28f, .13f, .36f,
                PanelMutedText, TextAlignmentOptions.Center);
            Box("Launch template header rule", new Vector3(0, .405f, -.030f), new Vector3(panelSize.x - .30f, .008f, .002f),
                new Color(.26f, .68f, .58f), false);
        }
        public GameObject Box(string label, Vector3 at, Vector3 size, Color color, bool collider = true)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube); go.name = label;
            go.transform.SetParent(transform, false); go.transform.localPosition = at; go.transform.localScale = size;
            var mat = new Material(baseMaterial); mat.color = color; materials.Add(mat);
            go.GetComponent<Renderer>().sharedMaterial = mat;
            if (!collider) { go.GetComponent<Collider>().enabled = false; Destroy(go.GetComponent<Collider>()); }
            drawn.Add(go); return go;
        }
        public TextMeshPro Text(string value, Vector3 at, float width, float height, float size = .5f, Color? color = null,
            TextAlignmentOptions alignment = TextAlignmentOptions.TopLeft)
        {
            var go = new GameObject("Text"); go.transform.SetParent(transform, false); go.transform.localPosition = at;
            var text = go.AddComponent<TextMeshPro>(); text.font = font; text.fontSize = size;
            text.text = NativeLocalization.Text(value) ?? ""; text.richText = false; text.color = color ?? PanelText;
            text.alignment = alignment; text.textWrappingMode = TextWrappingModes.Normal;
            text.rectTransform.sizeDelta = new Vector2(width, height); drawn.Add(go); return text;
        }
        public void Button(string title, Vector3 at, float width, Action action, float height = .15f)
        {
            var go = Box(title, at, new Vector3(width, height, .018f), ButtonBackground);
            var interaction = go.AddComponent<KnowledgeAction>(); interaction.invoke = action;
            MenuArt("NLXR/Menu/button-frame", at + Vector3.back * .012f, new Vector2(width, height),
                new Color(.53f, .92f, .79f, .30f));
            var hover = MenuArt("NLXR/Menu/button-highlight", at + Vector3.back * .015f, new Vector2(width, height),
                new Color(.60f, .96f, .86f, .34f));
            if (hover) { hover.name = "Launch template hover highlight"; hover.enabled = false; interaction.highlightRenderer = hover; }
            bool wide = width >= 1.5f;
            var textAt = at + Vector3.back * .02f + (wide ? new Vector3(-width * .5f + .13f, 0, 0) : Vector3.zero);
            Text(title, textAt, width - (wide ? .36f : .035f), height - .01f, .46f, PanelText,
                wide ? TextAlignmentOptions.MidlineLeft : TextAlignmentOptions.Center);
            if (wide) MenuArt("NLXR/Menu/arrow", at + new Vector3(width * .5f - .12f, 0, -.020f),
                new Vector2(.075f, .075f), new Color(.70f, .88f, .72f, .88f));
        }
        public void Icon(string kind, Vector3 at, float size, Color color)
        {
            void Path(params Vector2[] points)
            {
                for (int i = 1; i < points.Length; i++)
                {
                    var delta = points[i] - points[i - 1];
                    var center = (points[i] + points[i - 1]) * .5f;
                    var line = Box("Icon " + kind, at + new Vector3(center.x, center.y, 0) * size,
                        new Vector3(delta.magnitude * size, .075f * size, .004f), color, false);
                    line.transform.localRotation = Quaternion.Euler(0, 0, Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg);
                }
            }
            if (kind == "create") { Path(new Vector2(-.4f, 0), new Vector2(.4f, 0)); Path(new Vector2(0, -.4f), new Vector2(0, .4f)); }
            else if (kind == "explore") { Path(new Vector2(-.45f, -.2f), new Vector2(0, -.4f), new Vector2(.45f, -.2f), new Vector2(.45f, .2f), new Vector2(0, .4f), new Vector2(-.45f, .2f), new Vector2(-.45f, -.2f)); Path(new Vector2(-.18f, -.18f), new Vector2(.18f, .18f)); }
            else if (kind == "settings") { Path(new Vector2(-.4f, .27f), new Vector2(.4f, .27f)); Path(new Vector2(-.4f, 0), new Vector2(.4f, 0)); Path(new Vector2(-.4f, -.27f), new Vector2(.4f, -.27f)); Path(new Vector2(-.15f, .15f), new Vector2(-.15f, .4f)); Path(new Vector2(.18f, -.12f), new Vector2(.18f, .12f)); Path(new Vector2(-.05f, -.4f), new Vector2(-.05f, -.15f)); }
            else if (kind == "developer") { Path(new Vector2(-.15f, .3f), new Vector2(-.4f, 0), new Vector2(-.15f, -.3f)); Path(new Vector2(.15f, .3f), new Vector2(.4f, 0), new Vector2(.15f, -.3f)); }
            else { Path(new Vector2(-.4f, -.3f), new Vector2(-.4f, .3f), new Vector2(.4f, .3f), new Vector2(.4f, -.3f), new Vector2(-.4f, -.3f)); Path(new Vector2(-.08f, -.14f), new Vector2(.15f, 0), new Vector2(-.08f, .14f)); }
        }
        public void Image(string resource,Vector3 at,Vector2 size)
        {
            var go=GameObject.CreatePrimitive(PrimitiveType.Quad);go.name="Plant example photo";go.transform.SetParent(transform,false);go.transform.localPosition=at;go.transform.localScale=new Vector3(size.x,size.y,1);
            var collider=go.GetComponent<Collider>();collider.enabled=false;Destroy(collider);
            var material=new Material(baseMaterial);material.mainTexture=Resources.Load<Texture2D>(resource);material.SetInt("_Cull",0);materials.Add(material);
            go.GetComponent<Renderer>().sharedMaterial=material;drawn.Add(go);
        }
        public Renderer MenuArt(string resource, Vector3 at, Vector2 size, Color tint)
        {
            var texture = Resources.Load<Texture2D>(resource);
            var shader = Resources.Load<Shader>("NLXR/Intro/Shaders/XRIntroAlpha");
            if (!texture || !shader) return null;
            var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
            quad.name = "SlimUI menu detail";
            quad.transform.SetParent(transform, false);
            quad.transform.localPosition = at;
            quad.transform.localScale = new Vector3(size.x, size.y, 1);
            var collider = quad.GetComponent<Collider>(); collider.enabled = false; Destroy(collider);
            var material = new Material(shader);
            material.SetTexture("_BaseMap", texture);
            material.SetColor("_BaseColor", tint);
            materials.Add(material);
            var art = quad.GetComponent<Renderer>();
            art.sharedMaterial = material;
            drawn.Add(quad);
            return art;
        }
        private void OnDestroy() { foreach (var material in materials) if (material) Destroy(material); }
    }
}
