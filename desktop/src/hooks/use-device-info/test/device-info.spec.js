import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useDeviceInfo } from '../index.js'

function pending() {
  let resolve
  const promise = new Promise((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

describe('selected device summary', () => {
  it('does not show an earlier phone response under the newly selected phone', async () => {
    const first = pending()
    const second = pending()
    const read = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const selected = ref({ id: 'A', status: 'device' })
    const ready = ref(true)
    const scope = effectScope()
    const summary = scope.run(() => useDeviceInfo(selected, ready, read))
    selected.value = { id: 'B', status: 'device' }
    await nextTick()
    second.resolve({ id: 'B', model: 'Phone B' })
    await nextTick()
    first.resolve({ id: 'A', model: 'Phone A' })
    await nextTick()
    expect(summary.data.value).toEqual({ id: 'B', model: 'Phone B' })
    expect(read.mock.calls).toEqual([['A'], ['B']])
    scope.stop()
  })

  it('clears metrics and does not query a target whose connection is unavailable', async () => {
    const selected = ref({ id: 'A', status: 'device' })
    const ready = ref(true)
    const read = vi.fn().mockResolvedValue({ id: 'A', batteryPercentage: 0 })
    const scope = effectScope()
    const summary = scope.run(() => useDeviceInfo(selected, ready, read))
    await nextTick()
    expect(summary.data.value.batteryPercentage).toBe(0)
    ready.value = false
    selected.value = { id: 'A', status: 'unauthorized' }
    await nextTick()
    expect(summary.data.value).toBeNull()
    expect(summary.loading.value).toBe(false)
    expect(read).toHaveBeenCalledOnce()
    scope.stop()
  })

  it('ignores responses after the view is disposed', async () => {
    const reading = pending()
    const scope = effectScope()
    const summary = scope.run(() => useDeviceInfo(ref({ id: 'A', status: 'device' }), ref(true), () => reading.promise))
    scope.stop()
    reading.resolve({ id: 'A', model: 'Late response' })
    await nextTick()
    expect(summary.data.value).toBeNull()
  })

  it('rejects a response tagged for another phone', async () => {
    const scope = effectScope()
    const summary = scope.run(() => useDeviceInfo(ref({ id: 'A', status: 'device' }), ref(true), async () => ({ id: 'B' })))
    await nextTick()
    expect(summary.data.value).toBeNull()
    expect(summary.error.value).toBeTruthy()
    expect(summary.loading.value).toBe(false)
    scope.stop()
  })
})
