export function renderLaunchScreen(app) {
    app.innerHTML = `
        <div class="screen launch-screen intro-launch">
            <div class="page-header intro-heading">
                <h1>Nourishland XR</h1>
                <p class="subtitle">Spatial learning platform.</p>
            </div>

            <section class="intro-copy" aria-labelledby="demoWelcomeTitle">
                <div class="welcome-label">WELCOME TO DEMO V1.1</div>
                <h2 id="demoWelcomeTitle">Observe. Explore. Learn in place.</h2>
                <p><strong>Nourishland XR</strong> is a spatial learning platform that uses AR to turn real landscapes into interactive learning experiences, connecting plants, ecosystems, and places through immersive, location-based content.</p>
            </section>

            <section class="role-choice" aria-labelledby="roleChoiceTitle">
                <h2 id="roleChoiceTitle">Are you a:</h2>
                <div class="role-grid">
                    <button class="menu-card role-card creator-role" onclick="window.renderDemoProjects()">
                        <strong>Creator</strong>
                        <span>Build and manage spatial learning content</span>
                    </button>
                    <button class="menu-card role-card visitor-role" onclick="window.renderV1Explorer()">
                        <strong>Visitor</strong>
                        <span>Choose XR Explorer or the Field Guide</span>
                    </button>
                </div>
            </section>

            <nav class="platform-landing-nav" aria-label="Platform navigation">
                <button onclick="window.renderPlatformComingSoon('Logs')"><strong>Logs</strong></button>
                <button onclick="window.renderPlatformComingSoon('Settings')"><strong>Settings</strong></button>
                <button onclick="window.renderPlatformComingSoon('Account')"><strong>Account</strong></button>
            </nav>

            <p class="collaboration-credit">A collaboration between <strong>Nourishland</strong> and <strong>CyberLotus</strong>, combining regenerative education with immersive technology to transform real landscapes into interactive learning experiences through spatial computing and augmented reality.</p>
        </div>`;
}


