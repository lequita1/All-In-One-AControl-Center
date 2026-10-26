import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMirrorAction } from '../index.js'

vi.mock('$/utils/index.js', () => ({ sleep: async () => {} }))
const mirror = vi.fn()
const parameters = vi.fn(() => '--no-audio')
const warning = vi.fn()
beforeEach(() => {
  mirror.mockReset()
  parameters.mockClear()
  warning.mockClear()
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useDeviceStore', () => ({ getLabel: () => 'Phone' }))
  vi.stubGlobal('usePreferenceStore', () => ({ scrcpyParameter: parameters }))
  vi.stubGlobal('window', { $preload: { scrcpy: { mirror } } })
  vi.stubGlobal('ElMessage', { warning })
})

describe('mirror action feedback', () => {
  it('reports failure and always releases the loading state', async () => {
    mirror.mockRejectedValue(new Error('Device unauthorized'))
    const action = useMirrorAction()
    await action.invoke({ id: 'A' })
    expect(warning).toHaveBeenCalledWith('Device unauthorized')
    expect(action.loading.value).toBe(false)
  })

  it('releases loading even when building the options fails', async () => {
    parameters.mockImplementationOnce(() => {
      throw new Error('Invalid options')
    })
    const action = useMirrorAction()
    await action.invoke({ id: 'A' })
    expect(action.loading.value).toBe(false)
    expect(warning).toHaveBeenCalledWith('Invalid options')
    expect(mirror).not.toHaveBeenCalled()
  })
})
