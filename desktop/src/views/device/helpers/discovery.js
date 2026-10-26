/** Own one tracker subscription and its delayed refreshes for a device view. */
export function createDeviceDiscovery({ subscribe, onChange, onError, delay = 300, timeout = 5000 }) {
  let stopped = false
  let version = 0
  let close = null
  let starting = null
  let cancelStart = null
  let refreshTimer

  function closeTracker() {
    const dispose = close
    close = null
    dispose?.()
  }

  function event(type) {
    if (stopped)
      return
    if (type === 'error' || type === 'end') {
      clearTimeout(refreshTimer)
      version++
      closeTracker()
      onError(new Error('Device discovery stopped. Refresh to reconnect.'))
      return
    }
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      Promise.resolve().then(onChange).catch(onError)
    }, delay)
  }

  function start() {
    if (stopped || close)
      return Promise.resolve()
    if (starting)
      return starting
    const attempt = ++version
    let timer
    let subscription
    let disposed = false
    const dispose = (callback) => {
      if (!disposed && typeof callback === 'function') {
        disposed = true
        callback()
      }
    }
    try {
      subscription = Promise.resolve(subscribe((...args) => {
        if (!stopped && version === attempt)
          event(...args)
      }))
    }
    catch (error) {
      onError(error)
      return Promise.resolve()
    }
    const accepted = subscription.then((callback) => {
      if (stopped || version !== attempt) {
        dispose(callback)
        return null
      }
      if (typeof callback !== 'function')
        throw new TypeError('Device discovery did not return a disposer')
      return callback
    })
    const task = Promise.race([
      accepted,
      new Promise((_, reject) => {
        cancelStart = () => reject(new Error('Device discovery closed'))
        timer = setTimeout(() => reject(new Error('Device discovery timed out')), timeout)
      }),
    ]).then((callback) => {
      if (stopped || version !== attempt)
        dispose(callback)
      else
        close = () => dispose(callback)
    }).catch((error) => {
      if (!stopped && version === attempt) {
        version++
        onError(error)
      }
    }).finally(() => {
      clearTimeout(timer)
      if (starting === task) {
        starting = null
        cancelStart = null
      }
    })
    starting = task
    return task
  }

  function stop() {
    if (stopped)
      return
    stopped = true
    version++
    clearTimeout(refreshTimer)
    cancelStart?.()
    closeTracker()
  }
  return { start, stop }
}
