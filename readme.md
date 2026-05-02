<p align="center">
  <img src="https://github.com/stevebauman/showcode/blob/master/static/logo.svg" width="100">
</p>

<p align="center">
  Create beautiful images of code.
</p>

<p align="center">
  <a href="https://github.com/stevebauman/showcode-app/actions"><img src="https://github.com/stevebauman/showcode-app/actions/workflows/build.yml/badge.svg"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

# Showcode Desktop

The cross-platform desktop application for [Showcode](https://github.com/stevebauman/showcode), built with [Electron](https://www.electronjs.org/).

This repository wraps the Showcode web application as a native desktop app for macOS, Windows, and Linux.

## Download

Pre-built binaries are available on the [releases page](https://github.com/stevebauman/showcode-app/releases) and at [showcode.app/buy](https://showcode.app/buy).

## Repository Structure

```
showcode-app/
├── main/           Electron main process (window management, IPC, protocol handling)
├── scripts/        Build & release scripts (notarization, etc.)
├── build/          Icons and platform-specific build assets
├── extraResources/ Additional resources bundled with the app
└── showcode/       Git submodule containing the Nuxt application (the renderer)
```

The renderer (UI) lives in the [`showcode`](https://github.com/stevebauman/showcode) submodule and is shared with the web version.

## Requirements

- [Node.js 22 LTS](https://nodejs.org/) (see [`.nvmrc`](.nvmrc))
- npm 10+

## Local Development

Clone the repository **including submodules**:

```bash
git clone --recurse-submodules https://github.com/stevebauman/showcode-app.git
cd showcode-app
```

If you've already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

Install dependencies for both the Electron host and the Nuxt renderer:

```bash
npm install
(cd showcode && npm install)
```

Start the development environment (Nuxt dev server + Electron with HMR):

```bash
npm run dev
```

This concurrently runs the Nuxt dev server on `http://localhost:3000` and launches Electron pointed at it. Changes to the renderer hot-reload automatically; changes to the main process require restarting the command.

## Building

To produce a distributable build for your current platform:

```bash
npm run generate    # builds the Nuxt renderer into showcode/dist
npm run build       # packages the Electron app via electron-builder
```

Output is written to `dist/`.

### Code Signing & Notarization (macOS)

Production macOS builds are notarized with Apple. To build and notarize locally, copy `electron-builder.env-example` to `electron-builder.env` and populate the values:

```env
APPLE_ID=your-apple-id@example.com
APPLE_ID_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=YOURTEAMID
CSC_LINK=./certificate.p12
CSC_KEY_PASSWORD=your-cert-password
```

Notarization requires a valid Apple Developer account and an app-specific password generated at [appleid.apple.com](https://appleid.apple.com). The `certificate.p12` file is your Developer ID Application certificate exported from Keychain Access.

> Unsigned builds will still run locally but will not pass Gatekeeper on other machines.

### CI Builds

The [`build.yml`](.github/workflows/build.yml) workflow produces signed builds for macOS, Windows, and Linux on demand via `workflow_dispatch`. It expects the following repository secrets to be set:

| Secret              | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `APPLE_ID`          | Apple ID email                             |
| `APPLE_ID_PASSWORD` | App-specific password                      |
| `APPLE_TEAM_ID`     | Apple Developer Team ID                    |
| `CSC_LINK`          | Base64-encoded `.p12` certificate          |
| `CSC_KEY_PASSWORD`  | Certificate password                       |
| `API_KEY`           | App Store Connect API key (`.p8` contents) |
| `API_KEY_ID`        | Key ID for the above                       |
| `API_KEY_ISSUER_ID` | Issuer ID for the above                    |

## Contributing

Contributions are welcome. The repository is split across two projects:

- **UI / renderer changes** belong in the [`showcode`](https://github.com/stevebauman/showcode) submodule.
- **Window, menu, IPC, packaging, or installer changes** belong in this repository.

Please open an issue before starting on significant changes so we can discuss the approach.

## License

[MIT](LICENSE) © Steve Bauman
