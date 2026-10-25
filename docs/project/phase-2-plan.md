# Phase 2 implementation notes

Authorized by the user's request to continue the approved roadmap with runtime and source-intake security. The [roadmap](roadmap.md) owns scope and status; [verification](verification.md) owns results. This document describes interfaces and checks, not a second checklist.

Implement in this order:

1. Review and update vulnerable dependencies, remove unused vulnerable packages, and verify the lockfile, existing checks and build. Inspect remaining advisory reachability. Compare bundled Windows mirroring tools with checksummed official assets; record gaps honestly.
2. Add a workspace test entry point. At the actual host-launch boundary, pass executable plus literal argument arrays with `shell: false`. Parse legacy option strings without accepting host operators, expansion or comments; validate explicit targets and prevent extra mirroring options from overriding them. Keep intentional developer terminal access separate.
3. Reproduce mirror startup failures with a fake child process. Fix rejected startup promises without unhandled background rejection, bounded readiness waits and readiness split over output chunks. Track only owned live processes for cancellation.
4. Use the injected ADB client/launcher seams for two distinct fake devices. Test invalid targets and isolation when selection changes. Improve connection errors/reconnect and device selection within the existing UI after inspecting the real paths.
5. Investigate embedded mirroring independently within the roadmap timebox and record an evidence-based go/no-go. Continue unrelated personal features while a device-dependent decision is pending.

Tests precede behavior changes. Fakes replace external device/process I/O only; parsing, targeting, lifecycle and service logic stay real. Include hostile titles/paths/options, unauthorized/disconnected devices, early process exit and cancellation. Validate fixes with the complete test suite, lint, package typechecks and dependency-ordered build. A fresh portable/hardware smoke check follows runtime changes; do not carry the old build's hardware evidence forward as proof of a new build.

Subsequent app/file phases harden Android-side quoting and target/package/path validation where those operations are implemented. Renderer privilege migration needs narrow IPC/services and behavior checks; do not toggle security flags while retaining incompatible broad bridges. Distribution remains conditional on its separate release gate.
