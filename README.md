# Android Control Center

A personal-first Windows x64 Android management application derived from [Escrcpy](https://github.com/viarotel-org/escrcpy). Built with Electron, Vue 3, ADB and scrcpy. Normal use does not require root.

## Current state

The initial Windows portable baseline builds and launches. USB detection and POCO X3 NFC (Android 12) mirroring, mouse and keyboard were verified by the owner. Application/file management integration, connection hardening and the wider roadmap are in development. Embedded mirroring is not implemented in this public source.

**Security hardening is in progress.** A dependency audit found inherited advisories; see [security status](SECURITY.md). This source checkpoint is not a security-certified release or a promise that every upstream feature works. No binaries are published automatically.

## Develop

Use Node 24 and pnpm 10.29.2. Inspect lifecycle scripts and dependency changes before installation. Versions and test outcomes are recorded in the [verification log](docs/project/verification.md).

```powershell
pnpm install --frozen-lockfile
pnpm exec turbo run build
pnpm -r --if-present typecheck
pnpm --filter @escrcpy/electron-ipcx exec vitest run
pnpm lint
pnpm dev
```

For a local Windows x64 portable build, after building workspace/app outputs:

```powershell
pnpm --filter escrcpy exec electron-builder --config=./electron-builder.config.js --win portable --x64 --publish=never
```

Enable USB debugging on your own Android device and approve the computer on the phone. Existing ADB services can conflict; do not stop another application's service without checking the impact.

## Project records

- [Roadmap and current scope](docs/project/roadmap.md)
- [Verification log](docs/project/verification.md)
- [Architecture](docs/project/technical-plan.md)
- [Initial source audit](docs/project/source-audit.md)
- [Original requirements](docs/project/project-brief.md)

Only the roadmap owns live scope; only the verification log owns check results. Local canonical memory paths are kept in an ignored pointer.

## Attribution

Derived from Escrcpy v3.3.1, imported at `e35972b46e1ec6724815fd13d1ef1c5b1aa0272f`. Original history, license and attribution are preserved. See [LICENSE](LICENSE), [NOTICE](NOTICE) and the [upstream README snapshot](docs/project/upstream-readme.md). Third-party binary/license provenance remains a distribution gate; this repository is not an endorsement by upstream maintainers.
