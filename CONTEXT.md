# Android Control Center — Context

Goal: Build a reliable local-first Windows x64 Android management application from inspected public Escrcpy source, incrementally, with device safety and verified functionality.

## Current state

Current task: continue the approved roadmap on `feat/secure-device-operations`, beginning with Phase 2 and security hardening. The verified baseline source is published on the selected repository's `main`; upstream push is disabled. An active goal covers the full roadmap, with distribution conditional on audience/release gates. Read roadmap for scope, verification for results and phase-2-plan for implementation order.

Connection workspace: layout/serial-searchable selector, bounded refresh, tracker ownership and a narrow read-only device-info service are implemented and automatically tested. A packaged preview has rendered both themes and read live POCO metadata over wireless; this is separate from mirroring/input verification. The current source checkpoint and remaining hardware/security limits are recorded in the verification log. Resume from `.superpowers/sdd/roadmap/progress.md`; do not carry the old baseline's hardware pass forward to a changed artifact.

## Task routes

- Requirements: [original brief](docs/project/project-brief.md).
- Proposed architecture: [technical plan](docs/project/technical-plan.md).
- Source/features/licenses/environment: [audit](docs/project/source-audit.md) and [evidence](docs/project/readiness-evidence.json).
- Scope, execution gates, feature classification and next actions: [roadmap](docs/project/roadmap.md).
- Observed checks and results: [verification log](docs/project/verification.md).

## Working loop

Orient to the request and instructions, recall relevant memory, inspect useful connections, act, verify, and update durable knowledge.

Code graph: `graphify-out/graph.json` if generated; check its indexed revision before relying on it.

## Local continuity

The ignored `.project-memory.json` records this checkout's canonical named notes when local memory is configured. Read it directly; do not commit machine-specific vault paths. Roadmap and verification remain the portable scope/results authority.
