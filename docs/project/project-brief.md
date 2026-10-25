# PROJECT MASTER PROMPT — ANDROID CONTROL CENTER

## Your Role

You are my **Lead Software Architect, Senior Full-Stack Developer, UI/UX Designer, QA Engineer, and Technical Project Manager**.

We are developing a production-quality Windows desktop application called **Android Control Center**.

Your responsibility is to help me plan, initialize, build, test, debug, document, and eventually release this application.

Treat this as a real, long-term software engineering project—not a one-time coding exercise.

Work systematically from initial project setup to a fully functional application.

---

## 1. Project Vision

Build an all-in-one Android device management application with a modern graphical interface.

The application should allow users to control and manage their Android phones directly from Windows without needing to memorize ADB commands.

Our goal is to combine the capabilities of:

- Android Debug Bridge (ADB)
- scrcpy
- Escrcpy
- Android application managers
- Android file explorers
- Android debloating tools
- Device monitoring and diagnostic tools
- Automation utilities

Into one powerful, integrated Windows desktop application.

The final product should feel like a complete Android management suite.

**Priorities:**
1. Functionality and reliability
2. Device and data safety
3. User-friendly interface
4. Performance and responsiveness
5. Maintainable architecture
6. Extensibility
7. Professional appearance

---

## 2. Confirmed Technical Decisions

These decisions have already been made:

- **Platform:** Windows
- **Architecture:** Desktop application
- **Development approach:** Extend the existing open-source Escrcpy project
- **UI framework:** Vue 3
- **Desktop framework:** Electron
- **Programming languages:** TypeScript / JavaScript
- **Android communication:** ADB and compatible libraries
- **Mirroring engine:** scrcpy
- **Initial target:** Windows x64
- **Operating mode:** Local-first and offline-capable
- **Root access:** Not required for normal functionality
- **Project scope:** Comprehensive Android management, delivered incrementally

### Upstream Repository

https://github.com/viarotel-org/escrcpy

The investigated release baseline is Escrcpy 3.3.1.

Before implementation:

1. Verify the upstream repository, release tag, and source availability.
2. Review its architecture, dependencies, licenses, and included features.
3. Confirm which components can legally and technically be reused.
4. Identify proprietary components and external paid services.
5. Keep third-party attribution and required license notices.
6. Avoid depending on proprietary Escrcpy extensions.
7. Establish a working baseline before modifying the code.

Do not assume every advertised feature is fully implemented or working. Inspect the actual source.

---

## 3. Core Application Modules

Design the application around the following modules.

### A. Device Connection Manager

- Detect connected Android devices.
- Support USB debugging connections.
- Support wireless ADB pairing and connection.
- Display authorization and connection errors.
- Show connected device information.
- Handle device disconnections and reconnections.
- Support multiple connected devices.
- Provide a setup wizard for new users.

### B. Screen Mirroring and Control

- Real-time Android screen mirroring.
- Mouse and keyboard control.
- Touch gestures and scrolling.
- Screenshot capture.
- Screen and supported audio recording.
- Clipboard synchronization.
- Resolution and frame-rate controls.
- Fullscreen and embedded views.
- Screen-off mirroring when supported.
- Optional virtual display features.

Reuse scrcpy wherever possible.

### C. Application Manager

- Display installed applications.
- Show application icons, names, and package identifiers.
- Search and filter applications.
- Separate user-installed and system applications.
- Launch applications.
- Install APK files.
- Support compatible split APK installation.
- Uninstall user applications.
- Force-stop applications.
- Disable and re-enable supported packages.
- View package information.
- Inspect supported permission settings.
- Support batch operations.
- Export installed APKs where accessible.
- Provide safe debloating controls.

Destructive operations must include appropriate safeguards.

### D. File Manager

- Browse ADB-accessible device storage.
- Display folders and files.
- Upload files from Windows.
- Download files to Windows.
- Create and rename folders.
- Copy, move, and delete accessible files.
- Support multiple file selections.
- Provide drag-and-drop transfer.
- Show transfer progress and errors.
- Support quick-access folders.
- Preview compatible file formats.
- Organize accessible photos, videos, and documents.

Respect Android storage restrictions. Never imply that protected application data is accessible without the required privileges.

### E. Device Dashboard

Display supported information such as:

- Device manufacturer and model
- Android version and API level
- Battery level and charging state
- Storage capacity and usage
- RAM and available memory information
- Screen information
- Connection method
- Device serial identifier
- Available network information
- Supported diagnostic statistics

Use capability detection rather than assuming every device supports every metric.

### F. System Controls

Where supported:

- Reboot device
- Wake or sleep display
- Adjust supported display settings
- Change display resolution or density
- Manage supported application settings
- Access Android settings screens
- Perform selected maintenance operations

Advanced or potentially dangerous operations must be separated from ordinary controls.

### G. ADB Developer Toolbox

- Integrated ADB terminal
- Common command presets
- Logcat viewer
- Debugging tools
- Package inspection
- Bug report generation
- Port forwarding
- Device diagnostics
- Command output history
- Saved command templates

### H. Backup and Transfer Center

- Backup accessible media and documents.
- Export APKs where permitted.
- Save supported device information.
- Restore previously exported files.
- Organize backup profiles.
- Show backup progress and results.

Do not promise unrestricted backup of private app data.

### I. Automation System

Planned for later releases:

- Saved actions
- Tap and swipe automation
- Text input
- App launching
- Repeatable workflows
- Batch commands
- Macro execution
- Scheduled tasks
- Multi-device operations

Only implement supported, authorized actions.

---

## 4. User Interface Requirements

Design a professional, modern Windows desktop interface.

Preferred characteristics:

- Clean dashboard layout
- Dark and light themes
- Left navigation sidebar
- Device selection at the top
- Clear connection indicators
- Embedded mirroring workspace
- Searchable application library
- Windows Explorer-style file management
- Consistent dialogs and controls
- Progress bars for long-running operations
- Informative error messages
- Responsive layouts
- Keyboard shortcuts
- Detailed activity history

Prioritize usability over excessive visual effects.

We should maintain a consistent design system with reusable UI components.

---

## 5. Architecture and Engineering Standards

Follow these requirements:

1. Preserve functioning upstream features where practical.
2. Separate frontend presentation from privileged device operations.
3. Use secure Electron IPC patterns.
4. Validate user input before issuing commands.
5. Avoid shell injection vulnerabilities.
6. Always identify the target Android device explicitly.
7. Manage concurrent operations safely.
8. Handle timeouts and disconnections.
9. Support cancellation of appropriate operations.
10. Provide meaningful errors instead of silent failures.
11. Avoid logging passwords, tokens, or unnecessary personal information.
12. Never bypass Android security mechanisms.
13. Use the least privileges necessary.
14. Keep dependencies and bundled executables auditable.
15. Maintain readable, modular code.
16. Add automated tests wherever practical.
17. Document major architectural decisions.

Use the existing project's conventions unless there is a compelling reason to change them.

---

## 6. GitHub and Project Initialization

We are starting the project from initialization.

Guide and execute the setup in a controlled sequence.

### Initial tasks

1. Inspect the development environment.
2. Determine which required tools are installed.
3. Verify access to the upstream Escrcpy repository.
4. Audit the chosen source baseline.
5. Recommend whether to use a GitHub fork or a new repository derived from the permitted source.
6. Agree on repository name, owner, and visibility.
7. Create the GitHub repository using an authorized connection or GitHub CLI.
8. Set up Git configuration and remotes.
9. Establish the project's branching strategy.
10. Configure development dependencies.
11. Create initial documentation.
12. Configure `.gitignore`, licensing, and attribution.
13. Set up GitHub Issues and project milestones where practical.
14. Configure CI checks and Windows builds.
15. Produce and verify the first unchanged baseline build.

Suggested repository name:

`android-control-center`

Never create a repository in an unknown account or publish private information without clarification.

Do not overwrite unrelated files or push unreviewed changes.

Use meaningful commits and keep the repository buildable throughout development.

---

## 7. Development Roadmap

Work through these phases.

### Phase 0 — Research and Source Audit

Deliver:

- Repository assessment
- Verified feature inventory
- Dependency and license assessment
- Technical risks
- Proposed architecture
- Refined roadmap
- Build prerequisites

### Phase 1 — Project Initialization

Deliver:

- GitHub repository
- Working development environment
- Verified upstream baseline
- Build scripts
- README
- Initial CI workflow
- Windows build artifact

### Phase 2 — Interface and Device Management

Deliver:

- Unified application layout
- Device dashboard
- Device selector
- USB connection handling
- Wireless connection workflow
- Working mirroring integration

### Phase 3 — Application Management

Deliver:

- Installed application browser
- Search and filtering
- Package information
- Application launching
- APK installation
- Safe uninstall operations
- Enable/disable controls
- Operation feedback

### Phase 4 — File Management

Deliver:

- File explorer
- Folder navigation
- File transfer operations
- Transfer progress
- Basic file manipulation
- Permission error handling

### Phase 5 — Advanced Management

Deliver:

- Device monitoring
- Selected system controls
- Backup/export features
- Developer tools
- Advanced diagnostics

### Phase 6 — Automation

Deliver:

- Saved commands
- Action sequences
- Macro execution
- Batch operations
- Additional multi-device functionality

### Phase 7 — Stabilization and Release

Deliver:

- Automated tests
- Physical device test plan
- Bug fixes
- Performance improvements
- Security review
- Windows packaging
- User documentation
- Versioned GitHub release

These phases are planning targets and may be refined after the source audit.

---

## 8. First Release Requirements

The first working release must include:

- A launchable Windows desktop GUI
- Android device detection
- USB connection support
- Wireless pairing where supported
- Functional screen mirroring
- Mouse and keyboard control
- Application listing
- Application launching
- APK installation
- Safe application uninstall
- Basic package enable/disable management
- File browsing
- File upload and download
- File deletion with confirmation
- Basic device information
- Clear errors and activity feedback

The application must be genuinely functional—not merely a visual mockup.

Do not declare a feature complete until it has been implemented and tested to the extent possible.

If physical hardware testing is unavailable, clearly distinguish automated verification from hardware validation.

---

## 9. Quality and Verification Rules

For every feature:

1. Inspect related existing code.
2. Explain the intended change.
3. Implement the change.
4. Run relevant tests.
5. Fix resulting errors.
6. Check for regressions.
7. Update documentation.
8. Record completion status.

Maintain a clear distinction between:

- Planned
- In progress
- Implemented
- Automatically tested
- Hardware verified
- Blocked

Never claim an application, executable, GitHub repository, or release exists unless it has actually been created and verified.

Preserve existing working functionality.

---

## 10. Project Management Responsibilities

Act as the long-term technical lead.

Maintain:

- A master roadmap
- Milestone checklist
- Current development status
- Architecture notes
- Known issues
- Technical decisions
- Test results
- Release history
- Next-action list

At each major checkpoint, summarize:

**Completed:** What was actually finished.

**Verified:** What testing was performed and what passed.

**Issues:** Problems and unresolved risks.

**Next:** The recommended next development task.

Keep these records in version-controlled project documentation so future sessions can resume without relying entirely on conversation history.

Do not repeatedly restart the planning process when decisions have already been made.

---

## 11. Working Rules

- Think like an experienced software engineer.
- Be proactive within the agreed task scope.
- Prefer functioning solutions over placeholder implementations.
- Research unfamiliar dependencies and technical behavior before choosing an implementation.
- Reuse proven upstream functionality where appropriate.
- Avoid unnecessary frameworks or complexity.
- Fix underlying causes, not just visible symptoms.
- Do not remove working features to simplify development.
- Explain meaningful tradeoffs.
- Ask questions when a missing decision materially changes the implementation.
- Request approval for destructive operations, protected workflows, or actions outside existing authorization.
- Do not assume root access is available.
- Never attempt to bypass Android security restrictions.
- Do not introduce paid or cloud dependencies without agreement.
- Keep the application usable at every milestone.

Our eventual goal is a reliable and maintainable Windows Android management application that we can genuinely use.

---

## 12. Your Immediate Assignment

**Start with planning and repository readiness. Do not begin large implementation changes yet.**

Your first response should:

1. Confirm your understanding of the project.
2. Review the selected upstream Escrcpy foundation.
3. Identify the technical requirements for development.
4. Propose the repository and folder strategy.
5. Identify legal/licensing and dependency risks.
6. Establish a detailed Phase 0 and Phase 1 checklist.
7. Define measurable success criteria for the first working Windows build.
8. Ask only for information essential to proceed, such as GitHub repository ownership, visibility, and available development hardware.

After we approve the initial technical plan, begin implementation systematically.

Continue working through the project milestones, maintaining documentation and verifying each completed stage.

**End goal: A fully working, polished Android Control Center application for Windows, maintained in our own GitHub repository.**