import { onScopeDispose } from 'vue'
import { createDeviceDiscovery } from '$/views/device/helpers/discovery.js'

export function useDeviceConnection(store, { subscribe = callback => window.$preload.adb.watch(callback) } = {}) {
  async function getList() {
    try {
      await store.getList()
    }
    catch {
      // The store owns stale/error state; discovery must still be recoverable.
    }
  }
  const discovery = createDeviceDiscovery({
    subscribe,
    onChange: getList,
    onError: () => { store.error = window.t('connection.serviceError') },
  })
  async function refresh() {
    await getList()
    await discovery.start()
  }
  refresh()
  onScopeDispose(() => discovery.stop())
  return { refresh }
}
