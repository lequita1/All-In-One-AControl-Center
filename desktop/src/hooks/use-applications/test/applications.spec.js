import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useApplications } from '../index.js'

function pending() {
  let resolve
  const promise = new Promise((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
async function flush() {
  for (let i = 0; i < 6; i++) await nextTick()
}
function fixture(overrides = {}) {
  const selected = ref({ id: 'A', status: 'device' })
  const ready = ref(true)
  const api = {
    users: vi.fn(async serial => ({ serial, users: [{ id: 0, name: 'Owner' }, { id: 10, name: 'Work' }] })),
    list: vi.fn(async target => ({ ...target, packages: [{ packageName: 'com.example.app', userInstalled: true, enabled: true }], users: [{ id: 0 }, { id: 10 }] })),
    perform: vi.fn(async target => ({ ...target, status: 'completed' })),
    install: vi.fn(async target => ({ ...target, action: 'install', status: 'completed', fileCount: 2 })),
    ...overrides,
  }
  const scope = effectScope()
  const library = scope.run(() => useApplications(selected, ready, api))
  return { selected, ready, api, scope, library }
}

describe('application library selection', () => {
  it('installs for the captured user and refreshes after a verified install result', async () => {
    const f = fixture()
    await flush()
    await f.library.selectUser(10)
    const previous = f.api.list.mock.calls.length
    await f.library.install()
    expect(f.api.install).toHaveBeenCalledWith({ serial: 'A', userId: 10 })
    expect(f.library.notice.value).toMatchObject({ action: 'install', status: 'completed', fileCount: 2 })
    expect(f.api.list.mock.calls.length).toBe(previous + 1)
    f.scope.stop()
  })

  it('discards an installation result after the selected phone changes', async () => {
    const f = fixture()
    await flush()
    const result = pending()
    f.api.install.mockReturnValueOnce(result.promise)
    const operation = f.library.install()
    f.selected.value = { id: 'B', status: 'device' }
    await flush()
    result.resolve({ serial: 'A', userId: 0, action: 'install', status: 'completed', fileCount: 1 })
    await operation
    expect(f.api.install).toHaveBeenCalledWith({ serial: 'A', userId: 0 })
    expect(f.library.notice.value).toBeNull()
    f.scope.stop()
  })

  it('does not install while disconnected or accept a mismatched install response', async () => {
    const f = fixture({ install: vi.fn(async target => ({ ...target, serial: 'B', action: 'install', status: 'completed' })) })
    await flush()
    await f.library.install()
    expect(f.library.error.value).toMatch(/outcome.*verified/i)
    expect(f.library.notice.value).toBeNull()
    f.ready.value = false
    await flush()
    await f.library.install()
    expect(f.api.install).toHaveBeenCalledOnce()
    f.scope.stop()
  })

  it('discards users from a previous phone and loads only the current tuple', async () => {
    const a = pending()
    const f = fixture({ users: vi.fn(serial => serial === 'A' ? a.promise : Promise.resolve({ serial: 'B', users: [{ id: 10 }] })) })
    f.selected.value = { id: 'B', status: 'device' }
    await flush()
    // First immediate request is already running; a later A response must not win.
    a.resolve({ serial: 'A', users: [{ id: 0 }] })
    await flush()
    expect(f.library.userId.value).toBe(10)
    expect(f.library.packages.value).toHaveLength(1)
    expect(f.api.list.mock.calls.every(([target]) => target.serial !== 'A')).toBe(true)
    f.scope.stop()
  })

  it('queries the explicitly chosen Android user and rejects an absent user', async () => {
    const f = fixture()
    await flush()
    await f.library.selectUser(10)
    expect(f.api.list).toHaveBeenLastCalledWith({ serial: 'A', userId: 10 })
    await expect(f.library.selectUser(22)).rejects.toThrow()
    f.scope.stop()
  })

  it('captures an action tuple and does not show its result under another phone', async () => {
    const f = fixture()
    await flush()
    const operation = pending()
    f.api.perform.mockReturnValueOnce(operation.promise)
    const acting = f.library.perform('com.example.app', 'uninstall')
    f.selected.value = { id: 'B', status: 'device' }
    await flush()
    operation.resolve({ serial: 'A', userId: 0, packageName: 'com.example.app', action: 'uninstall', status: 'completed' })
    await acting
    expect(f.api.perform).toHaveBeenCalledWith({ serial: 'A', userId: 0, packageName: 'com.example.app', action: 'uninstall' })
    expect(f.library.notice.value).toBeNull()
    expect(f.library.busy.value).toBe(false)
    f.scope.stop()
  })

  it('pauses actions after disconnect', async () => {
    const f = fixture()
    await flush()
    f.ready.value = false
    await flush()
    await f.library.perform('com.example.app', 'uninstall')
    expect(f.api.perform).not.toHaveBeenCalled()
    expect(f.library.packages.value).toEqual([])
    f.scope.stop()
  })

  it('does not apply a pending inventory after the view scope is disposed', async () => {
    const reading = pending()
    const f = fixture({ list: vi.fn(() => reading.promise) })
    await flush()
    expect(f.api.list).toHaveBeenCalledOnce()
    f.scope.stop()
    reading.resolve({ serial: 'A', userId: 0, users: [{ id: 0 }], packages: [{ packageName: 'com.late.app' }] })
    await flush()
    expect(f.library.packages.value).toEqual([])
  })

  it('rejects an inventory for a different phone', async () => {
    const f = fixture({ list: vi.fn(async () => ({ serial: 'B', userId: 0, users: [{ id: 0 }], packages: [] })) })
    await flush()
    expect(f.library.error.value).toMatch(/target mismatch/i)
    expect(f.library.packages.value).toEqual([])
    f.scope.stop()
  })
})
