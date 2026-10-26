import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { watchInitialWirelessConnection } from '../initial-connection.js'

describe('saved wireless initial connection', () => {
  it('runs once when Devices mounts after the initial snapshot has already loaded', async () => {
    const devices = ref([{ id: 'saved-phone:5555' }])
    const ready = ref(true)
    const connect = vi.fn()
    const scope = effectScope()
    scope.run(() => watchInitialWirelessConnection(devices, ready, connect))
    await nextTick()
    expect(connect).toHaveBeenCalledWith(devices.value)
    devices.value = [{ id: 'another:5555' }]
    await nextTick()
    expect(connect).toHaveBeenCalledOnce()
    scope.stop()
  })

  it('waits for a non-stale completed snapshot before automatic connection', async () => {
    const devices = ref([])
    const ready = ref(false)
    const connect = vi.fn()
    const scope = effectScope()
    scope.run(() => watchInitialWirelessConnection(devices, ready, connect))
    devices.value = [{ id: 'saved:5555' }]
    await nextTick()
    expect(connect).not.toHaveBeenCalled()
    ready.value = true
    await nextTick()
    expect(connect).toHaveBeenCalledOnce()
    scope.stop()
  })
})
