import { Readable } from 'node:stream'
import { parse } from 'shell-quote'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppManagement } from '../service.js'

function pending() {
  let resolve
  const promise = new Promise((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

function response(command, output, status = 0) {
  const marker = command.match(/__ACC_[a-f0-9]+__/)[0]
  return Readable.from([Buffer.from(`${output}\n${marker}${status}\n`)])
}

function fixture() {
  const calls = []
  const state = { version: '4', system: false, installed: true, online: true, disabled: false, exitCode: 0 }
  const shell = vi.fn(async (command) => {
    const marker = command.match(/__ACC_[a-f0-9]+__/)[0]
    const args = parse(command.split('; printf')[0].replace(/ 2>&1$/, ''))
    calls.push(args)
    let output = ''
    if (args.join(' ') === 'pm list users') {
      output = 'Users:\n\tUserInfo{0:Owner:13} running\n\tUserInfo{10:Work:30}'
    }
    else if (args[0] === 'pm' && args[1] === 'list') {
      const include = state.installed && (!args.includes('-s') || state.system) && (!args.includes('-3') || !state.system) && (!args.includes('-d') || state.disabled)
      output = include ? `package:com.example.app${args.includes('--show-versioncode') ? ` versionCode:${state.version}` : ''}` : ''
    }
    else if (args[0] === 'cmd') {
      output = 'com.example.app/.MainActivity'
    }
    else if (args[1] === 'start-activity') {
      output = 'Status: ok'
    }
    else if (args[1] === 'uninstall') {
      state.installed = false
      output = 'Success'
    }
    return Readable.from([Buffer.from(`${output}\n${marker}${state.exitCode}\n`)])
  })
  const client = {
    listDevicesWithPaths: vi.fn(async () => [{ id: 'A', type: state.online ? 'device' : 'unauthorized' }, { id: 'B', type: 'device' }]),
    getDevice: vi.fn(() => ({ shell })),
  }
  const confirm = vi.fn(async () => true)
  const service = createAppManagement(client, { confirm, openShell: (device, command, { authorize }) => {
    authorize()
    return device.shell(command)
  } })
  const request = { serial: 'A', userId: 0, packageName: 'com.example.app', action: 'uninstall' }
  return { calls, state, shell, client, confirm, service, request }
}

afterEach(() => vi.useRealTimers())

describe('application management service', () => {
  it('lists the selected user and retains version, system and disabled information', async () => {
    const f = fixture()
    f.state.disabled = true
    await expect(f.service.list({ serial: 'A', userId: 10 })).resolves.toMatchObject({
      serial: 'A', userId: 10, packages: [{ packageName: 'com.example.app', versionCode: '4', system: false, userInstalled: true, enabled: false }],
    })
    expect(f.calls.filter(args => args[2] === 'packages').every(args => args.includes('10'))).toBe(true)
    expect(f.client.getDevice.mock.calls).toEqual([['A']])
  })

  it.each([{ userId: -1 }, { userId: '0' }, { userId: 0.5 }, { userId: 2147483648 }, { serial: 'A;reboot' }, { packageName: 'com.example.app;id' }, { action: 'shell' }, { approved: true }])('rejects malformed action input before transport: %j', async (change) => {
    const f = fixture()
    await expect(f.service.perform({ ...f.request, ...change })).rejects.toThrow()
    expect(f.client.listDevicesWithPaths).not.toHaveBeenCalled()
  })

  it('never sends a mutation when native confirmation is cancelled', async () => {
    const f = fixture()
    f.confirm.mockResolvedValue(false)
    await expect(f.service.perform(f.request)).resolves.toMatchObject({ status: 'cancelled', serial: 'A', userId: 0 })
    expect(f.calls.some(args => args[1] === 'uninstall')).toBe(false)
  })

  it('captures the confirmed tuple, pins the version and verifies removal', async () => {
    const f = fixture()
    const answer = pending()
    f.confirm.mockReturnValue(answer.promise)
    const operation = f.service.perform(f.request)
    await vi.waitFor(() => expect(f.confirm).toHaveBeenCalledOnce())
    f.request.serial = 'B'
    f.request.packageName = 'com.other.app'
    answer.resolve(true)
    await expect(operation).resolves.toMatchObject({ status: 'completed', serial: 'A', packageName: 'com.example.app' })
    expect(f.confirm.mock.calls[0][0]).toMatchObject({ serial: 'A', userId: 0, packageName: 'com.example.app', versionCode: '4' })
    expect(f.calls.find(args => args[1] === 'uninstall')).toEqual(['pm', 'uninstall', '--user', '0', '--versionCode', '4', 'com.example.app'])
    expect(f.client.getDevice.mock.calls.every(([id]) => id === 'A')).toBe(true)
  })

  it.each(['system', 'version', 'authorization'])('rechecks %s after confirmation before mutating', async (changed) => {
    const f = fixture()
    f.confirm.mockImplementation(async () => {
      if (changed === 'system')
        f.state.system = true
      if (changed === 'version')
        f.state.version = '5'
      if (changed === 'authorization')
        f.state.online = false
      return true
    })
    await expect(f.service.perform(f.request)).rejects.toThrow()
    expect(f.calls.some(args => args[1] === 'uninstall')).toBe(false)
  })

  it('rejects system removal and unknown users without opening confirmation', async () => {
    const f = fixture()
    f.state.system = true
    await expect(f.service.perform(f.request)).rejects.toThrow(/system|user-installed/i)
    await expect(f.service.list({ serial: 'A', userId: 22 })).rejects.toThrow(/user/i)
    expect(f.confirm).not.toHaveBeenCalled()
  })

  it('serializes conflicting actions and releases ownership on cancellation', async () => {
    const f = fixture()
    const answer = pending()
    f.confirm.mockReturnValueOnce(answer.promise).mockResolvedValueOnce(false)
    const first = f.service.perform(f.request)
    await vi.waitFor(() => expect(f.confirm).toHaveBeenCalledOnce())
    await expect(f.service.perform({ ...f.request, action: 'force-stop' })).rejects.toThrow(/progress|busy/i)
    answer.resolve(false)
    await first
    await expect(f.service.perform(f.request)).resolves.toMatchObject({ status: 'cancelled' })
  })

  it('launches only a validated component in the captured package and user', async () => {
    const f = fixture()
    await f.service.perform({ ...f.request, userId: 10, action: 'launch' })
    expect(f.calls.find(args => args[1] === 'start-activity')).toEqual(['am', 'start-activity', '-W', '--user', '10', '-n', 'com.example.app/.MainActivity'])
    expect(f.confirm).not.toHaveBeenCalled()
  })

  it('stops only the confirmed package/user', async () => {
    const f = fixture()
    await expect(f.service.perform({ ...f.request, action: 'force-stop' })).resolves.toMatchObject({ status: 'completed' })
    expect(f.calls.find(args => args[1] === 'force-stop')).toEqual(['am', 'force-stop', '--user', '0', 'com.example.app'])
  })

  it('checks authority again immediately before a mutation', async () => {
    const f = fixture()
    const authorize = vi.fn(() => {
      throw new Error('Frame changed')
    })
    await expect(f.service.perform(f.request, authorize)).rejects.toThrow('Frame changed')
    expect(f.calls.some(args => args[1] === 'uninstall')).toBe(false)
  })

  it('rejects unavailable transport, nonzero shell status and unclassified output', async () => {
    const f = fixture()
    f.state.online = false
    await expect(f.service.list({ serial: 'A', userId: 0 })).rejects.toThrow()
    expect(f.client.getDevice).not.toHaveBeenCalled()
    f.state.online = true
    f.state.exitCode = 1
    await expect(f.service.list({ serial: 'A', userId: 0 })).rejects.toThrow()
  })

  it.each(['com.other.app/.MainActivity', 'com.example.app/.MainActivity;reboot', 'com.example.app/.MainActivity\nextra'])('rejects an unsafe or different launcher: %s', async (component) => {
    const f = fixture()
    const normal = f.shell.getMockImplementation()
    f.shell.mockImplementation(command => command.startsWith('\'cmd\' ') ? Promise.resolve(response(command, component)) : normal(command))
    await expect(f.service.perform({ ...f.request, action: 'launch' })).rejects.toThrow(/launcher/i)
    expect(f.calls.some(args => args[0] === 'am')).toBe(false)
  })

  it('rejects malformed device-supplied package information', async () => {
    const f = fixture()
    const normal = f.shell.getMockImplementation()
    f.shell.mockImplementation(command => command.includes('\'--show-versioncode\'') ? Promise.resolve(response(command, 'package:com.example.app;reboot versionCode:4')) : normal(command))
    await expect(f.service.list({ serial: 'A', userId: 0 })).rejects.toThrow(/package/i)
  })

  it('retains version codes beyond JavaScript safe-integer precision', async () => {
    const f = fixture()
    f.state.version = '9007199254740993'
    await f.service.perform(f.request)
    expect(f.calls.find(args => args[1] === 'uninstall')).toContain('9007199254740993')
  })

  it('does not accept a successful exit without a confirmed removal outcome', async () => {
    const f = fixture()
    const normal = f.shell.getMockImplementation()
    f.shell.mockImplementation(command => command.includes('\'uninstall\'') ? Promise.resolve(response(command, 'Failure [DELETE_FAILED]')) : normal(command))
    await expect(f.service.perform(f.request)).rejects.toThrow(/not report|failed|verified/i)
    expect(f.state.installed).toBe(true)
  })

  it('bounds and destroys stalled and oversized reads', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const stalled = new Readable({ read() {} })
    f.shell.mockResolvedValue(stalled)
    const reading = f.service.list({ serial: 'A', userId: 0 })
    const failure = expect(reading).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(5000)
    await failure
    expect(stalled.destroyed).toBe(true)
    f.shell.mockResolvedValue(Readable.from([Buffer.alloc(1048577)]))
    await expect(f.service.list({ serial: 'A', userId: 0 })).rejects.toThrow(/size/i)
  })

  it('labels a stalled mutation as uncertain and never retries it', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const stalled = new Readable({ read() {} })
    const normal = f.shell.getMockImplementation()
    const mutations = vi.fn(() => Promise.resolve(stalled))
    f.shell.mockImplementation(command => command.includes('\'force-stop\'') ? mutations(command) : normal(command))
    const stopping = f.service.perform({ ...f.request, action: 'force-stop' })
    const failure = stopping.catch(error => error)
    await vi.advanceTimersByTimeAsync(5000)
    expect((await failure).message).toMatch(/outcome.*unknown|outcome.*verified/i)
    expect(mutations).toHaveBeenCalledOnce()
    expect(stalled.destroyed).toBe(true)
  })

  it.each(['Warning: Activity not started because the current activity is being kept for the user.', 'Warning: Activity not started because intent should be handled by the caller'])('does not claim launch success for Android cancellation: %s', async (warning) => {
    const f = fixture()
    const normal = f.shell.getMockImplementation()
    f.shell.mockImplementation(command => command.includes('\'start-activity\'') ? Promise.resolve(response(command, `${warning}\nStatus: ok`)) : normal(command))
    await expect(f.service.perform({ ...f.request, action: 'launch' })).rejects.toThrow(/not started|verified/i)
  })

  it('keeps removal context when verification fails after the mutation', async () => {
    const f = fixture()
    const normal = f.shell.getMockImplementation()
    f.shell.mockImplementation(command => !f.state.installed ? Promise.reject(new Error('Connection lost')) : normal(command))
    await expect(f.service.perform(f.request)).rejects.toThrow(/removal.*attempted.*verified/i)
  })
})
