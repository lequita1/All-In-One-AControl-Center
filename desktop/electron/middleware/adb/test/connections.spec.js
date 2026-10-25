import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Adb } from '@devicefarmer/adbkit'

const external = vi.hoisted(() => ({ events: new Map(), changes: new Map(), calls: [] }))
vi.mock('@electron-toolkit/preload', () => ({
  electronAPI: { ipcRenderer: { on: (name, handler) => external.events.set(name, handler) } },
}))
vi.mock('$electron/helpers/store/index.js', () => ({
  default: { get() {}, onDidChange: (name, handler) => external.changes.set(name, handler) },
}))
vi.mock('$electron/configs/index.js', () => ({ getAdb: () => 'C:\\trusted tools\\adb.exe', yadbPath: '', desktopPath: '' }))
vi.mock('$electron/process/helper.js', () => ({ setupEnvPath() {} }))
vi.mock('@magda/tree-kill', () => ({ default: vi.fn((_pid, _signal, callback) => callback()) }))
vi.mock('../helpers/scanner/index.js', () => ({ default: {}, MDNS_CONFIG: {}, probeDeviceCandidates() {}, scanMdnsDevices() {} }))
vi.mock('$electron/helpers/shell/index.js', () => ({
  sheller: (command, options) => {
    external.calls.push({ command, options })
    const child = Object.assign(new EventEmitter(), { pid: 123 })
    const exited = Promise.resolve({ stdout: 'connected', stderr: '', exitCode: 0 })
    queueMicrotask(() => child.emit('close', 0))
    return Object.assign(child, { then: exited.then.bind(exited), catch: exited.catch.bind(exited), finally: exited.finally.bind(exited) })
  },
}))

const { default: adb } = await import('../index.js')
let client
beforeEach(() => {
  client = { kill: vi.fn().mockResolvedValue(undefined) }
  vi.spyOn(Adb, 'createClient').mockReturnValue(client)
  external.calls.length = 0
  adb.init()
})

describe('adb connection boundary', () => {
  it('does not stop a shared ADB server when the app closes', async () => {
    await external.events.get('quit-before')()
    expect(client.kill).not.toHaveBeenCalled()
  })

  it('does not stop a shared ADB server when the configured tool directory changes', async () => {
    await external.changes.get('common.adbDir')('new', 'old')
    expect(client.kill).not.toHaveBeenCalled()
  })

  it('passes pairing address and code as separate literal arguments', async () => {
    await adb.pair('192.168.1.2', 37123, '012345')
    expect(external.calls[0]).toMatchObject({
      command: ['C:\\trusted tools\\adb.exe', 'pair', '192.168.1.2:37123', '012345'],
      options: { encoding: 'utf8' },
    })
  })

  it('rejects malformed wireless input without starting ADB', async () => {
    await expect(adb.connect('phone && command', 5555)).rejects.toThrow()
    await expect(adb.pair('phone', 37123, '012345 reboot')).rejects.toThrow()
    expect(external.calls).toEqual([])
  })

  it('disconnects a discovered wireless serial without converting it to a hostname', async () => {
    await adb.disconnect('adb-test._adb-tls-connect._tcp')
    expect(external.calls[0].command).toEqual(['C:\\trusted tools\\adb.exe', 'disconnect', 'adb-test._adb-tls-connect._tcp'])
  })
})
