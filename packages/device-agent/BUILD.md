# Comp AI Device Agent - Build Guide

## Prerequisites

- **Node.js** >= 18
- **Bun** >= 1.3 (used as the package manager)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Visual Studio Build Tools with "Desktop development with C++" workload

## Project Structure

```
packages/device-agent/
  src/
    main/          # Electron main process (tray, auth, scheduler)
    preload/       # contextBridge IPC layer
    renderer/      # React UI (login + status window)
    checks/        # Platform-specific compliance checks
      macos/       # FileVault, XProtect, pwpolicy, screen lock
      windows/     # BitLocker, Defender, net accounts, screen lock
    shared/        # Types and constants shared across processes
  assets/          # Icons, entitlements, build resources
  electron-builder.yml   # Packaging config for dmg/exe
  electron.vite.config.ts  # Vite build config for Electron
```

## Install Dependencies

From the monorepo root:

```bash
bun install
```

Or from this package directly:

```bash
cd packages/device-agent
bun install
```

## Local Development

Start the Electron app in development mode with hot-reload:

```bash
bun run dev
```

This launches electron-vite in dev mode. The main process and renderer will
hot-reload on file changes. It also runs as part of `turbo dev` from the
monorepo root.

> **Note:** If `bun run dev` fails with "Electron uninstall", run
> `node node_modules/electron/install.js` from the monorepo root to download
> the Electron binary. This is handled automatically by the `postinstall` script
> on fresh installs.

## Type Checking

```bash
bun run typecheck
```

## Building

Build the app (compile TypeScript, bundle with Vite) without packaging:

```bash
bun run build
```

## Packaging Installers

### macOS (.dmg)

```bash
bun run package:mac
```

Produces a `.dmg` (universal binary for Apple Silicon + Intel) in the `release/` directory.

### Windows (.exe)

```bash
bun run package:win
```

Produces an NSIS `.exe` installer in the `release/` directory.

### Both Platforms

```bash
bun run package:all
```

> **Note:** Cross-compilation has limitations. Building a `.dmg` requires macOS, and
> building a `.exe` works best on Windows (or via CI). The CI workflow handles
> platform-specific builds automatically.

## Tray Icons

The system tray requires PNG icons in the `assets/` directory:

| File | Size | Purpose |
|------|------|---------|
| `tray-green.png` | 16x16 | Compliant status |
| `tray-red.png` | 16x16 | Non-compliant status |
| `tray-gray.png` | 16x16 | Unauthenticated / checking |
| `icon.png` | 256x256 | App icon |
| `icon.icns` | - | macOS app icon (multi-resolution) |
| `icon.ico` | - | Windows app icon |

On macOS, tray icons should be **template images** (monochrome black with
transparency). Provide `@2x` variants (32x32) for Retina displays by naming
them `tray-green@2x.png`, etc.

The app handles missing icons gracefully by falling back to an empty image.

## Code Signing

### macOS

Set these environment variables (or CI secrets) for code signing and notarization:

```bash
CSC_LINK=<base64-encoded .p12 certificate>
CSC_KEY_PASSWORD=<certificate password>
APPLE_ID=<your Apple ID email>
APPLE_APP_SPECIFIC_PASSWORD=<app-specific password>
APPLE_TEAM_ID=<your team ID>
```

The `assets/entitlements.mac.plist` configures the required entitlements for
hardened runtime (JIT, network access, etc.).

If these are not set, the build proceeds unsigned (fine for local development).

### Windows

Set these environment variables for Authenticode signing:

```bash
CSC_LINK=<base64-encoded .pfx certificate>
CSC_KEY_PASSWORD=<certificate password>
```

## Auto-Updates

The app uses `electron-updater` to check for updates from GitHub Releases.
The `publish` config in `electron-builder.yml` controls where update metadata
is fetched from.

When a new GitHub Release is created (via CI or manually), the app will detect
it on next launch and prompt the user to update.

## CI / Releases

Releases are automated via GitHub Actions. Push a tag matching `device-agent-v*`
to trigger a build:

```bash
git tag device-agent-v1.0.0
git push origin device-agent-v1.0.0
```

The CI workflow will:
1. Build on macOS (produces `.dmg`)
2. Build on Windows (produces `.exe`)
3. Create a GitHub Release with both artifacts attached

See `.github/workflows/device-agent-release.yml` for details.
