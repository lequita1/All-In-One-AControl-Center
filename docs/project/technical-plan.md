# Android Control Center — technical plan

Updated: 26 October 2026. Lean baseline execution approved on 26 October 2026; wider feature work follows the roadmap. **User-confirmed audience: personal use first; consider distribution later.**

## Read this first

The [roadmap](roadmap.md) is the sole current source for scope, milestone gates, feature work classification, open decisions and next actions. The [verification log](verification.md) is the sole chronological record of checks and outcomes. This document contains stable architecture guidance only; do not copy milestone status here.

The [original brief](project-brief.md) is retained unchanged as the initial requirements record. Where priorities differ, the roadmap records the newer user decision. The [source audit](source-audit.md) and `readiness-evidence.json` are dated inspection snapshots, not live status. Vault notes preserve decisions/reasons and link to these documents instead of restating them.

## Foundation and folders

Extend public Escrcpy v3.3.1 at the SHA recorded in the verification log. Preserve its functioning behavior and pnpm/Turbo workspace, Electron/Vue 3, existing Element Plus/UnoCSS/Pinia conventions, and JS/JSDoc desktop code with TypeScript packages. Do not replace frameworks or convert the whole app to TypeScript.

Keep `desktop/src` for the main UI; `desktop/pages` for current auxiliary windows; `desktop/electron/modules` for feature services; existing middleware as the compatibility boundary; `packages` for actual shared code; and `docs/project` for portable project records. No broad reorganization in the baseline milestone.

Preserve upstream history. After approval, configure the user-selected origin and fetch-only upstream; use short-lived branches and reviewed commits. Upstream workflows must be reviewed before a public push. Keep personal paths, local memory pointers, device data and credentials out of published content. Preserve licenses/attributions for any source publication, even though binary distribution work is deferred.

## Target architecture

- Vue presentation uses existing components/stores and incrementally gains integrated navigation, device selection, activity/errors and accessible confirmations.
- Privileged device and filesystem operations migrate into narrow main-process services as their features are touched. Preload exposes allowlisted contracts rather than arbitrary process/filesystem APIs.
- Retain existing adbkit/adbx transport where practical. Use explicit device serials or a snapshot of the user's selected serials. Discovery/pairing are host operations with validated addresses.
- Launch host binaries with executable/argument arrays without shell expansion. Android shell commands need a separate, tested quoting/validation boundary. A safe Windows argument list does not make an Android shell string safe.
- Mutations that conflict serialize per target. Read-only work has bounded concurrency. Jobs have identity, visible progress/errors, timeouts, cancellation where feasible, and disconnect handling. Never silently retarget or retry destructive commands.
- Confirmation shows the actual device/package/path and consequences. Test destructive operations only on disposable APKs and scratch files. Normal use requires no root and grants no unrestricted private app data access.
- Detect capabilities; unsupported metrics/actions say unavailable. No paid/private Escrcpy extension or cloud service is introduced.

The inherited renderer settings and broad preload remain known risks during the private baseline experiment. Do not add new general-purpose renderer shell access. Migrate settings/bridge boundaries with a narrow smoke test when touching the corresponding surface; resolve any demonstrated critical exploit before expanding its use. Passing the baseline is not a production-security claim.

## Upstream maintenance tradeoff

This is a maintained derivative with increasing divergence. Rewriting privileged middleware will make automatic merges more expensive; it does not prove all upstream updates become impractical. Preserve public interfaces when reasonable, isolate changed files, and prefer selective upstream fixes after inspection. Reassess the cost at each relevant change. No promise of effortless upstream merges, and no unconditional commitment to a complete rewrite.

## Execution boundary

The user approved the revised lean baseline on 26 October 2026. Execute it and evidenced minimal repairs; do not infer permission to publish releases or skip later embedded-mirroring decisions.
