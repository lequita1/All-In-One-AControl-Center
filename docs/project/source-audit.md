# Android Control Center — source and readiness audit

Checked: 26 October 2026 (Asia/Singapore). Status: initial static audit; no application build, dependency installation, or phone testing performed.

> Historical inspection snapshot. Current audience, milestones and gate placement are maintained only in [roadmap.md](roadmap.md); actual check results are recorded in [verification.md](verification.md). Licensing/provenance findings below remain open but do not all block personal feature work.

## Assessment

The public Escrcpy foundation is a reasonable starting point for USB/wireless device management, external scrcpy mirroring, file exploration, and APK installation. It is **not evidence that all features advertised for the distributed application can be rebuilt from this source**. Proceed with a build-readiness gate before feature development.

Local checkout: `E:/Projects/Self/android-control-center`.

Upstream tag: `v3.3.1`, resolved locally to **`e35972b46e1ec6724815fd13d1ef1c5b1aa0272f`**, commit dated 10 October 2026, subject `feat: 🚀 Release v3.3.1 base source code`.

The initial checkout had no tracked changes. The later initializer changed only `AGENTS.md` and added continuity files; the remaining additions are planning documents and evidence. Application source and packaging configuration remain unchanged.

Sources: [upstream release](https://github.com/viarotel-org/escrcpy/releases/tag/v3.3.1), [pinned source tree](https://github.com/viarotel-org/escrcpy/tree/e35972b46e1ec6724815fd13d1ef1c5b1aa0272f), and inspected local files named below. Treat README claims and upstream AGENTS.md as navigation hints, not verified implementation facts.

## Repository destination

User selected account `lequita1` and repository [All-In-One-AControl-Center](https://github.com/lequita1/All-In-One-AControl-Center). Public GitHub API inspection returned `private: false`, `fork: false`, default branch `main`, size zero. Its contents endpoint explicitly reported an empty repository, and `git ls-remote` returned no refs. This verifies current public emptiness; authenticated write access is unverified. No repository was created by this session.

Local `origin` still points at upstream because this is an audit checkout. **Do not push to it.** Configure `upstream` and the user's `origin` only in the approved initialization step. Do not infer GitHub ownership from local Git author settings.

Recommendation: use the existing independent repository, preserve upstream commit history, and record the imported tag and SHA. A GitHub fork would also aid upstream contributions, but is unnecessary given this destination. Public upstream forks must remain public; an independent derivative gives separate repository management. See [GitHub fork visibility](https://docs.github.com/en/pull-requests/reference/forks).

## Environment

| Item               | Observed state                                                 | Consequence                                                                                       |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Windows            | x64, version reported by runtime as 10.0.26200                 | Suitable architecture; verify product edition during packaging                                    |
| Git                | 2.55.0.windows.3                                               | Available                                                                                         |
| Node.js            | 24.20.0                                                        | Available; upstream `.nvmdrc` requests 24.12.0                                                    |
| npm                | 11.19.0                                                        | Available; do not use it to resolve this pnpm workspace                                           |
| pnpm               | 11.25.0 via existing runtime wrapper                           | Does not match upstream 10.29.2; use a project-scoped pinned version                              |
| GitHub CLI         | Installed, signed out                                          | Public reads work; publishing needs authentication as the selected account                        |
| ADB / scrcpy       | Not on PATH; Windows binaries exist in source resources        | Missing PATH tools do not by themselves block the app                                             |
| Python             | Existing Graphify environment runs Python 3.12.14              | Use installed environment for continuity tooling                                                  |
| Native build tools | `cl` not on PATH; standard Visual Studio directories not found | Full installation status unverified; install only if actual native rebuild requires it            |
| E: free space      | Approximately 120 GB at check                                  | Enough for initial checkout and build attempt, not a guarantee of all toolchain needs             |
| Test phone         | User reports POCO X3 NFC, Android 12                           | USB cable, drivers, debugging authorization, and wireless-debugging availability still unverified |

The JavaScript workspace requests Electron 42.1.0, Vite 8.0.16, Vue 3.5.41, TypeScript 6.0.3 and pnpm 10.29.2. These are source declarations, not installed or registry-availability verification. Root and desktop packageManager fields contain different integrity suffixes for the same pnpm version; validate them against official package metadata before installation. Preserve the discrepancy in baseline evidence.

No Android Studio, Java SDK, or full Android SDK is established as necessary for the existing desktop build. Additional tools may be needed if rebuilding bundled Android/native components rather than reusing audited releases. USB OEM drivers may be needed for this phone.

## Architecture actually present

| Area              | Source evidence                                                          | Finding                                                                                    |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Workspace         | `package.json`, `pnpm-workspace.yaml`, `turbo.json`                      | pnpm + Turborepo monorepo                                                                  |
| Desktop           | `desktop/electron/main.js`, `desktop/src`, `desktop/pages`               | Electron main process; Vue 3 frontend, mostly JS/JSDoc                                     |
| UI                | `desktop/package.json`, `desktop/uno.config.js`                          | Element Plus, UnoCSS, VueUse, Pinia; reuse these initially                                 |
| Windows           | `desktop/vite.config.js`, `desktop/electron/modules/index.js`            | Actual entries/modules are main, control, explorer, terminal                               |
| Shared packages   | `packages/`                                                              | adbx, electron-ipcx, electron-setup, shared, unocss-preset-shades                          |
| Device operations | `desktop/electron/middleware/adb/index.js`, `packages/adbx/src/index.ts` | adbkit + yadb fallbacks; much privileged behavior is initialized inside preload middleware |
| Process execution | `desktop/electron/helpers/shell/index.js`, middleware adb/scrcpy         | Child-process lifecycle helpers, including shell-enabled string commands                   |
| Binaries          | `desktop/electron/resources/extra`                                       | Checked-in ADB, scrcpy, FFmpeg DLLs, SDL, libusb, gnirehtet, yadb and Android server files |

No project code graph exists. Direct source inspection is adequate for this first audit; a future Graphify index must be scoped to this checkout and record the indexed revision. Canonical Obsidian notes are initialized separately; no automatic synchronization service is implied.

## Feature inventory

“Source present” means an inspected code path exists; it does **not** mean implemented to our requirements, automatically tested, or hardware verified.

| Requirement                                                            | Static evidence                                                              | Current assessment                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| USB device list and changes                                            | adb middleware `getDeviceList`, `watch`; device store/view                   | Source present; unauthorized/offline/reconnect UX needs verification                                       |
| Wireless pair/connect/discovery                                        | adb middleware `pair`, `connect`, scanner helpers; wireless-group components | Source present; Android 12 hardware validation required                                                    |
| External mirroring and keyboard/mouse                                  | scrcpy middleware `mirror`, `launch`; device mirror action                   | Source present; binary and hardware compatibility unverified                                               |
| Embedded mirroring                                                     | No `packages/wscrcpy`, no mirror page or module in actual entries            | Not available in inspected public tree; build independently later using legally reusable public components |
| Screenshot and recording                                               | adb `screencap`, scrcpy `record`, screenshot/record UI                       | Source present; audio and codec capabilities device-dependent                                              |
| Clipboard/control options                                              | adbx clipboard operations and scrcpy preferences                             | Partial source support; validate each mode, direction, and permission                                      |
| App listing and launch                                                 | app-selector, `use-start-app`, scrcpy `getAppList`                           | Source present; not a complete application manager                                                         |
| APK install and uninstall                                              | install UI; adb/adbx install and uninstall wrappers                          | Install UI present; safe uninstall workflow and confirmation still need acceptance coverage                |
| System/user filters, icons, force stop, enable/disable, splits, export | No complete management path established in review                            | Planned; do not infer from command presets or translation strings                                          |
| File browse/upload/download                                            | explorer page, readDirWithStat, uploader/downloader                          | Source present, including progress/cancellation infrastructure                                             |
| File create/rename/move/delete                                         | `use-explorer/modules/use-file-operations.js` and explorer components        | Source present; quoting, confirmation and permissions need hardening/verification                          |
| Device basics                                                          | battery parser, screen-size and property helpers                             | Partial source support; full RAM/storage/network dashboard is planned                                      |
| Developer terminal                                                     | terminal module, session/provider helpers                                    | Source present; command history/logcat/diagnostics need individual scope review                            |
| Backup center                                                          | Transfer primitives only                                                     | Planned; accessible files and APKs only, no unrestricted private data backup                               |
| Automation / AI Copilot                                                | Missing automation/copilot pages and modules; no madb package                | Not available as complete public features; defer automation, exclude cloud AI dependencies                 |

## Build and dependency risks

1. **No tracked dependency lockfile.** `.gitignore` ignores pnpm-lock.yaml. Wildcards and transitive dependencies can resolve differently on every installation. Existing release-assets CI uses `pnpm install --frozen-lockfile`, which is inconsistent with this checkout. Capture an unchanged attempt before introducing and tracking a lockfile on a repair branch.
2. **Absent packaging resource.** `desktop/electron-builder.config.js` lists `../packages/madb/dist/index.mjs` although `packages/madb` is absent. Confirm electron-builder behavior in the baseline attempt. It is a static risk, not an observed build failure. Any cleanup is a documented baseline repair, not an unchanged build.
3. **Advertised/private features differ.** README states some advanced features are in private EscrcpyX. Root AGENTS.md describes packages and entries absent in the public tree. Do not install private extensions or copy proprietary distribution code to fill gaps.
4. **Native modules.** sharp and node-pty require compatible platform artifacts; install scripts and build allowlists need inspection. Electron native ABI compatibility and packaging must be tested on Windows x64.
5. **Broad defaults.** Windows packaging includes x64 and arm64, NSIS, ZIP and portable. First target is x64; pass an explicit x64 selection, leaving wider builds for later.
6. **Inherited release automation.** Workflows reference upstream repositories/secrets and can publish on pushes/releases; builder and updater point at viarotel-org/escrcpy. Review and neutralize these in the derivative before first push. No upstream release workflow has been run here.
7. **Test coverage.** No root test script. electron-ipcx contains Vitest tests; packages expose typecheck commands. Neither tests nor typechecks have run. No physical validation exists.

## Security and offline risks

- `packages/electron-setup/shared/template.ts` defaults `nodeIntegration: true`, `sandbox: false`. Context isolation is not explicitly disabled there; verify effective settings rather than claiming it is off.
- Preload exposes broad ADB/scrcpy/store/path/Electron surfaces through `$preload`; device operations are not yet consistently confined to narrow main-process services.
- ADB and scrcpy middleware use shell-enabled interpolated strings. File operations interpolate remote paths into Android shell commands. Host argument safety and Android-shell escaping are separate requirements.
- Existing IPC file/path handlers need sender validation, canonical path containment, and narrow allowed inputs. No exploitation was attempted; these are code-review findings.
- Review updater ownership, external links, logging and any analytics/dependency usage before claiming offline/privacy compliance. A `ga-gtag` dependency alone does not prove runtime telemetry.

Follow [Electron's security recommendations](https://www.electronjs.org/docs/latest/tutorial/security): isolated/sandboxed renderers, minimal bridge APIs, sender validation, restrictive navigation/CSP, current audited dependencies. Migrate incrementally behind regression checks; preserve an unchanged reference for comparison.

## Licensing and redistribution

The checked-in top-level [LICENSE](https://github.com/viarotel-org/escrcpy/blob/e35972b46e1ec6724815fd13d1ef1c5b1aa0272f/LICENSE) is Apache-2.0. Its terms permit derivatives and redistribution subject to its conditions: retain the license and relevant notices, identify modified files, and carry NOTICE attributions if supplied. Trademark rights are not granted. Recommendation: retain Apache-2.0 for inherited source and initial derivative work; use our own product identity once branding starts.

That license is not blanket clearance for every bundled binary, library, asset, or private extension. No tracked NOTICE or component-specific license inventory was found in the audited tree. Local workspace manifests omit license fields. Before distributing:

- Resolve the complete dependency tree, generate an SBOM/license inventory, examine exact package licenses and vulnerabilities, and record unresolved findings.
- Establish origin, exact versions, SHA-256 hashes, license texts and redistribution obligations for Windows/Android binaries and DLLs, especially FFmpeg and its actual build options. Checked-in hashes identify bytes, not provenance or license compliance.
- Verify ADB/platform-tools distribution terms and the exact scrcpy, SDL, libusb, gnirehtet and yadb notices; preserve required source/source-offer obligations if applicable to a particular build.
- Distinguish “free to use the release” from “source available under a redistribution license.” Do not depend on private EscrcpyX or paid AI services.

This is a technical license assessment, not a completed distribution clearance. Release remains gated on the exact shipped inventory.

## Outcome

Completed: pinned public source checkout, static architecture/feature review, environment and destination checks, planning continuity setup. Evidence: `readiness-evidence.json` plus files above.

Remaining Phase 0: full resolved dependency/license/binary provenance review, baseline build feasibility, phone prerequisites, and technical-plan approval. No installed dependency tree, executable build, CI success, release, or hardware success is claimed.
