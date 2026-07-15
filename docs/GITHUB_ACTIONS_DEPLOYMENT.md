# GitHub Actions frontend deployment

## Deployment boundary

Hosted project data remains separately on HostArmada at:

```text
/home/CPANEL_USER/nourishland-data/workspace
```

Production frontend files are deployed only to:

```text
/home/CPANEL_USER/public_html/xr
```

The workflow never deploys `workspace/`, `nourishland-data/`, `dist/xr-api/`, or the Node application root. Creator content therefore survives every frontend deployment.

If workspace files were previously committed to this application repository, remove them from Git tracking without deleting the local files:

```text
git rm -r --cached workspace
git rm -r --cached nourishland-data
git rm --cached workspace.zip
```

Run only the commands for paths that are currently tracked, then commit that index change together with `.gitignore`. The authoritative hosted files remain in `nourishland-data/workspace`.

## Production flow

```text
Commit to main
    -> push to GitHub
    -> GitHub Actions installs dependencies
    -> npm run build:frontend
    -> deployment boundary checks
    -> SSH/rsync uploads dist/xr/ only
    -> https://nourishland.org/xr/
```

The workflow is `.github/workflows/deploy-xr-production.yml`. It runs for relevant frontend/build changes pushed to `main` and can also be started manually from the Actions page while viewing `main`.

## Andre's one-time GitHub setup checklist

In the GitHub repository, open **Settings → Environments**, create an Environment named exactly `production`, and configure the following items on that Environment.

| Variable | Value |
| --- | --- |
| `XR_URL` | `https://nourishland.org/xr/` |

Add these encrypted Environment secrets:

| Secret | Purpose |
| --- | --- |
| `HOSTARMADA_HOST` | SSH hostname supplied by HostArmada |
| `HOSTARMADA_SSH_PORT` | SSH port, normally `22` |
| `HOSTARMADA_USER` | cPanel/SSH account name |
| `HOSTARMADA_XR_PATH` | Exactly `/home/ACCOUNT/public_html/xr`, replacing `ACCOUNT` with the same cPanel/SSH username stored in `HOSTARMADA_USER` |
| `HOSTARMADA_SSH_PRIVATE_KEY` | Private half of a dedicated deployment key |
| `HOSTARMADA_SSH_KNOWN_HOSTS` | Trusted SSH host-key line for the HostArmada server |

Use Environment secrets rather than repository-wide secrets so staging can later use the same names with different values. Do not store passwords, private keys, or host paths in the workflow file.

Checklist:

- Environment: `production`
- Environment variable: `XR_URL=https://nourishland.org/xr/`
- Environment secrets: `HOSTARMADA_HOST`, `HOSTARMADA_SSH_PORT`, `HOSTARMADA_USER`, `HOSTARMADA_XR_PATH`, `HOSTARMADA_SSH_PRIVATE_KEY`, `HOSTARMADA_SSH_KNOWN_HOSTS`
- `HOSTARMADA_XR_PATH` must equal `/home/<HOSTARMADA_USER>/public_html/xr`; the workflow refuses every other path

## SSH preparation

1. Generate a dedicated key pair for GitHub Actions, not a personal key.
2. Add the public key to the HostArmada account's `~/.ssh/authorized_keys`.
3. Use a dedicated non-interactive deployment key and put the private key, including its BEGIN/END lines, in `HOSTARMADA_SSH_PRIVATE_KEY`.
4. Obtain the server host key from a trusted HostArmada/cPanel source and store the complete known-hosts line in `HOSTARMADA_SSH_KNOWN_HOSTS`.
5. Confirm the SSH user can write `/home/CPANEL_USER/public_html/xr` but does not need API-directory access for this workflow.
6. Confirm `rsync --version` works over the HostArmada SSH account. The workflow intentionally uses SSH/rsync instead of FTP.

Do not replace known-host verification with `StrictHostKeyChecking=no`.

## Safety controls

- The job runs only when `github.ref` is `refs/heads/main`.
- GitHub grants the workflow read-only repository contents permission.
- `npm ci` uses the committed lockfile.
- The build command creates the frontend artifact only.
- Artifact checks reject symlinks and protected directory names.
- The remote-path guard accepts only `/home/<account>/public_html/xr` and verifies that exact directory is writable before synchronization.
- `rsync --delete-delay` removes obsolete assets only inside the guarded XR directory.
- `/xr-api`, the Node application root, and `nourishland-data/workspace` are never deployment targets.
- A final HTTP check fails the workflow if the public XR URL is unavailable.

## First-deployment verification

1. Commit the v0.8 frontend, workflow, lockfile, and build files, then push `main`.
2. In GitHub, open **Actions → Deploy XR frontend** and open the run for that commit.
3. Confirm **Verify deployment boundary**, **Deploy XR frontend**, and **Verify production URL** all succeed. The deploy log must show `dist/xr/` as the local source and `/home/ACCOUNT/public_html/xr/` as the remote destination.
4. Open `https://nourishland.org/xr/` in a private browser and confirm the v0.8 page loads without missing JavaScript or CSS.
5. Press **START AR** on a compatible Android WebXR browser and confirm the visible diagnostic sequence reaches `requestSession started`, then `session created` or an exact `requestSession failed` error. Temporarily unavailable marker data must report a non-fatal preload failure and still reach `requestSession started`.
6. Open `https://nourishland.org/xr-api/health` and confirm the API still responds. The workflow does not upload or delete API files.
7. Open Creator and confirm the existing hosted records are still present. The workflow does not upload or delete `/home/ACCOUNT/nourishland-data/workspace`.

No manual FTP upload is required after this setup.

## Normal deployment

```text
git add <changed files>
git commit -m "Describe the XR change"
git push origin main
```

Only application-code changes use this flow. Creator content saves directly through `/xr-api` and does not create a Git deployment.

## Rollback

```text
git revert <commit-sha>
git push origin main
```

Actions rebuilds and restores the previous frontend. Project data is unaffected.

## Future develop/staging deployment

1. Create a GitHub Environment named `staging`.
2. Add the same variable and secret names, but point `XR_URL` and `HOSTARMADA_XR_PATH` to the staging site.
3. Add `develop` to the workflow's push branches.
4. Split or rename the job so `main` selects `production` and `develop` selects `staging`.
5. Update the remote-path guard to allow only the exact staging XR path, never a parent directory.

Do not enable the `develop` trigger until the staging environment exists.
