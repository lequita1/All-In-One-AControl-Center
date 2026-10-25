# Android Control Center — verification record

## 26 October 2026 — planning/readiness checkpoint

Scope: repository/source inspection and documentation only. No application behavior is certified.

- Public clone completed; HEAD resolves to v3.3.1 SHA `e35972b46e1ec6724815fd13d1ef1c5b1aa0272f`.
- Source tree inspected: 536 tracked files, five workspace packages, three auxiliary renderer pages plus main entry.
- Initial source checkout was clean. Application/config paths remain unchanged after planning; changes are continuity instructions and documentation.
- Environment versions, package/page inventory and Windows binary SHA-256 values captured in `readiness-evidence.json`. Binary hashes do not establish trusted provenance.
- Selected GitHub repository inspected through public API and Git refs: public, independent, empty. CLI signed out; write access unverified. No remote changes or pushes performed.
- Canonical memory initialized/read/updated using schema-v2 note paths; topic linked to evidence-backed decisions and lesson, project maps/index/colors refreshed. No Graphify code graph generated.
- Independent builder review found one sequencing issue: shared packages must build before downstream typechecks/app checks because exports use generated dist files. The readiness plan now includes a Turbo dependency-ordered build.

Not run: dependency installation, lint, typechecks, IPC tests, application build, Windows packaging, executable launch, CI, USB/wireless/mirroring/file/app operations, release publication.

Next verification is governed by the current roadmap; this historical checkpoint is not a milestone gate.

## Recording future checks

For each meaningful check record date, source SHA, tool versions, exact command/manual procedure, result/exit code, artifact or sanitized log location, and limitations. Use separate records for reference, repaired baseline, automated verification and hardware verification. Never mark a checklist complete from a plan or agent assertion alone.

## 26 October 2026 — external planning review and scope correction

User confirmed: **personal use first; consider distribution later**. No implementation approval was given by that answer.

Review verified against source: adbx accepts an injected client (`packages/adbx/src/types.ts`, `src/index.ts`); mockable Electron tests already exist in electron-ipcx; file create interpolates a double-quoted remote path; scrcpy host command uses string interpolation; renderer template enables Node integration and disables sandboxing. No exploit or runtime test performed.

Plan revised: roadmap owns live scope/gates and feature classification; verification log owns observations. Phase 1 is frozen installation, passing existing checks, portable build/launch and POCO USB mirroring/control. Distribution engineering moved to the conditional sharing gate. App/file command hardening is part of Phases 3/4; targeting uses an injected mock transport and mocked host launcher. Embedded work has a proposed four-hour spike with user go/no-go; upstream merge difficulty is a tradeoff, not a proven impossibility.

The initial brief/audit/evidence are retained as snapshots. Technical plan now holds architecture only; the old Phase 0–1 checklist links to roadmap rather than duplicating gates. Vault notes will link to these records. Application/configuration source remains unchanged; no dependencies/builds/device operations/remote changes in this review.

## 26 October 2026 — approved lean baseline execution

Approval: user said “approve” after the personal-first revision. Working branch: `chore/windows-baseline`, based on the imported SHA above. Local origin now points at the selected user repository; upstream push URL is `DISABLED`. No push or release performed.

### Reference and minimal repairs

- Requested pnpm 10.29.2 installed in ignored project tooling; official npm metadata checked. Node 24.20.0 used as recorded variance from upstream 24.12.0.
- Unchanged manifests installed successfully without a pre-existing lockfile; dependency-ordered `pnpm exec turbo run build` passed all six tasks.
- Original package typecheck failed on a misplaced `@ts-expect-error` in `electron-ipcx/shared/errors.ts`; moved it to the property assignment it suppresses, preserving behavior.
- Existing tests failed before collection with Vitest 2 and overridden Vite 8. Pinned Vitest 4.1.12, whose declared peers accept Vite 8/Node 24; both existing IPC tests now pass. Sandbox temp-file rename caused EPERM, so final test run used ordinary host permissions.
- Lint found a reserved `Install` component name, dependency sorting, and document/snippet formatting. Renamed import/registration/dynamic lookup consistently to `ApkInstall`, applied formatting, preserved original brief bytes with a narrow formatter exclusion. No new feature behavior added.
- Corrected the desktop pnpm integrity suffix to the root value verified against registry metadata. Lockfile is now tracked rather than ignored; local tooling/logs/memory pointer remain ignored.
- Packaging confirmed missing madb resource was a warning, not a build failure; removed the absent, unused resource entry. Production and development feeds/cache point only to the derivative repository; all builds used `--publish=never`. Portable update checks lack an app-update.yml and report a caught error; no working update channel is claimed.

### Final software checks

| Check                | Command / method                                                                                    | Result                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Fresh frozen install | Preserve old root node_modules in ignored project cache; `pnpm install --frozen-lockfile --offline` | Exit 0; resolved from lockfile/cache, lifecycle/native setup completed                    |
| Workspace/app build  | `pnpm exec turbo run build`                                                                         | Exit 0; six tasks passed                                                                  |
| Package typechecks   | `pnpm -r --if-present typecheck`                                                                    | Exit 0; all five packages passed                                                          |
| Existing IPC tests   | `pnpm --filter @escrcpy/electron-ipcx exec vitest run`                                              | Exit 0; 2/2 tests passed                                                                  |
| Lint                 | `pnpm lint` after fresh install                                                                     | Exit 0                                                                                    |
| Portable packaging   | electron-builder, Windows portable x64, publish never                                               | Exit 0; final artifact below                                                              |
| Runtime              | Visible portable window inspected through Windows accessibility/screenshot                          | Main UI renders; connected POCO appears as M2007J20CG                                     |
| Review               | Independent read-only review of repair diff and lock metadata                                       | No Critical/Important or outstanding Minor findings; not a substitute for hardware checks |

Logs live under ignored `.baseline-logs/` (install-reference, build-reference, typecheck-reference, tests-reference; install-frozen-clean, build-repair, typecheck-final, tests-final, lint-frozen, package-final). Intermediate commands and failures are preserved there. Lint briefly failed during the root dependency-directory move; the post-install run above passed.

Final artifact: `desktop/dist-release/baseline/Escrcpy-3.3.1-win-portable-x64.exe`, 111586463 bytes, SHA-256 `7689a03d4ef2cd9eda7843f586111cf23b8fd84a94d2d384df9a9f49ece1a2df`, Authenticode `NotSigned`. This is the upstream-branded personal baseline, not a public Android Control Center release.

The first output folder had a Windows DLL lock from a test launch. The final packaging used an ignored local config extending the tracked builder configuration with only `directories.output = 'dist-release/baseline'`. The ambiguous short CLI override was rejected as a filename; no source workaround was introduced. Public distribution/installer/CI/clean-machine testing remains deferred.

### Physical-device result and current limit

User connected the POCO and accepted USB debugging, including Always allow. adbkit reads the connected model and Android 12 successfully; the app UI shows Connected. At the initial attempt, screen mirroring and input had not passed; the final user-verified result below supersedes that pending status.

Actual mirror attempt failed with ADB server protocol 40 versus bundled client 41; the CLI restarts the shared server, then scrcpy reports Unauthorized/server connection failure. A separate local ADB port saw no device. Returning through the existing adbkit transport succeeds. A mirror failure also surfaced an unhandled rejection in the inherited preload path; retain it as a known error-handling issue for the connection milestone rather than claim it fixed.

An installed ADB client was found at `C:/Program Files/SuperDisplay/adb/adb.exe`. Its responsibility for the running service is a hypothesis, not proven: process path/parent metadata were unavailable. Automatic approval review rejected testing that client against the shared service because it could restart/replace the service and disrupt SuperDisplay. No SuperDisplay client was executed, no service stopped, and no system driver/settings changed. That alternative compatibility test would need explicit approval if still required; the final working mirror made it unnecessary. Existing port-5038 service created for diagnosis was stopped.

Final result: the rebuilt portable launched visibly; Windows enumerated its Escrcpy window and a device-specific scrcpy mirror window. The user then explicitly confirmed **“Video, mouse, and keyboard all work.”** This is user-performed hardware verification on the POCO, separate from our automated checks. The assistant did not independently inspect decoded video or send test input after the user took control/minimized the mirror. No SuperDisplay compatibility test or service stop was needed.

Phase 1 lean gate is complete: frozen install, checks, portable build/launch, and user-verified POCO video/input. Scope of this pass is one Windows PC and one phone; wireless, reconnection robustness, other feature workflows and public release readiness are not yet verified. Retain the initial server-version/authorization churn and inherited mirror rejection handling as connection-hardening follow-up items.
