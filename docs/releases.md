# Desktop releases

The release starts in [Showcode's Prepare release workflow](https://github.com/stevebauman/showcode/actions/workflows/prepare-release.yml). Follow the full [release guide](https://github.com/stevebauman/showcode/blob/master/docs/releases.md) for the release entry format and GitHub App setup.

After the Showcode release PR merges, **Build desktop release** receives its exact commit SHA. It:

1. Verifies that the renderer SHA belongs to Showcode master and that its notes match its package version.
2. Updates the submodule, this repository's `package.json`, and both version fields in `package-lock.json`.
3. Commits those changes to master and creates `vVERSION` at the desktop commit. Existing tags must point to that same commit.
4. Builds macOS arm64/x64, Windows x64, and Linux x64 from that immutable commit. macOS signing and notarization use the existing Apple credentials.
5. Verifies required files, updater versions, and the size/SHA-512 of files referenced by updater manifests, and creates `SHA256SUMS.txt`.
6. Uploads installers, updater files, checksums, and the approved notes to a **draft** release after every build succeeds.

Download and test the draft installer, then publish it in GitHub. This makes the existing binaries available to users without rebuilding them. The workflow never publishes automatically.

## GitHub setup

Both repositories need the Actions variable `RELEASE_APP_ID` and Actions secret `RELEASE_APP_PRIVATE_KEY`. The GitHub App must be installed on both repositories with Contents, Pull requests, and Actions read/write permissions. In this repository, allow its mechanical pushes to master and `v*` tag creation under any branch/tag rules. See the upstream guide for the exact scope and rollout order.

Keep these existing Actions secrets here:

- `APPLE_ID`
- `APPLE_ID_PASSWORD`
- `APPLE_TEAM_ID`
- `CSC_LINK` (base64 P12)
- `CSC_KEY_PASSWORD`

Merge this automation before the Showcode automation. The existing 3.0.0 version is intentionally unchanged by this setup.

## Local preview

```sh
npm run release:local
```

This uses the currently checked-out renderer, installs locked dependencies, generates the UI, runs the desktop tests, packages a local app for the host architecture (ad-hoc signed on macOS), and opens it on macOS/Windows. On Linux it prints the executable path. For packaging without opening the app:

```sh
npm run release:local -- --no-open
```

The package has a `-local.0` suffix and disables automatic update checks. It never uses distribution signing, notarizes, publishes, or changes tracked versions/submodule references. For production-like signed installers, use the CI draft release.

## Retry a release

Prefer **Re-run failed jobs** on the original workflow run. To manually start the workflow, supply the same approved full Showcode SHA in `renderer_ref`. Leaving it blank selects Showcode master, which must already contain prepared release notes and a matching version.

The same version can be retried only with the same renderer SHA; changes require a new version. Published releases are never overwritten. Runs are serialized to avoid two releases changing master or tags at the same time.
