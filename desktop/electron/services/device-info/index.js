import { ipcMain } from 'electron'
import { Adb } from '@devicefarmer/adbkit'
import { parseBatteryDump, validateDeviceSerial } from '@escrcpy/shared'
import { assertMainApplication } from '../helpers/main-frame.js'

function beforeDeadline(promise, milliseconds, onTimeout = () => {}) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        onTimeout()
        reject(new Error('Device information timed out'))
      }, Math.max(1, milliseconds))
    }),
  ]).finally(() => clearTimeout(timer))
}

/** Only these fixed read-only commands cross this service's device boundary. */
export async function readDeviceInfo(client, serial, { timeout = 5000 } = {}) {
  validateDeviceSerial(serial)
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 15000) {
    throw new TypeError('Invalid device information timeout')
  }
  const deadline = Date.now() + timeout
  const devices = await beforeDeadline(client.listDevicesWithPaths(), timeout)
  const target = devices.find(device => device.id === serial)
  if (!target || !['device', 'emulator'].includes(target.type)) {
    throw new Error(target?.type === 'unauthorized' ? 'Authorize USB debugging on the phone' : 'The selected device is not connected')
  }
  const device = client.getDevice(serial)

  async function read(command) {
    let stream
    const operation = (async () => {
      stream = await device.shell(command)
      if (Date.now() >= deadline) {
        stream.destroy()
        throw new Error('Device information timed out')
      }
      const chunks = []
      let size = 0
      try {
        for await (const chunk of stream) {
          const buffer = Buffer.from(chunk)
          size += buffer.length
          if (size > 262144) {
            throw new Error('Device information output exceeds the limit')
          }
          chunks.push(buffer)
        }
        return Buffer.concat(chunks).toString('utf8')
      }
      finally {
        stream.destroy()
      }
    })()
    return beforeDeadline(operation, deadline - Date.now(), () => stream?.destroy())
  }

  const results = await Promise.allSettled(['getprop', 'dumpsys battery', 'wm size'].map(read))
  const output = results.map(result => result.status === 'fulfilled' ? result.value : '')
  const properties = new Map(output[0].split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\[([^\n]+?)\]: \[(.*)\]$/)
    return match ? [[match[1], match[2].trim().slice(0, 200)]] : []
  }))
  const value = key => properties.get(key) || null
  const battery = parseBatteryDump(output[1]).raw
  const level = typeof battery.level === 'number' ? battery.level : NaN
  const scale = typeof battery.scale === 'number' ? battery.scale : NaN
  const validBattery = scale > 0 && level >= 0 && level <= scale
  const powered = [battery.usbPowered, battery.acPowered, battery.wirelessPowered, battery.dockPowered]
  const screen = output[2].match(/Override size:\s*(\d+)x(\d+)/) || output[2].match(/Physical size:\s*(\d+)x(\d+)/)
  const validScreen = screen && Number(screen[1]) > 0 && Number(screen[1]) <= 32768 && Number(screen[2]) > 0 && Number(screen[2]) <= 32768
  const info = {
    id: serial,
    model: value('ro.product.model'),
    manufacturer: value('ro.product.manufacturer'),
    androidVersion: value('ro.build.version.release'),
    sdkVersion: value('ro.build.version.sdk'),
    batteryPercentage: validBattery ? Math.round(level / scale * 100) : null,
    charging: powered.some(item => typeof item === 'boolean') ? powered.includes(true) : null,
    screenWidth: validScreen ? Number(screen[1]) : null,
    screenHeight: validScreen ? Number(screen[2]) : null,
    unavailable: [],
  }
  if (!info.model && !info.androidVersion && !info.manufacturer) {
    info.unavailable.push('properties')
  }
  if (!validBattery) {
    info.unavailable.push('battery')
  }
  if (!validScreen) {
    info.unavailable.push('screen')
  }
  if (info.unavailable.length === 3) {
    throw new Error('Device information is unavailable')
  }
  return info
}

export function createDeviceInfoHandler(mainApp, client) {
  return async (event, serial) => {
    assertMainApplication(mainApp, event)
    return readDeviceInfo(client, serial)
  }
}

export default {
  name: 'service:device-info',
  deps: ['module:main'],
  apply(mainApp) {
    ipcMain.handle('device-info:read', createDeviceInfoHandler(mainApp, Adb.createClient()))
  },
}
