# Source and dependency intake evidence

Checked: 26 October 2026. These checks identify source/bytes and known advisories; they do not establish that every code path or executable is safe.

The imported public foundation remains Escrcpy v3.3.1, commit `e35972b46e1ec6724815fd13d1ef1c5b1aa0272f`. Local changes preserve attribution and Apache-2.0 licensing. Source publication has no active inherited release/sync workflows. The lockfile pins package resolution and integrity; reviewed dependency changes still require passing project checks.

## Windows mirroring tools

Downloaded [Genymobile's official v4.1 Windows archive](https://github.com/Genymobile/scrcpy/releases/tag/v4.1) without executing it. Its SHA-256 matched the release asset digest **before extraction**:

`scrcpy-win64-v4.1.zip`: `5b12172b3264b2889f4583ee64752ce832e29bc8b1089dca81093459697165db`.

All ten overlapping bundled files matched the extracted official files byte-for-byte: `scrcpy.exe`, `adb.exe`, `AdbWinApi.dll`, `AdbWinUsbApi.dll`, `avcodec-62.dll`, `avformat-62.dll`, `avutil-60.dll`, `libusb-1.0.dll`, `SDL3.dll`, `swresample-6.dll`.

Both bundled `common/scrcpy/scrcpy-server` and `common/wscrcpy/scrcpy-server` matched the official standalone server digest: `deacb991ed2509715160ffdc7907e47b4160eb30d1566217e9047fd5b8850cae`.

No GPG signature verification was performed. This comparison does not cover fastboot, gnirehtet, yadb, other platforms, dependencies or the application itself. Their exact provenance/redistribution review remains open before binary distribution.

Windows Defender custom scan of `desktop/electron/resources/extra` completed without a project-specific detection returned by `Get-MpThreatDetection`. Antivirus and real-time protection were enabled; signature timestamp was 25 October 2026, 09:31 +08:00. This is one scan at one point in time.

## Remaining dependency advisory

After the reviewed package changes, the registry audit reports one high-severity finding: [node-forge GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), version 1.4.0 through `@devicefarmer/adbkit` 3.3.8. The registry reports no patched version. It concerns RSA PKCS#1 v1.5 signature verification.

Inspected adbkit's installed `dist/src/adb/auth.js` and `dist/src/adb/tcpusb/socket.js`: the library does use forge key verification in its optional TCP-to-USB bridge authentication. Searches of this project's desktop/adbx source found no calls to `createTcpUsbBridge`, `parsePublicKey` or forge key verification. Ordinary app code talks to the authorized ADB server through the client; this evidence bounds the known reachability, not every possible future use. Do not introduce that bridge/authentication API without resolving the advisory or replacing its verification implementation. Recheck the advisory before release and when updating adbkit.

The finding remains visible in audits. It has not been suppressed or declared fixed. Renderer/IPC privileges, Android command quoting and other feature-specific boundaries remain roadmap work.
