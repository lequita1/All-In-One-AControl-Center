import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import treeKill from '@magda/tree-kill'
import { ProcessManager } from '../manager.js'

vi.mock('@magda/tree-kill', () => ({ default: vi.fn((_pid, _signal, callback) => callback?.()) }))
beforeEach(() => {
  vi.clearAllMocks()
})

function child(pid) {
  return Object.assign(new EventEmitter(), { pid, exitCode: null, signalCode: null })
}

describe('owned child cleanup', () => {
  it('forgets a closed child before its PID can be reused', async () => {
    const manager = new ProcessManager()
    const finished = child(123)
    manager.add(finished)
    finished.emit('close', 0)
    await manager.kill()
    expect(treeKill).not.toHaveBeenCalled()
  })

  it('refuses an unrelated PID', async () => {
    const manager = new ProcessManager()
    manager.add(child(123))
    await expect(manager.kill(999)).rejects.toThrow()
    expect(treeKill).not.toHaveBeenCalled()
  })

  it('terminates each live owned child once and skips a child without a PID', async () => {
    const manager = new ProcessManager()
    const active = child(123)
    manager.add(active)
    manager.add(active)
    manager.add(child(undefined))
    await manager.kill()
    await manager.kill()
    expect(treeKill.mock.calls.map(call => call.slice(0, 2))).toEqual([[123, 'SIGTERM']])
  })

  it('waits for the termination callback and retains ownership after an error', async () => {
    const manager = new ProcessManager()
    manager.add(child(123))
    let callback
    treeKill.mockImplementationOnce((_pid, _signal, done) => {
      callback = done
    })
    const complete = vi.fn()
    const killing = manager.kill().then(complete)
    await Promise.resolve()
    expect(callback).toBeTypeOf('function')
    expect(complete).not.toHaveBeenCalled()
    const rejected = expect(killing).rejects.toThrow('Access denied')
    callback(new Error('Access denied'))
    await rejected
    await manager.kill()
    expect(treeKill).toHaveBeenCalledTimes(2)
  })
})
