import { Readable } from 'node:stream'
import { parse } from 'shell-quote'
import { describe, expect, it, vi } from 'vitest'
import { createAppManagement } from '../service.js'

function fixture() {
  const calls = []
  const state = { online: true, user: true, digest: 'a'.repeat(64), failure: '', commitUnknown: false }
  const snapshot = { files: [{ path: '/owned/part.apk', name: 'file\'s $(ignored).apk', size: 8, sha256: 'a'.repeat(64) }], cleanup: vi.fn(async () => {}) }
  const selectFiles = vi.fn(async () => ['/native/source.apk'])
  const prepareFiles = vi.fn(async () => snapshot)
  const confirmInstall = vi.fn(async () => true)
  const pushFile = vi.fn(async () => {})
  const client = {
    listDevicesWithPaths: vi.fn(async () => [{ id: 'A', type: state.online ? 'device' : 'unauthorized' }, { id: 'B', type: 'device' }]),
    getDevice: vi.fn(serial => ({ serial })),
  }
  const openShell = vi.fn(async (device, command, { authorize }) => {
    authorize()
    const args = parse(command.split('; printf')[0].replace(/ 2>&1$/, ''))
    calls.push({ serial: device.serial, args })
    if (state.commitUnknown && args[1] === 'install-commit')
      throw new Error('Connection closed')
    const output = args.join(' ') === 'pm list users'
      ? `Users:\nUserInfo{0:Owner:13}${state.user ? '\nUserInfo{10:Work:30}' : ''}`
      : args[0] === 'sha256sum'
        ? `${state.digest}  ${args[1]}`
        : args[1] === 'install-create'
          ? 'Success: created install session [17]'
          : args[1] === 'install-write'
            ? 'Success: streamed 8 bytes'
            : args[1] === 'install-commit' ? 'Success' : ''
    const marker = command.match(/__ACC_[a-f0-9]+__/)[0]
    return Readable.from([`${output}\n${marker}${state.failure === args[1] ? 1 : 0}\n`])
  })
  const service = createAppManagement(client, { openShell, selectFiles, prepareFiles, confirmInstall, pushFile })
  return { service, calls, state, snapshot, selectFiles, prepareFiles, confirmInstall, pushFile, client }
}
const target = { serial: 'A', userId: 10 }

describe('native-selected APK installation', () => {
  it.each([{ ...target, paths: ['/other.apk'] }, { ...target, flags: ['-g'] }, { ...target, userId: '10' }, { ...target, serial: 'A;reboot' }])('rejects renderer paths/flags and malformed targets: %j', async (request) => {
    const f = fixture()
    await expect(f.service.install(request)).rejects.toThrow()
    expect(f.selectFiles).not.toHaveBeenCalled()
    expect(f.client.listDevicesWithPaths).not.toHaveBeenCalled()
  })

  it('cancels the native picker without device mutation', async () => {
    const f = fixture()
    f.selectFiles.mockResolvedValue([])
    await expect(f.service.install(target)).resolves.toEqual({ ...target, action: 'install', status: 'cancelled' })
    expect(f.prepareFiles).not.toHaveBeenCalled()
    expect(f.calls.every(({ args }) => args.join(' ') === 'pm list users')).toBe(true)
  })

  it('cancels confirmation and cleans snapshots without staging or session creation', async () => {
    const f = fixture()
    f.confirmInstall.mockResolvedValue(false)
    await expect(f.service.install(target)).resolves.toMatchObject({ status: 'cancelled' })
    expect(f.pushFile).not.toHaveBeenCalled()
    expect(f.snapshot.cleanup).toHaveBeenCalledOnce()
    expect(f.calls.some(({ args }) => args[1] === 'install-create')).toBe(false)
    expect(f.confirmInstall.mock.calls[0][0]).toMatchObject({ ...target, files: [{ name: 'file\'s $(ignored).apk', size: 8, sha256: 'a'.repeat(64) }] })
    expect(f.confirmInstall.mock.calls[0][0].files[0]).not.toHaveProperty('path')
  })

  it('writes compatible splits into one explicit-user session and commits once on the captured phone', async () => {
    const f = fixture()
    f.snapshot.files.push({ ...f.snapshot.files[0], path: '/owned/split.apk', name: 'split.apk' })
    const request = { ...target }
    f.confirmInstall.mockImplementation(async () => {
      request.serial = 'B'
      request.userId = 0
      return true
    })
    await expect(f.service.install(request)).resolves.toEqual({ ...target, action: 'install', status: 'completed', fileCount: 2 })
    expect(f.calls.find(({ args }) => args[1] === 'install-create').args).toEqual(['pm', 'install-create', '-r', '--restrict-permissions', '--user', '10', '-S', '16'])
    expect(f.calls.filter(({ args }) => args[1] === 'install-write')).toHaveLength(2)
    expect(f.calls.filter(({ args }) => args[1] === 'install-commit')).toHaveLength(1)
    expect(f.calls.every(({ serial }) => serial === 'A')).toBe(true)
    expect(f.pushFile.mock.calls.every(([device, , remote]) => device.serial === 'A' && /^\/data\/local\/tmp\/acc-install-[a-f0-9]{32}\/part-\d+\.apk$/.test(remote))).toBe(true)
    expect(f.calls.some(({ args }) => args.some(arg => arg.includes('ignored')))).toBe(false)
    expect(f.snapshot.cleanup).toHaveBeenCalledOnce()
  })

  it.each(['offline', 'missing-user', 'frame'])('rechecks authority after confirmation before mutation: %s', async (change) => {
    const f = fixture()
    let current = true
    f.confirmInstall.mockImplementation(async () => {
      if (change === 'offline')
        f.state.online = false
      if (change === 'missing-user')
        f.state.user = false
      if (change === 'frame')
        current = false
      return true
    })
    await expect(f.service.install(target, () => {
      if (!current)
        throw new Error('Frame changed')
    })).rejects.toThrow()
    expect(f.calls.some(({ args }) => args[0] === 'mkdir' || args[1] === 'install-create')).toBe(false)
    expect(f.snapshot.cleanup).toHaveBeenCalledOnce()
  })

  it('abandons an incomplete split session and removes staging after digest mismatch', async () => {
    const f = fixture()
    f.state.digest = 'b'.repeat(64)
    await expect(f.service.install(target)).rejects.toThrow(/digest|fingerprint|SHA/i)
    expect(f.calls.some(({ args }) => args[1] === 'install-commit')).toBe(false)
    expect(f.calls.some(({ args }) => args[1] === 'install-abandon' && args[2] === '17')).toBe(true)
    expect(f.calls.some(({ args }) => args[0] === 'rmdir')).toBe(true)
    expect(f.snapshot.cleanup).toHaveBeenCalledOnce()
  })

  it('does not commit or retry a rejected split write', async () => {
    const f = fixture()
    f.state.failure = 'install-write'
    await expect(f.service.install(target)).rejects.toThrow()
    expect(f.calls.filter(({ args }) => args[1] === 'install-write')).toHaveLength(1)
    expect(f.calls.some(({ args }) => args[1] === 'install-commit')).toBe(false)
    expect(f.calls.some(({ args }) => args[1] === 'install-abandon')).toBe(true)
  })

  it('reports an unknown commit outcome without retrying', async () => {
    const f = fixture()
    f.state.commitUnknown = true
    await expect(f.service.install(target)).rejects.toThrow(/outcome.*unknown|unknown.*outcome/i)
    expect(f.calls.filter(({ args }) => args[1] === 'install-commit')).toHaveLength(1)
    expect(f.snapshot.cleanup).toHaveBeenCalledOnce()
  })

  it('locks other mutations on the same phone while a picker is open and releases on cancellation', async () => {
    const f = fixture()
    let dismiss
    f.selectFiles.mockImplementationOnce(() => new Promise((resolve) => {
      dismiss = resolve
    }))
    const selecting = f.service.install(target)
    await vi.waitFor(() => expect(f.selectFiles).toHaveBeenCalledOnce())
    await expect(f.service.perform({ ...target, packageName: 'com.example.app', action: 'uninstall' })).rejects.toThrow(/already in progress/i)
    f.selectFiles.mockResolvedValueOnce([])
    await expect(f.service.install({ serial: 'B', userId: 0 })).resolves.toMatchObject({ serial: 'B', status: 'cancelled' })
    dismiss([])
    await selecting
    f.selectFiles.mockResolvedValueOnce([])
    await expect(f.service.install(target)).resolves.toMatchObject({ status: 'cancelled' })
  })

  it('abandons and cleans without committing when upload fails', async () => {
    const f = fixture()
    f.pushFile.mockRejectedValueOnce(new Error('Upload disconnected'))
    await expect(f.service.install(target)).rejects.toThrow(/Upload disconnected/)
    expect(f.calls.some(({ args }) => args[1] === 'install-commit')).toBe(false)
    expect(f.calls.some(({ args }) => args[1] === 'install-abandon')).toBe(true)
    expect(f.calls.some(({ args }) => args[0] === 'rmdir')).toBe(true)
  })

  it('preserves completion but reports incomplete local cleanup as a warning', async () => {
    const f = fixture()
    f.snapshot.cleanup.mockRejectedValueOnce(new Error('File locked'))
    await expect(f.service.install(target)).resolves.toMatchObject({ status: 'completed', warnings: [expect.stringMatching(/this computer/)] })
  })
})
