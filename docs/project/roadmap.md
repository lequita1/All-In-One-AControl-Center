# Android Control Center — roadmap

Updated: 26 October 2026. **Current direction: personal use first; consider distribution later** (user confirmed). Revised lean baseline sequence approved by the user on 26 October 2026; Phase 1 lean baseline complete; next milestone is Phase 2.

This is the single current source for scope, milestones, work classification, open decisions and next actions. Actual observations/check results belong only in the [verification log](verification.md). [Technical plan](technical-plan.md) holds stable architecture, [source audit](source-audit.md) is a dated snapshot, and [original brief](project-brief.md) remains the immutable initial request. Historical audit conclusions do not override newer scope decisions here.

## Product scope and audience

First serve the user's Windows x64 PC and POCO X3 NFC on Android 12. Keep local-first/offline operation, explicit device targets and normal use without root. Aim for a usable personal suite incrementally, preserving proven upstream behavior. A public source repository does not mean we have committed to supporting other users or distributing executables.

The initial functional milestone covers the brief's core device/app/file tasks. Additional diagnostics, backups and automation remain later work. No cloud AI dependency. Embedded mirroring has its own investigation/decision gate below; an external mirroring window can support the earlier personal baseline without claiming the embedded requirement is fulfilled.

Status labels: Planned; In progress; Implemented; Automatically tested; Hardware verified; Blocked. Source-present means inspected code exists, not verified functionality. Current evidence/status of completed checks: [verification log](verification.md).

## Milestone checklists

### Phase 0 — choose and inspect the foundation

- [x] Inspect public baseline, actual feature paths, environment and selected repository; preserve original brief and source evidence.
- [x] Confirm personal-use-first audience and available phone.
- [x] User approves this revised sequence before implementation.
- [x] Validate the requested pnpm version/integrity and inspect install scripts before running them; use a project-scoped toolchain, recording deviations from upstream Node version.

Full resolved SBOM, binary provenance/redistribution review and public release tooling are deferred to sharing. During local setup, record known supply-chain concerns and act on concrete critical findings; personal use does not justify installing known malicious dependencies. The existing public source/license boundary remains in force.

### Phase 1 — usable personal baseline

This is the pre-feature gate, with five outcomes. All five outcomes passed. Hardware video/mouse/keyboard were confirmed by the user in the final portable build; the verification log distinguishes that report from automated checks and records the initial ADB conflict.

- [x] A tracked dependency lockfile supports a clean `pnpm install --frozen-lockfile` using the selected toolchain.
- [x] Dependency-ordered workspace build, lint, existing package typechecks and existing IPC tests pass; record and resolve actual baseline failures.
- [x] A Windows x64 **portable** executable builds.
- [x] That portable executable launches on the user's PC and renders the main UI.
- [x] The POCO connects over authorized USB and mirrors with mouse/keyboard control. If the phone is unavailable, report a software baseline with hardware verification pending; do not call the gate fully passed or claim hardware readiness. Useful independent work may continue with that limit explicit.

Execution order:

1. Preserve imported SHA and a pristine reference (separate checkout if useful); never reset the documentation work. Before any push set safe remotes to the chosen repository/fetch-only upstream and review inherited workflow triggers. Publishing/authentication is not a prerequisite for local feature work.
2. Record the missing-lockfile state once. Resolve unchanged manifests under the pinned toolchain and record results as an unlocked reference attempt. Do not spend time repeatedly demonstrating an already-established missing-lockfile error.
3. Record each actual blocker before minimal repairs: packageManager metadata, missing packaging resources, native build problems or other failures. Track the generated/reviewed lockfile and label changed source/configuration as a repaired baseline.
4. Run `pnpm exec turbo run build` before downstream checks because packages export generated dist files. Run `pnpm lint`, package typechecks and `pnpm --filter @escrcpy/electron-ipcx exec vitest run`.
5. Build only x64 portable: after dependency-ordered build, use `pnpm --filter escrcpy exec electron-builder --config=./electron-builder.config.js --win portable --x64 --publish=never`; inspect the produced architecture. Invocation is planned, not yet verified.
6. Prevent the derivative from installing upstream product updates (disable until an intentional channel exists), launch locally, and run the short POCO USB/mirroring/control smoke check. Verify no account or activation is needed for these core operations.

No installer, Windows CI, SBOM, ten-cycle/five-minute soak test, second phone or clean machine is required to start feature work. Artifact source/tool versions and a portable SHA-256 are cheap evidence to record in the verification log, not a separate release process.

### Phase 2 — connection and interface usability

In progress: user requested runtime/supply-chain security as a first-class requirement and authorized source publication to the selected repository. The baseline is on `main`; security work continues on `feat/secure-device-operations`. See [implementation notes](phase-2-plan.md) and SECURITY.md. A clean scan alone is not proof of safety.

- [ ] Verify existing USB/wireless/mirroring paths before replacing them; fix observed connection/reconnect/authorization defects and show usable errors.
- [x] Improve device selector/navigation and basic information within existing UI conventions. Implemented with automated checks and packaged UI inspection; remaining hardware coverage is recorded separately in verification.
- [x] Establish the mock transport/launcher test seam described below as affected paths are touched, before accepting new targeting behavior. Automated A/B transport isolation, host argv and startup/cancellation tests exist; this is not two-phone hardware verification.
- [ ] Decide embedded mirroring through its isolated spike; do not turn it into a prerequisite for every other feature.

### Phase 3 — application management

- [ ] Verify and reuse existing listing, launch and install paths; build a coherent library and explicit result/confirmation flows.
- [ ] Add missing management operations only after inspecting their existing callers/wrappers.
- [ ] As each path is built or hardened, validate package identifiers, Android user IDs and explicit target serials; test host arguments and any device-shell composition. No unchecked raw command construction in a new ordinary UI action.
- [ ] Test install/launch/uninstall against a disposable APK; cancelling uninstall must send no mutation. Enable/disable needs a safe disposable package and a documented recovery path; avoid arbitrary system debloating.

### Phase 4 — file management

- [ ] Verify existing browse/transfers/manipulation and integrate the required UX, progress and errors.
- [ ] Harden paths/quoting inside the touched file operations before accepting them: spaces, quotes, newlines, command substitutions, leading dashes and rejected traversal/unsupported locations. Keep host and Android path rules separate.
- [ ] Test explicit-target isolation, transfer errors/disconnects/cancellation, and confirmed deletion; round-trip a scratch file and compare hashes on the phone.

### Phases 5–6 — later personal functionality

- [ ] Add useful dashboard diagnostics/system controls and accessible backup/export as actual needs arise; report unsupported data and permissions accurately.
- [ ] Add saved actions/batches/automation after the underlying operations are safe and tested. Revisit scope before scheduling or multi-device orchestration.

### Phase 7 — conditional sharing / public release

Activate before sending executables to other people or publishing downloadable releases. Choosing this audience later needs an explicit scope review.

- [ ] Generate resolved dependency SBOM/license/vulnerability inventory; establish exact binary versions/provenance, required component notices and source/source-offer obligations where applicable. Existing notices must be preserved throughout, including earlier source publication.
- [ ] Test on a clean machine/profile without development Node; installer behavior if an installer will ship; longer launch/idle/disconnect checks and offline operation.
- [ ] Add Windows CI for repeatable checks/packaging, artifact identity/hashes, release/update ownership and appropriate signing decisions. Never claim signing or clean-machine success without evidence.
- [ ] Complete renderer/IPC/command-boundary hardening and security review; expand real-device coverage to match the supported audience.
- [ ] Prepare accurate user documentation, supported-device/OS scope, known limitations and release notes. Publish reviewed artifacts only.

## Existing work versus additions

These are source classifications from the initial audit, not delivery estimates or pass results. Verify behavior first; expand individual tasks only when observed gaps justify it.

| Feature                                                | Existing upstream basis                          | Work in this project                                                       |
| ------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------- |
| USB detection/authorization/reconnect                  | Device middleware/store/view                     | Verification first; defect hardening and connection UX                     |
| Wireless pairing/connect/discovery                     | ADB helpers and wireless UI                      | Verification, error/port guidance and reconnect hardening                  |
| External mirror, keyboard/mouse, screenshot/record     | scrcpy launcher and controls                     | Verification and integration UX; harden host arguments                     |
| Embedded mirror                                        | No public implementation in inspected tree       | Net-new integration; timeboxed spike before commitment                     |
| Navigation/device selector                             | Existing device view/windows                     | UX integration; preserve usable windows                                    |
| Device information                                     | Battery/screen/property helpers                  | Verify/reuse basics; net-new collection/UI for missing metrics             |
| App listing/launch                                     | App selector and launch hooks                    | Verify/harden existing paths; new library/filter/feedback UX               |
| APK install                                            | Install UI and adb/adbx wrappers                 | Verify, harden inputs/targets, improve result UX                           |
| Safe uninstall                                         | Wrapper exists; complete safe UI not established | New confirmation/result UX, wrapper verification and hardening             |
| Enable/disable/force-stop/package detail/export/splits | No complete path established                     | Inspect per task; provisionally net-new beyond reusable primitives         |
| File browse/upload/download                            | Explorer and transfer helpers                    | Verification, path/target hardening and integration UX                     |
| File create/rename/move/delete                         | File operation hooks/UI                          | Verification and command-safety/confirmation hardening                     |
| Terminal                                               | Existing session/provider paths                  | Verification and boundaries; logcat/presets/history evaluated individually |
| Backup profiles and automation                         | Transfer/action primitives only                  | Later net-new orchestration over verified services                         |

## Concrete device-layer test mechanism

Use an **in-process mock transport**, not a full fake ADB server initially. Existing `packages/adbx/src/types.ts` defines `IAdbClient` and `IAdbDevice`, and `createAdbx` already accepts an injected client. Implement a test fixture for the subset consumed by each tested operation; no production abstraction solely for testing.

Fixture has serials A and B, separate call logs/state, configurable stream/error/transfer completion, and disconnect events where consumed. `getDevice(serial)` rejects absent/unknown targets and returns that serial's fixture. Test A selected at operation start then UI selection switches to B: reads/mutations/cancel/retry remain scoped to A and B's log remains empty. Mock tracker/transport behavior for unauthorized/disconnect cases rather than rely on timing sleeps.

For service/preload paths not currently injected, introduce the smallest narrow seam while touching that feature. For host scrcpy/ADB launch, mock the child-process boundary and assert executable/argv, `shell: false`, serial and cancellation ownership. Run tests without executing real device commands.

Adversarial path/package fixtures assert that quoted input cannot add another command. Mock assertions prove command construction, not actual Android-shell parsing; add a harmless scratch-filename hardware check in Phase 4. Invalid package identifiers reject before transport access. Ordinary UI actions cannot use the developer terminal as a bypass.

## Embedded-mirroring decision

**Proposed timebox: four focused engineering hours after the baseline**, excluding downloads/tool waiting. This budget is a proposal, not user approval to run the spike. Keep it in a disposable branch; no production protocol stack or new dependency commitment without the decision.

First inspect existing public, license-compatible scrcpy client/decoder components; it is not established that we must implement a protocol client from scratch. Prototype one Android 12 device's video in an Electron view, pointer/keyboard control, rotation, teardown/reconnect, and basic integration with the security boundary.

Go only if the prototype demonstrates video/input and teardown on the POCO, needs no private/paid code, and exposes a credible maintainable path with license/dependency and remaining-work notes. Stop at timebox even if incomplete. Present measured results, limitations and effort estimate; user chooses adopt, extend the spike with a new budget, or defer embedded mirroring and use an external window. A failed/incomplete spike earns no feature-complete claim. The original embedded requirement remains unresolved until that decision, but does not block unrelated personal features.

## Open decisions and next action

Audience is settled: personal first. Lean baseline implementation approved; embedded spike remains a separate later decision; phone cable/debugging/driver availability is checked during assisted setup. The latest build/test/repository observations are in the verification log, not repeated here.

Next: complete the changed artifact's mirror/input and USB/wireless reconnect coverage when the POCO is available, and continue Phase 3 application-management inspection/hardening independently. Embedded mirroring retains its separate decision gate. On 26 October 2026 the user authorized pushing reviewed source and continuing the full roadmap, explicitly prioritizing runtime and dependency/source security. Implement in verified increments; private extensions and public binary releases still require their respective gates.
