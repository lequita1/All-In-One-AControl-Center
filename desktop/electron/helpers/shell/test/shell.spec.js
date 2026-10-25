import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import treeKill from '@magda/tree-kill'
import { sheller } from '../index.js'

const boundary = vi.hoisted(() => ({ calls: [] }))
vi.mock('$electron/process/helper.js', () => ({ setupEnvPath() {} }))
vi.mock('@magda/tree-kill', () => ({ default: vi.fn() }))
vi.mock('node:child_process', () => ({
  spawn: (executable, args, options) => {
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.pid = 123
    boundary.calls.push({ executable, args, options, child })
    return child
  },
}))

beforeEach(() => {
  boundary.calls.length = 0
})

describe('host process creation', () => {
  it.each(['tool && other', 'tool > output', 'tool # hidden', ['tool', { op: ';' }]])('rejects unsafe input before spawn: %j', (command) => {
    expect(() => sheller(command)).toThrow()
    expect(boundary.calls).toHaveLength(0)
  })

  it('does not allow a caller to enable the host shell', () => {
    expect(() => sheller(['tool', 'literal'], { shell: true })).toThrow()
    expect(boundary.calls).toHaveLength(0)
  })

  it('preserves literal values and propagates child output', async () => {
    const result = sheller(['C:\\tools with spaces\\tool.exe', 'a & b', '$HOME', '"quoted"'])
    expect(boundary.calls[0]).toMatchObject({
      executable: 'C:\\tools with spaces\\tool.exe', args: ['a & b', '$HOME', '"quoted"'], options: { shell: false },
    })
    boundary.calls[0].child.stdout.emit('data', Buffer.from('done'))
    boundary.calls[0].child.emit('close', 0, null)
    await expect(result).resolves.toMatchObject({ stdout: Buffer.from('done'), failed: false })
  })

  it('waits for child cancellation and reports termination failure', async () => {
    const child = sheller(['tool'])
    let callback
    treeKill.mockImplementationOnce((_pid, _signal, done) => {
      callback = done
    })
    const killing = child.kill()
    expect(callback).toBeTypeOf('function')
    const rejected = expect(killing).rejects.toThrow('Access denied')
    callback(new Error('Access denied'))
    await rejected
    boundary.calls[0].child.emit('close', 0, null)
    await child
  })
})
