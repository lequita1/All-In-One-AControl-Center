import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const external = vi.hoisted(() => ({ values: new Map(), getDeviceList: vi.fn() }))
vi.stubGlobal('window', { $preload: {
  store: {
    get: key => external.values.get(key),
    set: (key, value) => external.values.set(key, value),
  },
  adb: { getDeviceList: external.getDeviceList },
} })
// Existing source relies on Vite's auto-import transform; use Vue's real refs.
vi.stubGlobal('ref', ref)
const { useDeviceStore } = await import('../index.js')
const { mergeDevices, getDeviceName } = await import('../helpers/index.js')

function pending() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  external.values.clear()
  external.getDeviceList.mockReset()
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.useRealTimers()
})

describe('device connection state', () => {
  it('pauses a captured action while refreshing or stale and checks its own target', async () => {
    const store = useDeviceStore()
    external.getDeviceList.mockResolvedValue([{ id: 'A', type: 'device' }, { id: 'B', type: 'unauthorized' }])
    await store.getList()
    const command = vi.fn(() => true)
    expect(store.runDeviceAction('A', command)).toBe(true)
    expect(command).toHaveBeenCalledOnce()
    expect(store.runDeviceAction('B', command)).toBe(false)
    expect(store.runDeviceAction('missing', command)).toBe(false)
    const refresh = pending()
    external.getDeviceList.mockReturnValueOnce(refresh.promise)
    const refreshing = store.getList()
    expect(store.runDeviceAction('A', command)).toBe(false)
    refresh.reject(new Error('Service unavailable'))
    await expect(refreshing).rejects.toThrow('Service unavailable')
    expect(store.runDeviceAction('A', command)).toBe(false)
    expect(command).toHaveBeenCalledOnce()
    external.getDeviceList.mockResolvedValue([{ id: 'A', type: 'device' }, { id: 'B', type: 'device' }])
    await store.getList()
    store.selectDevice('B')
    expect(store.runDeviceAction('A', command)).toBe(true)
    expect(command).toHaveBeenCalledTimes(2)
  })

  it('marks a remembered device offline when it is missing from the current snapshot', () => {
    expect(mergeDevices([{ id: 'A', name: 'Phone A', status: 'device', type: 'device' }], [])).toEqual([
      { id: 'A', name: 'Phone A', status: 'offline', type: 'offline' },
    ])
  })

  it('uses the model when present and does not call an unidentified connected phone unauthorized', () => {
    expect(getDeviceName({ model: 'model:POCO_X3', product: 'product:surya' })).toBe('POCO X3')
    // A server omitting the USB path shifts this adbkit version's positional fields.
    expect(getDeviceName({ path: 'product:surya_global', product: 'model:M2007J20CG', model: 'device:surya' })).toBe('M2007J20CG')
    expect(getDeviceName({ type: 'device' })).toBe('')
  })

  it('keeps the selected target through disconnect/reconnect instead of switching to B', async () => {
    const store = useDeviceStore()
    external.getDeviceList.mockResolvedValue([{ id: 'A', type: 'device' }, { id: 'B', type: 'device' }])
    await store.getList()
    store.selectDevice('A')
    external.getDeviceList.mockResolvedValue([{ id: 'B', type: 'device' }])
    await store.getList()
    expect(store.selectedId).toBe('A')
    expect(store.selectedDevice.status).toBe('offline')
    external.getDeviceList.mockResolvedValue([{ id: 'A', type: 'device' }, { id: 'B', type: 'device' }])
    await store.getList()
    expect(store.selectedId).toBe('A')
    expect(store.selectedDevice.status).toBe('device')
  })

  it('ignores an older device-list response after a newer refresh completes', async () => {
    const store = useDeviceStore()
    const older = pending()
    const newer = pending()
    external.getDeviceList.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    const first = store.getList()
    const second = store.getList()
    newer.resolve([{ id: 'B', type: 'device' }])
    await second
    older.resolve([{ id: 'A', type: 'device' }])
    await first
    expect(store.list.map(device => device.id)).toEqual(['B'])
  })

  it('retains the snapshot but exposes service failure and releases loading without automatic retries', async () => {
    const store = useDeviceStore()
    external.getDeviceList.mockResolvedValueOnce([{ id: 'A', type: 'device' }])
    await store.getList()
    external.getDeviceList.mockRejectedValueOnce(new Error('failed to start daemon'))
    await expect(store.getList()).rejects.toThrow('failed to start daemon')
    expect(store.list[0].id).toBe('A')
    expect(store.error).toBeTruthy()
    expect(store.loading).toBe(false)
    expect(external.getDeviceList).toHaveBeenCalledTimes(2)
  })

  it('does not restore a stale error when an earlier refresh fails after a successful one', async () => {
    const store = useDeviceStore()
    const older = pending()
    external.getDeviceList.mockReturnValueOnce(older.promise).mockResolvedValueOnce([{ id: 'B', type: 'device' }])
    const first = store.getList()
    const rejected = expect(first).rejects.toThrow('old failure')
    await store.getList()
    older.reject(new Error('old failure'))
    await rejected
    expect(store.error).toBeFalsy()
    expect(store.loading).toBe(false)
  })

  it('releases a stalled refresh and ignores its eventual response', async () => {
    vi.useFakeTimers()
    const store = useDeviceStore()
    const stalled = pending()
    external.getDeviceList.mockReturnValueOnce(stalled.promise)
    const result = store.getList({ timeout: 50 })
    const rejected = expect(result).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(50)
    await rejected
    expect(store.loading).toBe(false)
    stalled.resolve([{ id: 'A', type: 'device' }])
    await Promise.resolve()
    expect(store.list).toEqual([])
  })
})
