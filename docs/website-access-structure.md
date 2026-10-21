# Website, demos and Creator — V0.9758

The public website explains the product. Demos let people test one thing. Creator is for real project work. Accounts and administration are explicit destinations. The hero wheel and existing food-forest content are preserved.

| Destination | Purpose | Access |
| --- | --- | --- |
| `/xr/v2/` | Why, what, how; Food Forests; Immersive Learning; pilot | Public |
| `/xr/` | Three choices: demos, Creator, Explorer | Public |
| `/xr/demos/` | Main demo, placement practice, PIMO, Discovery Paths | Public |
| `/xr/creator/` | Project list; create a private project; open its tools | Approved Creator |
| `/xr/account/` | Sign in, account request, approval status, sign out | Public entry |
| `/xr/admin/` | Account approval, suspension, project permissions | Platform administrator |
| `/xr/platform.html` | Existing published-content Explorer | Public |

## Testing tools

- PIMO: `/xr/demos/?tool=pimo`. Same visual editor and local storage as the existing standalone canvas. Desktop offers its 3D preview; compatible headsets can enter XR; phones stay on touch.
- Discovery Paths: `/xr/demos/?tool=paths`. Same authoring UI with an isolated browser-storage adapter and sample garden. Save, reopen and preview; no publication or real-project writes.
- Main demo: select whether to include the existing control tutorial, then start. Desktop keeps the illustrated introduction. Camera/headset permissions remain explicit.
- Placement practice: three steps using the existing placement implementation, with no narration/music, rain, companion insects or Zinnia. Objects remain session-only.
- Real Creator: sign in, open a project. The six tools remain Areas & objects, PIMOs & content, Discovery Paths, Map, Preview, Project details.
- XR Creator: Demos → Open XR Creator → choose a project → enter its spatial workspace. From a normal project hub, Preview → Enter spatial workspace remains available. Session support is checked on entry. The full in-session panel and two wrist menus from V0.9757 are retained. Unsupported phones stay on touch.

Existing query URLs, legacy editors and chapter links remain compatible. Browser prompt-based authentication has been replaced by a normal form/dialog. No authentication bypass is used to expose private projects.

## Accounts

New accounts start pending. They can sign in to see that status and use public demos, but cannot list or modify private projects. The administrator approves them. They then sign in again and can create private projects; each creator receives administrator permission only for their own newly created project. Other projects require explicit access. Project learning editors can author learning drafts; global plant-library and platform changes remain administrator-only.

The existing owner login remains available by leaving username blank and supplying the configured Creator password. Nothing in the frontend promotes a visitor to administrator. Named existing registry accounts and role checks remain supported.

Production requires `NOURISHLAND_SESSION_SECRET` (at least 32 characters). To enable account requests, configure `NOURISHLAND_ACCESS_FILE` as an absolute private path **outside the repository and web root**. A new empty registry is initialized only when that explicit path, the owner password and a valid session secret are present. Existing corrupt registry files fail closed. Passwords use the existing scrypt hash and sessions remain signed, HttpOnly cookies. Account review revokes prior sessions.

If private account storage is missing, registration shows a configuration message and owner sign-in remains available. No credentials are shipped in browser code. Contact email is stored for pilot administration; email verification, forgotten-password email and social sign-in are not implemented or advertised.

## Release boundary

This change is local until explicitly committed and deployed. Hosted account configuration and the owner's live sign-in must be checked on the actual server; source/UI fixes cannot establish the current live password or hosting configuration. Browser and automated XR fixtures do not establish physical headset or Android-camera acceptance.
