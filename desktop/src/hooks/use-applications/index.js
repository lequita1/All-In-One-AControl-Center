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

  async function runAction(target, method) {
    if (!active || !ready.value || loading.value || busy.value || error.value || !Number.isInteger(userId.value))
      return
    const request = version
    busy.value = true
    notice.value = null
    try {
      const result = await api[method](method === 'install' ? { serial: target.serial, userId: target.userId } : target)
      if (!active || request !== version)
        return
      if (!result || Object.entries(target).some(([key, value]) => result[key] !== value) || !['completed', 'cancelled'].includes(result.status))
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

  async function perform(packageName, action) {
    if (!packages.value.some(item => item.packageName === packageName))
      return
    return runAction({ serial: selected.value?.id, userId: userId.value, packageName, action }, 'perform')
  }

  async function install() {
    return runAction({ serial: selected.value?.id, userId: userId.value, action: 'install' }, 'install')
  }

  watch([() => selected.value?.id, () => selected.value?.status, ready], refresh, { immediate: true })
  onScopeDispose(() => {
    active = false
    version++
  })
  return { users, userId, packages, loading, busy, error, notice, refresh, selectUser, perform, install }
}
