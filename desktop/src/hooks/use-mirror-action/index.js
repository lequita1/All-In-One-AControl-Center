import { sleep } from '$/utils/index.js'

export function useMirrorAction() {
  const deviceStore = useDeviceStore()
  const preferenceStore = usePreferenceStore()

  const loading = ref(false)

  async function invoke(device, { ...options } = {}) {
    const devices = Array.isArray(device) ? device : [device]

    loading.value = true

    try {
      for (let index = 0; index < devices.length; index++) {
        const item = devices[index]
        await startMirror(item, { ...options, resolveOnReady: true })
        await sleep()
      }
    }
    finally {
      loading.value = false
    }
  }

  async function startMirror(item, options) {
    const deviceId = item?.id || item

    try {
      const args = preferenceStore.scrcpyParameter(deviceId)
      await window.$preload.scrcpy.mirror(deviceId, {
        title: deviceStore.getLabel(deviceId, 'mirror'),
        args,
        ...options,
      })
    }
    catch (error) {
      ElMessage.warning(error?.message || window.t('connection.mirrorError'))
    }
  }

  return {
    loading,
    invoke,
  }
}

export default useMirrorAction
