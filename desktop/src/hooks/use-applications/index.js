import { onScopeDispose, ref, watch } from 'vue'

export function useApplications(selected, ready, api = window.$preload.apps) {
  const users = ref([])
  const userId = ref(null)
  const packages = ref([])
  const loading = ref(false)
  const busy = ref(false)
  const error = ref('')
  const notice = ref(null)
  let version = 0
  let active = true
  let previousSerial

  async function loadPackages(serial, id, request) {
    const result = await api.list({ serial, userId: id })
    if (!active || request !== version)
      return
    if (result?.serial !== serial || result?.userId !== id || !Array.isArray(result.packages) || !Array.isArray(result.users))
      throw new Error('Application response target mismatch')
    packages.value = result.packages
    users.value = result.users
  }

  async function refresh() {
    const request = ++version
    const serial = selected.value?.id
    if (serial !== previousSerial)
      userId.value = null
    previousSerial = serial
    packages.value = []
    users.value = []
    notice.value = null
    error.value = ''
    loading.value = false
    if (!active || !serial || !ready.value)
      return
    loading.value = true
    try {
      const result = await api.users(serial)
      if (!active || request !== version)
        return
      if (result?.serial !== serial || !Array.isArray(result.users) || !result.users.length)
        throw new Error('Android users are unavailable')
      users.value = result.users
      userId.value = result.users.some(user => user.id === userId.value) ? userId.value : (result.users.find(user => user.id === 0)?.id ?? result.users[0].id)
      await loadPackages(serial, userId.value, request)
    }
    catch (failure) {
      if (active && request === version)
        error.value = failure?.message || String(failure)
    }
    finally {
      if (active && request === version)
        loading.value = false
    }
  }

  async function selectUser(id) {
    if (!users.value.some(user => user.id === id))
      throw new Error('Choose a listed Android user')
    if (!ready.value || busy.value)
      return
    userId.value = id
    const request = ++version
    const serial = selected.value?.id
    packages.value = []
    notice.value = null
    error.value = ''
    loading.value = true
    try {
      await loadPackages(serial, id, request)
    }
    catch (failure) {
      if (active && request === version)
        error.value = failure?.message || String(failure)
    }
    finally {
      if (active && request === version)
        loading.value = false
    }
  }

  async function perform(packageName, action) {
    if (!active || !ready.value || loading.value || busy.value || error.value || !packages.value.some(item => item.packageName === packageName))
      return
    const request = version
    const target = { serial: selected.value.id, userId: userId.value, packageName, action }
    busy.value = true
    notice.value = null
    try {
      const result = await api.perform(target)
      if (!active || request !== version)
        return
      if (result?.serial !== target.serial || result?.userId !== target.userId || result?.packageName !== target.packageName || result?.action !== target.action || !['completed', 'cancelled'].includes(result.status))
        throw new Error('Application action outcome could not be verified')
      notice.value = result
      if (result.status === 'completed')
        await loadPackages(target.serial, target.userId, request)
    }
    catch (failure) {
      if (active && request === version)
        error.value = failure?.message || String(failure)
    }
    finally {
      busy.value = false
    }
  }

  watch([() => selected.value?.id, () => selected.value?.status, ready], refresh, { immediate: true })
  onScopeDispose(() => {
    active = false
    version++
  })
  return { users, userId, packages, loading, busy, error, notice, refresh, selectUser, perform }
}
