import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDeviceDiscovery } from '../discovery.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('device discovery ownership', () => {
  it('subscribes once and disposes its tracker once', async () => {
    const close = vi.fn()
    const subscribe = vi.fn(async () => close)
    const discovery = createDeviceDiscovery({ subscribe, onChange: vi.fn(), onError: vi.fn() })
    await Promise.all([discovery.start(), discovery.start()])
    expect(subscribe).toHaveBeenCalledOnce()
    discovery.stop()
    discovery.stop()
    expect(close).toHaveBeenCalledOnce()
  })

  it('disposes a subscription that arrives after the view closes', async () => {
    let resolve
    const close = vi.fn()
    const discovery = createDeviceDiscovery({
      subscribe: () => new Promise((yes) => {
        resolve = yes
      }),
      onChange: vi.fn(),
      onError: vi.fn(),
    })
    const starting = discovery.start()
    discovery.stop()
    resolve(close)
    await starting
    expect(close).toHaveBeenCalledOnce()
  })

  it('coalesces change events and cancels delayed refresh on disposal', async () => {
    vi.useFakeTimers()
    let event
    const onChange = vi.fn()
    const discovery = createDeviceDiscovery({
      subscribe: async (callback) => {
        event = callback
        return vi.fn()
      },
      onChange,
      onError: vi.fn(),
      delay: 100,
    })
    await discovery.start()
    event('add', { id: 'A' })
    event('change', { id: 'A', type: 'device' })
    await vi.advanceTimersByTimeAsync(100)
    expect(onChange).toHaveBeenCalledOnce()
    event('remove', { id: 'A' })
    discovery.stop()
    await vi.advanceTimersByTimeAsync(100)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('reports a stalled tracker, permits manual retry and closes its late subscription', async () => {
    vi.useFakeTimers()
    let resolve
    const lateClose = vi.fn()
    const activeClose = vi.fn()
    const onError = vi.fn()
    const subscribe = vi.fn().mockImplementationOnce(() => new Promise((yes) => {
      resolve = yes
    })).mockResolvedValueOnce(activeClose)
    const discovery = createDeviceDiscovery({ subscribe, onChange: vi.fn(), onError, timeout: 50 })
    const starting = discovery.start()
    await vi.advanceTimersByTimeAsync(50)
    await starting
    expect(onError).toHaveBeenCalledOnce()
    await discovery.start()
    resolve(lateClose)
    await Promise.resolve()
    expect(lateClose).toHaveBeenCalledOnce()
    discovery.stop()
    expect(activeClose).toHaveBeenCalledOnce()
  })

  it('ignores events from an earlier tracker after restarting', async () => {
    const callbacks = []
    const closes = [vi.fn(), vi.fn()]
    const onError = vi.fn()
    const discovery = createDeviceDiscovery({
      subscribe: async (callback) => {
        callbacks.push(callback)
        return closes[callbacks.length - 1]
      },
      onChange: vi.fn(),
      onError,
    })
    await discovery.start()
    callbacks[0]('end')
    await discovery.start()
    callbacks[0]('end')
    expect(onError).toHaveBeenCalledOnce()
    expect(closes[1]).not.toHaveBeenCalled()
    discovery.stop()
  })
})
