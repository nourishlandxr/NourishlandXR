# Step 3: project access and checklist publication

Local implementation. Backend deployment, production account provisioning, native authentication and physical device acceptance remain separate gates.

## Permissions

Visitors browse public projects and approved checklists without an account. Named accounts have `editor` or `admin` membership per project. Editors read their project and create/edit server checklist drafts. Administrators approve/withdraw checklists and manage existing project content. Project members cannot read another project's private content. Private global plant-library and demo management, project creation/import and global administration remain reserved for the existing bootstrap administrator.

Legacy Creator writes require a project administrator: those routes can change already-public content and do not yet offer a separate draft/review snapshot. General editor support for those routes is deferred until that separation exists. This prevents publication through an older endpoint.

The existing password-only Creator login remains a bootstrap platform administrator. The new login accepts `{username,password}`; omit/leave `username` blank for bootstrap. Sessions now include signed identity/version/expiry, with permissions reread from private server configuration on each request. Existing cookies require signing in again after this update. Disabling an account or removing a membership takes effect on its next request; increment `sessionVersion` when resetting passwords or revoking every session. Cookie logout removes the browser cookie; copied tokens require account version revocation.

Production retains same-origin checks and HttpOnly, Secure, SameSite=Strict cookies under `/xr-api/`. Native write authentication is not implemented by this phase. Never embed account credentials or fabricate an Origin header to bypass the browser security boundary.

## Server configuration

Set `NOURISHLAND_ACCESS_FILE` to a private JSON file **outside the repository, workspace exports, and every web document root**. Set `NOURISHLAND_SESSION_SECRET` to at least 32 characters. Keep the existing `NOURISHLAND_CREATOR_PASSWORD` for bootstrap administration, or omit it in named-account-only mode. The production server refuses authentication-disabled mode. Local development remains open only when no access file is configured; configuring one enables named authentication locally too.

The file has `{schemaVersion:1,users:[{id,passwordHash,sessionVersion,disabled,projects:{projectId:"editor"}}]}`. Passwords use scrypt with a random 16-byte salt, 64-byte derived key, N=32768, r=8, p=1, and a 64 MiB memory limit. See the [Node crypto API](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). No hashes, secrets or passwords appear in session responses or frontend assets. A malformed registry fails closed.

The operator tool `tools/provision-project-user.mjs PRIVATE_FILE USER_ID PROJECT_ID editor|admin` reads the new password from stdin (12–1024 characters), saves its hash atomically, grants that project role and revokes previous sessions. Do not put a real password in shell history, arguments, examples or checked-in files. Use a secure operator input method. Protect the file with host filesystem permissions; the tool's POSIX mode is not a substitute for Windows ACLs. To remove membership/disable a user, edit the private registry as the server operator and validate its structure before replacing it.

## API and revision contract

Local `/api`, hosted `/xr-api`:

| Route | Access and behavior |
| --- | --- |
| `GET /auth/session` | Identity `{id,platformAdmin,projects}`; no secrets |
| `GET /projects/{p}/checklists` | Members: `{schemaVersion:1,projectId,role,entries}` |
| `GET /projects/{p}/checklists/{id}` | Members: current server entry |
| `PUT /projects/{p}/checklists/{id}` | Editor/admin: `{expectedVersion,experience}` |
| `POST /projects/{p}/checklists/{id}/publish` | Admin: `{expectedVersion}` |
| `POST /projects/{p}/checklists/{id}/unpublish` | Admin: `{expectedVersion}` |
| `GET /projects/{p}/checklists?view=visitor` | Anonymous: approved public checklist envelope |
| `GET /projects/{p}/checklists/{id}?view=visitor` | Anonymous: one approved checklist, or 404 |

The public envelope is `{schemaVersion:1,contract:"nourishland.published-checklists",projectId,experiences:[...]}`. Each experience retains the portable checklist v1 fields and stable IDs, with `publication:"published"`. This is a separate contract; `nourishland.shared-project` v1 is unchanged. Imported personal files still accept only `personal-draft`, and cannot claim approval.

A server entry is `{version,draft,published,updatedBy,updatedAt,publishedBy?,publishedAt?}`. `expectedVersion:0` creates an entry. Every successful draft save, approval or withdrawal increments the server entry `version`; outdated versions return 409 without overwriting data. The server assigns draft content revisions (starting at 1). Published content is a frozen snapshot of the approved draft, retaining its revision while the next draft changes. Author/audit metadata is private and omitted from visitor responses.

Publication requires a public project, public site/area scope, and public referenced content in that project/scope. Knowledge references must occur in the project's public records; specimen and checkpoint references retain their respective IDs. Visitor reads recheck visibility and references, so hiding a parent or reference removes that checklist immediately. Withdrawal removes public access and preserves the draft. Writes use the existing atomic file replacement and bounded backups in the project workspace. Single server-process persistence remains the deployment assumption; distributed locking is a later phase.

## Client flow

Desktop: Checklists → Project checklists → Review & publish → Sign in. Submit a matching personal checklist to project review. Review/edit its title, description and activities, save the server draft, then approve as an administrator. Save unsaved edits before publication; stale saves require reloading. Explicitly discarding/reloading prompts before dropping unsaved changes.

Field: select a project, then Checklists → Project checklists. Visitors open the latest approved revision and mark activities. Completion remains self-reported on this device, with distinct progress keys for personal and approved content. Public experiences currently require a connection to open; offline content packs are step 4. The Field worker caches code only and excludes every API/auth response.

## Unity handoff

Consume the anonymous published-checklist routes using a separate validated DTO. Preserve project/experience/activity IDs, revision and `publication:"published"`. Keep personal exports and official reads separate. A downloaded personal file is never approval. Private drafts, review writes and native account login remain gated on an explicit supported native authentication design. Do not install an APK as part of this contract handoff.
