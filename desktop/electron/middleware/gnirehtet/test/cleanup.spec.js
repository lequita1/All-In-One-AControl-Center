import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const external = vi.hoisted(() => ({ calls: [] }))
vi.mock('@electron-toolkit/preload', () => ({ electronAPI: { ipcRenderer: { on() {} } } }))
vi.mock('$electron/configs/index.js', () => ({ getGnirehtet: () => 'C:\\tools\\gnirehtet.exe' }))
vi.mock('$electron/helpers/store/index.js', () => ({ default: { get() {} } }))
vi.mock('$electron/middleware/adb/index.js', () => ({ default: {} }))
vi.mock('@magda/tree-kill', () => ({ default: vi.fn((_pid, _signal, callback) => callback()) }))
vi.mock('$electron/helpers/shell/index.js', () => ({
  sheller: (command) => {
    external.calls.push(command)
    const child = Object.assign(new EventEmitter(), { pid: 123 })
    const exited = Promise.resolve({ stdout: '', stderr: '', exitCode: 0 })
    queueMicrotask(() => child.emit('close', 0))
    return Object.assign(child, { then: exited.then.bind(exited), catch: exited.catch.bind(exited), finally: exited.finally.bind(exited) })
  },
}))
const { default: gnirehtet } = await import('../index.js')
beforeEach(() => {
  external.calls.length = 0
})
afterEach(async () => {
  await gnirehtet.stop()
})

describe('reverse tether cleanup', () => {
  it('does not send an untargeted stop when no session was started', async () => {
    await gnirehtet.stop()
    expect(external.calls).toEqual([])
  })

  it('stops only the explicit devices whose sessions it started', async () => {
    await gnirehtet.start('device-A')
    await gnirehtet.start('device-B')
    external.calls.length = 0
    await gnirehtet.stop()
    expect(external.calls).toEqual([
      ['C:\\tools\\gnirehtet.exe', 'stop', 'device-A'],
      ['C:\\tools\\gnirehtet.exe', 'stop', 'device-B'],
    ])
  })
})
