# Verified living website publication · V0.9785

Retains all website changes described in `release-0.9784.md`: artistic information balloons, automatic wheel rotation, hover/tap radial menus, three camera views, compact story/guide scenes and removal of obsolete Platform links.

The V0.9784 installer completed, but its immediate public verification reported a hash mismatch for the new WebP illustration. Subsequent requests returned the exact expected 420,292 bytes and SHA-256. The publisher now allows five attempts, separated by five seconds, and gives retries distinct URLs to avoid reusing a stale response. Exact hash verification, installation baseline checks and private rollback backups are retained.

The frontend/website is rebuilt as V0.9785. This additive overlay is based on the installed V0.9784 release. The complete 1,223-test suite and artistic UI browser checks passed for the unchanged V0.9784 implementation; publication and live interactions are checked again for V0.9785. Physical-device acceptance remains separate from browser viewport checks.
