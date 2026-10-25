# Inherited automation

Upstream release, documentation deployment and mirror workflows are retained as `.yml.disabled` references. GitHub does not execute these files. They reference upstream repositories and secrets and must not run in this derivative.

Introduce only deliberately reviewed, minimally privileged and pinned workflows when our roadmap calls for them. Source pushes must not publish binaries, sync to upstream/Gitee/Homebrew, or request upstream credentials.
