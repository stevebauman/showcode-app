# Desktop releases

Publish a stable release in [Showcode](https://github.com/stevebauman/showcode/releases/new), using a new tag such as `v3.0.1` and the **Generate release notes** button. Publishing it automatically starts this repository's build. Saving a draft does not.

The complete [release guide](https://github.com/stevebauman/showcode/blob/master/docs/releases.md) describes the process and GitHub configuration.

The workflow:

1. Fetches the published release by its numeric ID and resolves its exact tagged renderer commit.
2. Updates the desktop version and submodule, and saves the original notes/commit in `releases/VERSION.json` before creating the desktop tag.
3. Builds macOS arm64/x64, Windows x64, and Linux x64 with the release notes injected into each renderer checkout.
4. Verifies all installers and updater manifests before uploading to a draft desktop release.
5. Syncs the same release notes and package version into Showcode master for the web changelog.
6. Publishes the desktop release automatically after every prior step succeeds.

The GitHub App credentials already used by the previous release flow are sufficient. Both repos need `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY`. Contents read/write access must permit mechanical pushes to both master branches, plus desktop tags; Actions write access dispatches builds. Existing Apple signing secrets remain unchanged.

## Local preview

```sh
npm run release:local
```

This uses the currently checked-out renderer, installs locked dependencies, generates the UI, runs the desktop tests, packages a local app for the host architecture (ad-hoc signed on macOS), and opens it on macOS/Windows. On Linux it prints the executable path. For packaging without opening the app:

```sh
npm run release:local -- --no-open
```

The package has a `-local.0` suffix and disables automatic update checks. It never uses distribution signing, notarizes, publishes, or changes tracked versions/submodule references. Publishing a stable Showcode release starts the signed production build.

## Retry a release

Use **Re-run failed jobs** on the original run. To start a fresh run, supply the original numeric Showcode release ID in the **Build desktop release** action's `release_id` input.

The same version may only be retried with its original renderer commit and release notes. Snapshots are kept in `releases/`; do not edit them after shipping. A published desktop release is never rebuilt or overwritten. Runs are serialized to avoid two releases updating master/tags concurrently.

A failed build, verification, or web-note sync leaves the desktop release unpublished. Installers already uploaded stay in a draft and can be reused/replaced by the original run's failed-job retry. If the final publish request succeeds but the workflow loses its connection, check the release page before retrying.

Merge this workflow update before updating the upstream Showcode release trigger. Merging these changes alone does not publish a product release.
