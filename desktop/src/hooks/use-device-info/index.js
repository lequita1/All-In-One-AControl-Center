import { onScopeDispose, ref, watch } from 'vue'

export function useDeviceInfo(selected, ready, read = serial => window.$preload.deviceInfo.read(serial)) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref('')
  let version = 0
  let active = true

  async function refresh() {
    const request = ++version
    const serial = selected.value?.id
    data.value = null
    error.value = ''
    loading.value = false
    if (!active || !serial || !ready.value) {
      return
    }
    loading.value = true
    try {
      const result = await read(serial)
      if (!active || request !== version) {
        return
      }
      if (result?.id !== serial) {
        throw new Error('Device information target mismatch')
      }
      data.value = result
    }
    catch (failure) {
      if (active && request === version) {
        error.value = failure?.message || String(failure)
      }
    }
    finally {
      if (active && request === version) {
        loading.value = false
      }
    }
  }

  watch([() => selected.value?.id, () => selected.value?.status, ready], refresh, { immediate: true })
  onScopeDispose(() => {
    active = false
    version++
  })
  return { data, loading, error, refresh }
}
