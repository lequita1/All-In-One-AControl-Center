import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const boundary = vi.hoisted(() => ({ calls: [], children: [] }))
vi.mock('@electron-toolkit/preload', () => ({ electronAPI: { ipcRenderer: { on() {} } } }))
vi.mock('$electron/configs/index.js', () => ({ getScrcpy: () => 'C:\\trusted tools\\scrcpy.exe' }))
vi.mock('$renderer/utils/index.js', () => ({
  createDeferred: () => {
    let resolve
    let reject
    const promise = new Promise((yes, no) => {
      resolve = yes
      reject = no
    })
    return { promise, resolve, reject }
  },
}))
vi.mock('$electron/helpers/shell/index.js', () => ({
  sheller: (command, options) => {
    const child = new EventEmitter()
    let resolve
    let reject
    const exited = new Promise((yes, no) => {
      resolve = yes
      reject = no
    })
    Object.assign(child, {
      pid: 100 + boundary.children.length,
      then: exited.then.bind(exited),
      catch: exited.catch.bind(exited),
      finally: exited.finally.bind(exited),
      kill: vi.fn(),
    })
    boundary.calls.push({ command, options })
    boundary.children.push({ child, resolve, reject })
    return child
  },
}))
// Never signal an operating-system PID in a launcher test.
vi.mock('$electron/process/manager.js', () => ({ ProcessManager: class { add() {} kill() {} } }))

const { default: scrcpy } = await import('../index.js')

beforeEach(() => {
  boundary.calls.length = 0
  boundary.children.length = 0
})
afterEach(() => {
  vi.useRealTimers()
})

describe('scrcpy launcher', () => {
  it('sends titles and recording paths as literal arguments to the resolved executable', async () => {
    const result = scrcpy.record('device-A', {
      title: 'Phone " & calc & "', savePath: 'C:\\videos\\a & b.mp4', args: '--no-audio',
    })
    expect(boundary.calls[0].command).toEqual([
      'C:\\trusted tools\\scrcpy.exe', '--serial=device-A', '--window-title=Phone " & calc & "', '--record=C:\\videos\\a & b.mp4', '--no-audio',
    ])
    expect(boundary.calls[0].options.shell).toBe(false)
    boundary.children[0].resolve({ stdout: '', stderr: '', exitCode: 0 })
    await result
  })

  it.each(['--serial=device-B', '--ser=device-B', '--seri=device-B', '--select-u', '-sdevice-B', '-Nsdevice-B', '--select-usb', '-d', '--tcpip=other', '-- --serial=device-B', '--no-audio && calc'])(
    'rejects target override or host syntax before starting a process: %s', async (args) => {
      await expect(scrcpy.mirror('device-A', { args })).rejects.toThrow()
      expect(boundary.calls).toHaveLength(0)
    },
  )

  it('rejects an empty target before starting a process', async () => {
    await expect(scrcpy.mirror('', {})).rejects.toThrow()
    expect(boundary.calls).toHaveLength(0)
  })

  it('keeps two concurrent launches on their original explicit targets', async () => {
    const first = scrcpy.mirror('device-A')
    const second = scrcpy.mirror('device-B')
    expect(boundary.calls.map(call => call.command[1])).toEqual(['--serial=device-A', '--serial=device-B'])
    boundary.children.forEach(child => child.resolve({ stdout: '', stderr: '', exitCode: 0 }))
    await Promise.all([first, second])
  })

  it('recognizes a ready marker split across output chunks', async () => {
    const started = scrcpy.mirror('device-A', { resolveOnReady: true })
    boundary.calls[0].options.stderr('[server] INFO: De')
    boundary.calls[0].options.stderr('vice: POCO')
    await expect(started).resolves.toBeUndefined()
    boundary.children[0].resolve({ stdout: '', stderr: '', exitCode: 0 })
  })

  it('rejects startup once with the diagnostic when the child fails', async () => {
    const started = scrcpy.mirror('device-A', { resolveOnReady: true })
    const check = expect(started).rejects.toThrow('Device unauthorized')
    boundary.children[0].reject(Object.assign(new Error('exit 1'), { stderr: 'Device unauthorized' }))
    await check
  })

  it('times out an unresponsive startup and terminates only its child', async () => {
    vi.useFakeTimers()
    const started = scrcpy.mirror('device-A', { resolveOnReady: true, startupTimeout: 100 })
    const check = expect(started).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(100)
    await check
    expect(boundary.children[0].child.kill).toHaveBeenCalledOnce()
  })
})
