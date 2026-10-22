using System;
using UnityEngine;

namespace Nourishland.XR
{
    public sealed partial class NativeJourney
    {
        private const string WebIntroductionUrl = "https://nourishland.org/xr/?experience=webxr-demo";
        // Fixture injection records dispatch without opening a browser during unattended checks.
        private Action<string> externalBrowser = Application.OpenURL;

        private void SharedCreatePage()
        {
            CreateHub();
        }

        private void WebIntroductionPage(bool requested = false)
        {
            LeaveScene(); route = "web-introduction"; shell.Close(); panel.gameObject.SetActive(true);
            panel.Begin("Try the WebXR Introduction", requested ? "Browser launch requested" : "External browser experience");
            panel.Text("Open the demo directly in Quest Browser, then use its Start button to enter XR. Unity pauses while you use it. To return, leave the browser's XR session and reopen Nourishland XR from the Quest app menu.",
                new Vector3(0, .03f, -.04f), 2.12f, .58f, .42f);
            panel.Button("Open in browser", new Vector3(0, -.49f, -.04f), 2.12f, () =>
            {
                WebIntroductionPage(true);
                try { externalBrowser(WebIntroductionUrl); }
                catch (Exception error)
                {
                    panel.Text("Browser launch failed: " + error.Message, new Vector3(0, -.23f, -.06f), 2.12f, .20f, .36f);
                }
            }, .22f);
            panel.Button("Main menu", new Vector3(0, -.80f, -.04f), 2.12f, ShowEntry, .18f);
        }
    }
}
