# Nourishland XR hosted deployment

HostArmada supports cPanel-managed Node.js applications through Apache Passenger. Use one Node application for `/xr-api/` and static files for `/xr/`.

## Server layout

```text
/home/CPANEL_USER/nourishland-data/workspace/   writable project source of truth
/home/CPANEL_USER/nourishland-xr-api/           Node API code
/home/CPANEL_USER/public_html/xr/                static frontend
```

The workspace must remain outside `public_html`. Give the Node application user read/write permission to it. Do not copy the workspace into either deployment artifact.

## Build application code

From the repository root:

```text
npm run build
```

This creates `dist/xr/` and `dist/xr-api/`. Content changes made in Creator do not use this command.

Production frontend updates are normally built by GitHub Actions with `npm run build:frontend`; see `docs/GITHUB_ACTIONS_DEPLOYMENT.md`. The full build remains available when intentionally preparing API code as well.

## Configure cPanel Node.js

1. Open **Setup Node.js App** in cPanel.
2. Create a production application using a current supported Node.js release.
3. Set the application root to `/home/CPANEL_USER/nourishland-xr-api`.
4. Set the application URL to `https://nourishland.org/xr-api`.
5. Set the startup file to `server.mjs`.
6. Upload the contents of `dist/xr-api/` to the application root.
7. Add every variable from `deploy/hostarmada.env.example`, replacing placeholder values. Generate the session secret with `openssl rand -hex 32`.
8. Restart the Node application from cPanel.

Passenger supplies `PORT`; do not hard-code a public port. The API validates path identifiers, accepts JSON bodies up to 1 MB, authenticates Creator access with a secure signed cookie, writes through temporary files, and retains the previous 20 versions beside each JSON file in a `.backups` directory.

## Production authentication requirement

Creator authentication cannot be disabled in production. The server deliberately refuses to start when `NODE_ENV=production` and `NOURISHLAND_CREATOR_AUTH_DISABLED=true`. Keep a strong `NOURISHLAND_CREATOR_PASSWORD` and a unique `NOURISHLAND_SESSION_SECRET` configured in cPanel. Authentication bypass is for local development only.

## Deploy the frontend

Configure `.github/workflows/deploy-xr-production.yml` as described in `docs/GITHUB_ACTIONS_DEPLOYMENT.md`. A push to `main` builds and synchronizes only `dist/xr/` to `/home/CPANEL_USER/public_html/xr/`; it does not deploy the API or workspace. Manual FTP uploads are not part of the normal frontend deployment flow.

The included `.htaccess` supports direct page refreshes and keeps HTML revalidated while allowing code assets to be cached briefly.

Add the two rules in `deploy/wordpress-root-rules.txt` to the domain root `.htaccess` immediately before the WordPress rules. Do not place XR in an iframe.

## Initial data copy

Copy the repository `workspace/` directory once to `/home/CPANEL_USER/nourishland-data/workspace/`. After verification, Creator is the normal content-editing path. Future uploads of `dist/xr/` or `dist/xr-api/` must not touch this directory.

## Verification

1. Open `https://nourishland.org/xr-api/health`; expect JSON containing `{ "ok": true }`, the registered authentication routes, and `Cache-Control: no-store`.
2. Open `https://nourishland.org/xr-api/auth/session`; expect JSON such as `{ "authenticated": false, "required": true, "authDisabled": false }`. If WordPress HTML appears, the request is not reaching Passenger: repair the cPanel application URL/mount and verify the Passenger directives before testing the application code.
3. Open `https://nourishland.org/xr/` and choose Creator, then enter the configured password.
4. Save a public plant under Hillyards `2R1`.
5. Open Visitor Field Guide in a private browser, refresh it, and confirm the plant is present.
6. Edit the description in Creator, save, refresh Visitor, and confirm the change.
7. Change visibility to `draft`, save, and confirm Visitor no longer receives it while Creator still does.
8. Request a Creator API URL in the private browser without `?view=visitor`; expect HTTP 401.
9. Attempt a Visitor write request; expect HTTP 401.
10. Rebuild and redeploy only `dist/xr/`; confirm the saved project data remains intact.

The local workflow remains `node tools/persistence-server.mjs` with `http://127.0.0.1:8000/app/`; local development does not require hosted authentication.
