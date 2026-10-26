import { watch } from 'vue'

export function watchInitialWirelessConnection(devices, ready, connect, onError = () => {}) {
  let started = false
  const stop = watch([devices, ready], async ([snapshot, available]) => {
    if (started || !available)
      return
    started = true
    try {
      await Promise.resolve().then(() => connect(snapshot))
    }
    catch (error) {
      onError(error)
    }
    finally {
      stop?.()
    }
  }, { immediate: true })
  return stop
}
