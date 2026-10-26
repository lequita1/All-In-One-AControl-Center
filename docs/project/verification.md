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

## 26 October 2026 — source publication and Phase 2 security checkpoint

Authorization: user requested pushing to the selected repository, continuing the roadmap, creating a goal covering it and strengthening runtime/source-intake security. GitHub CLI authentication completed; account `lequita1` and repository ADMIN access verified. No token was printed or committed.

Publication: reviewed baseline `d564f9e7` and publication preparation `41a21ca07d79190c2747b9fc387d3e2f81467392` pushed to `origin/main`, then confirmed through GitHub's commit API. Repository default branch is `main`; active inherited workflows: zero. Six inherited release/sync/deployment workflows were disabled before pushing. Upstream push URL remains `DISABLED`. Own unpublished baseline author was corrected to the GitHub no-reply identity before the first push; attribution/history/license were preserved. No release or binary upload occurred.

Runtime/dependency source checkpoint: `430075c1d825a1e2bc4c72ae13c7ed0736780c2b` on `feat/secure-device-operations`, followed by the packaging exclusion correction below. Node 24.20.0, pnpm 10.29.2, Vitest 4.1.12, Electron 42.11.16, Vite 8.1.6.

### Verified automated results

- `pnpm install --frozen-lockfile --offline --ignore-scripts`: exit 0; lock resolution skipped, already up to date. Reviewed full installation ran earlier with allowed native lifecycle scripts; this later check did not repeat scripts.
- `pnpm test`: exit 0, **86 tests across nine files**, including two existing IPC tests. New tests use actual parsing/middleware/adbx logic with external process/device I/O replaced. A/B injected transports record their own commands; invalid targets must be rejected before transport lookup. This is not a two-phone hardware test.
- Tests were observed failing before fixes: hostile/override arguments, unhandled mirror startup rejection, split readiness output, startup timeout, stale/unowned process termination, invalid targets/endpoints, automatic shared-server shutdown, untargeted tether stop, abbreviated selectors, discovered-device disconnect and callback-based cancellation. Later full suite passes with no unhandled errors.
- `pnpm lint`: exit 0 after correcting actual style/regex findings. `pnpm -r --if-present typecheck`: all five package checks pass.
- `pnpm exec turbo run build`: all six tasks pass. One packaging-preparation run failed writing generated `desktop/components.d.ts` with filesystem error `UNKNOWN`; inspected the file, then repeated the build sequentially without source repair and all six tasks passed. Cause unproven; do not label it an application defect or claim a specific external process caused it.
- `pnpm audit --json`: **one high**, zero critical/moderate/low, down from the initial 51 matches. Remaining node-forge advisory has no published patch; its optional adbkit bridge verification path and lack of app callers are recorded in [intake evidence](security-intake.md). It is not suppressed or declared fixed.
- Independent branch review found two important regressions, both corrected with failing-then-passing tests: getopt long-option abbreviations could replace the selected serial, and discovered wireless serials were incorrectly validated as hostnames. Review also identified inherited callback-based termination misuse; cancellation now awaits the actual callback and preserves ownership on failure.
- Staged publication scan found no common credential patterns, local user path or test-device serial. `git diff --cached --check` passed. Local tooling and device logs remain ignored.

Sanitized local execution logs are under ignored `.baseline-logs/`: `security-final-tests.log`, `security-final-types.log`, `security-lint-final-pass.log`, `security-build-retry.log`, `security-frozen.log`, `security-audit-final.json`; failed regression runs have separate descriptive `*-red.log` files. These machine-local logs are not uploaded. Public verification is described here and can be reproduced from the committed tests.

### Scope and remaining checks

Host commands use resolved executables plus argument arrays and prohibit a host shell. Targeted scrcpy APIs reject selector overrides and abbreviations; custom options require long names. Startup failures settle once, readiness handles split chunks and waits are bounded. Child cleanup skips closed/unowned processes and waits for callback-based termination. App exit/tool-directory changes no longer automatically stop the shared ADB server. Global reverse-tether cleanup uses explicitly tracked session targets; its relay remains app-wide and has no multi-phone hardware claim.

Official Windows tool comparisons and Defender scan evidence are in [security-intake.md](security-intake.md). The runtime was changed after the Phase 1 hardware test: **fresh launch/POCO mirroring/input and wireless/reconnect checks remain pending for the new artifact**. The earlier user confirmation applies to the retained baseline only. Broad Electron/IPC privileges, Android-side package/path command safety, full binary provenance and conditional distribution gates remain open in the roadmap. No claim of complete security or public release readiness.

### Portable package inspection

Built x64 portable with the existing builder configuration and an ignored wrapper changing only its output directory, using `pnpm --filter escrcpy exec electron-builder --config=../.local-tools/electron-builder-security-verified.config.mjs --win portable --x64 --publish=never`: exit 0. Conditional foreign-platform optional-dependency warnings remain; these do not establish runtime success on other platforms.

An earlier package inspection found **34 entries from the prior baseline build** inside `app.asar`, pulled in by native-module globs. Added an explicit `dist-release` exclusion in `desktop/build/native-modules.js`, rebuilt into a separate directory, then inspected with `@electron/asar.listPackage`: 260 entries, **zero prior-build entries**, zero foreign-platform node-pty entries. The failed intermediate artifact remains local and is not the checkpoint artifact.

Verified artifact: `desktop/dist-release/security-verified/Escrcpy-3.3.1-win-portable-x64.exe`, **114,031,703 bytes**, SHA-256 `e0fac46bec2971f5314b6de602c98a5b7d88e11916838b6a0dc7e8e2d2403545`. Authenticode status: **NotSigned** despite builder signing-step log messages. Packaging log: ignored `.baseline-logs/security-portable-verified.log`. No new launch, live mirror or input result is claimed for this file.


## 26 October 2026 — connection workspace checkpoint

Source: connection workspace changes on `feat/secure-device-operations`, based on `1c820443977c016c621d42dcb7ba0108a8aaa0ea`; reviewed in the existing draft PR #1. This is a Phase 2 increment, not a full-roadmap completion or release.

### Automated checks and review

- `pnpm test`: exit 0, **120 tests across 15 files**. Coverage adds selected-target persistence, stalled/stale refreshes, tracker authorization changes and late/disposed subscriptions, per-target metadata responses, partial/unsupported metrics, output limits/timeouts, managed-frame/page validation, mirror error feedback and real English/Chinese locale loading with message interpolation.
- Targeted regressions were observed failing before fixes for stale tracker events, unguarded captured actions and the observed wireless name-field layout. Guarded menu/queued mirror actions reject stale, refreshing, unauthorized and missing targets; changing the selector does not retarget a captured action.
- `pnpm -r --if-present typecheck`: all five package checks passed. `pnpm exec turbo build`: all six tasks passed after final code and locale changes. Logs: ignored `.baseline-logs/connection-tests-complete.log`, `connection-typecheck-final.log`, `connection-build-complete.log`.
- A fresh-context reviewer found two important issues: an already-open teleported More menu escaped table `inert`, and queued auto-mirroring did not check refresh loading. Both now use the same current-target readiness check at invocation; reviewer confirmed the fixes. Serial display/search was added to distinguish same-named devices. Hidden batch controls are inert and hidden from accessibility when no valid selection exists. Pending dialogs in inherited app/file operations remain for their feature phases.

### Packaged observations

An x64 unpacked preview was launched with a disposable portable-data profile. The first UI inspection exposed translation keys instead of labels even though packaged locale files existed. The updated backend's filesystem templates use `{{lng}}` independently of message interpolation. A real-locale regression failed before correcting the path and passed afterward; a rebuilt preview displayed readable labels, setup guidance and navigation.

Inspected the real 800px-wide dark and light screens, Preferences navigation and the maximized 1920px layout. The sidebar collapses at the narrow size, the wireless footer wraps, window controls remain separate and the disconnected target retains its identity with mirroring disabled. These observations initially used the preview before the review guard/selector-detail fixes; final checkpoint observations follow below.

During inspection, the POCO appeared on the existing ADB service over wireless. The new narrow service returned model M2007J20CG, Android 12, battery 84% (later 83%) and screen 1080 × 2400. It subsequently appeared offline with its selected target retained. No shared server was stopped or replaced. This establishes a live read-only metadata observation, not a USB/wireless reconnect reliability or mirror/input pass for the changed build.

The wireless list returned positional fields shifted by an omitted path column (`product:` in path, `model:` in product, `device:` in model). Name display now selects the explicit `model:` token first; a regression covers normal and shifted responses. Device addresses and identifiers remain in ignored local profiles, not this public log.

Remaining: fresh changed-artifact mirroring/input verification, fuller USB/wireless authorization/reconnect coverage and embedded-mirroring decision. Broad renderer/IPC privileges, Android package/path mutation boundaries, remaining advisory/provenance and sharing gates are still open. No security-complete or public-release-ready claim.


Final portable packaging: `pnpm --filter escrcpy exec electron-builder --config=../.local-tools/electron-builder-connection.config.mjs --win portable --x64 --publish=never` exited 0. The ignored wrapper only changes the output directory. Artifact `desktop/dist-release/connection-checkpoint/Escrcpy-3.3.1-win-portable-x64.exe`: **114,041,227 bytes**, SHA-256 `4976a39a58129ae00614f8c64c85dc5411dbe3ec20b6bf2988acb1fec5817281`, Authenticode **NotSigned**. A copied launch-test artifact has the same SHA-256. No executable uploaded or release published. `pnpm lint` exited 0 after final changes (`connection-lint-complete.log`).


Final archive inspection with installed `@electron/asar`: 260 entries, zero prior-output entries, zero foreign-platform node-pty entries. Launched the matching copied portable itself, not only the unpacked executable. With automatic wireless connection disabled in its disposable profile, two synthetic offline USB IDs verified long-label wrapping at 800px, readable serial detail, serial-based filtering and keyboard selection of the second target. The summary changed to that exact target and kept mirroring disabled; hidden batch actions disappeared from the accessibility tree. Devices, Preferences and About navigation rendered. These are UI fixtures, not two-phone hardware evidence; no fixture device command was sent.
