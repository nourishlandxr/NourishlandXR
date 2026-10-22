# Official root website release

The approved website is now served at `https://nourishland.org/`, with clean public website and XR tool entry routes. It was published through the authenticated hosting file manager, preserving WordPress, the API and project data. The installed release is V0.9767.

`https://nourishland.org/site/root-release.json` marks a root-managed deployment. The old frontend workflow must stop before its `/xr` sync while this marker exists: the root homepage imports reviewed XR hero scripts and media, and the old `rsync --delete-delay` would remove untracked delivery assets or overwrite migration-aware navigation.

This guard deliberately blocks the legacy frontend deployment; it does not stop the separate API workflow or local development. Do not remove the marker just to make CI green. First integrate the approved root release source, assets, clean route shells and static legacy entry bridges into a dedicated root publisher. Never repoint a destructive rsync at public_html. Keep WordPress uploads, WordPress configuration, xr-api and private data outside the managed frontend file list.

Private rollback archive on the host: `/home/nourishl/migration-precutover-20261022-v09764.tar.gz`. It was extracted successfully to a separate private restore-check directory. A fresh WordPress SQL export was also saved locally. Frontend rollback restores only changed frontend files and the original .htaccess; it must not rewind newer project records or database changes.

Release sources, manifests, original/installed routing rules and verification evidence are in the publishing chat's saved `outputs/root-site-release-v1/` directory. No private backup, SQL export or local test credentials belong in the repository or public_html.
