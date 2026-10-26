import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { capitalize } from 'lodash-es'
import { name as packageName } from '$root/package.json'
import {
  getCurrentDevices,
  getHistoryDevices,
  mergeDevices,
  saveDevicesToStore,
} from './helpers/index.js'

const $electronStore = window.$preload.store

export const useDeviceStore = defineStore('app-device', () => {
  const list = ref([])
  const config = ref({})
  const loading = ref(false)
  const error = ref('')
  const rememberedSelection = $electronStore.get('ui.selectedDeviceId')
  const selectedId = ref(typeof rememberedSelection === 'string' ? rememberedSelection : '')
  const selectedDevice = computed(() => list.value.find(device => device.id === selectedId.value)
    || (selectedId.value ? { id: selectedId.value, status: 'offline', type: 'offline' } : null))
  const selectedReady = computed(() => isDeviceReady(selectedId.value))
  let requestVersion = 0

  function init() {
    config.value = {
      ...($electronStore.get('device') || {}),
    }
    return config.value
  }

  function getLabel(device, params) {
    const data = device?.id
      ? device
      : list.value.find(item => item.id === device)

    if (!data) {
      return ''
    }

    const appName = capitalize(packageName)
    const deviceSerial = data.id.replaceAll(/[<>:"/\\|?*]/g, '_')
    // Fallback for devices without remark/name (e.g. partially hydrated payloads)
    // so labels and generated file names never contain a literal `undefined`.
    const displayName = data.remark || data.name || window.t?.('common.unknownDevice') || 'Unknown Device'
    const deviceName = `${displayName}[${deviceSerial}]`
    const currentTime = dayjs().format('YYYYMMDDHHmmss')
    let value = `${deviceName}-${appName}`

    const createPreset = type => `${deviceName}-${capitalize(type)}-${appName}`

    const presets = {
      screenshot: `${deviceName}-Screenshot-${currentTime}`,
      name: deviceName,
    }

    if (typeof params === 'function') {
      value = params({
        data,
        appName,
        deviceName,
        currentTime,
      })
    }
    else if (params && typeof params === 'string') {
      value = presets[params] || createPreset(params)
    }

    return value
  }

  function selectDevice(id) {
    if (typeof id !== 'string' || (id && !list.value.some(device => device.id === id))) {
      throw new TypeError('Select a device from the current list')
    }
    selectedId.value = id
    $electronStore.set('ui.selectedDeviceId', id)
  }

  function isDeviceReady(id) {
    return !error.value && !loading.value
      && list.value.some(device => device.id === id && ['device', 'emulator'].includes(device.status))
  }

  function runDeviceAction(id, action) {
    return isDeviceReady(id) ? action() : false
  }

  async function getList({ timeout = 10000 } = {}) {
    if (!Number.isFinite(timeout) || timeout < 1 || timeout > 60000) {
      throw new TypeError('Invalid device refresh timeout')
    }
    const version = ++requestVersion
    let timer
    loading.value = true
    error.value = ''
    try {
      const currentDevices = await Promise.race([
        getCurrentDevices(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Device refresh timed out')), timeout)
        }),
      ])
      if (version !== requestVersion) {
        return list.value
      }
      const mergedDevices = mergeDevices(getHistoryDevices(), currentDevices)
      saveDevicesToStore(mergedDevices)
      list.value = mergedDevices
      if (!selectedId.value && mergedDevices.length) {
        selectDevice(mergedDevices.find(device => ['device', 'emulator'].includes(device.status))?.id || mergedDevices[0].id)
      }
      return mergedDevices
    }
    catch (failure) {
      if (version === requestVersion) {
        error.value = failure?.message || String(failure)
      }
      throw failure
    }
    finally {
      clearTimeout(timer)
      if (version === requestVersion) {
        loading.value = false
      }
    }
  }

  function setRemark(deviceId, value) {
    $electronStore.set(['device', deviceId, 'remark'], value)
    init()
  }

  return {
    list,
    config,
    loading,
    error,
    selectedId,
    selectedDevice,
    selectedReady,
    isDeviceReady,
    runDeviceAction,
    selectDevice,
    init,
    getLabel,
    getList,
    setRemark,
  }
})
