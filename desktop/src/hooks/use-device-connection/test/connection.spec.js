import { effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useDeviceConnection } from '../index.js'

describe('application-wide device connection', () => {
  it('starts discovery independently of the device page and owns one subscription', async () => {
    const store = { getList: vi.fn(async () => []), error: '' }
    const close = vi.fn()
    const subscribe = vi.fn(async () => close)
    const scope = effectScope()
    const connection = scope.run(() => useDeviceConnection(store, { subscribe }))
    await connection.refresh()
    await connection.refresh()
    expect(store.getList).toHaveBeenCalledTimes(3)
    expect(subscribe).toHaveBeenCalledOnce()
    scope.stop()
    expect(close).toHaveBeenCalledOnce()
  })
})
