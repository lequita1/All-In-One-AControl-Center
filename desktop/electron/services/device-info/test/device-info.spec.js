import { Readable } from 'node:stream'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDeviceInfoHandler, readDeviceInfo } from '../index.js'

vi.mock('electron', () => ({ ipcMain: { handle() {} } }))

function fixture(status = 'device') {
  const shell = vi.fn(async (command) => {
    const output = {
      'getprop': '[ro.product.model]: [POCO X3 NFC]\n[ro.product.manufacturer]: [Xiaomi]\n[ro.build.version.release]: [12]\n[ro.build.version.sdk]: [31]\n[ro.serialno]: [private-serial]',
      'dumpsys battery': 'level: 0\nscale: 100\nUSB powered: true',
      'wm size': 'Physical size: 1080x2400\nOverride size: 720x1600',
    }[command]
    if (output == null)
      throw new Error('Unexpected shell command')
    return Readable.from([Buffer.from(output)])
  })
  const client = {
    listDevicesWithPaths: vi.fn(async () => [{ id: 'device-A', type: status }]),
    getDevice: vi.fn(() => ({ shell })),
  }
  return { client, shell }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('selected device information', () => {
  it('returns only requested public metrics, preserves zero battery and honors screen override', async () => {
    const { client, shell } = fixture()
    await expect(readDeviceInfo(client, 'device-A')).resolves.toEqual({
      id: 'device-A', model: 'POCO X3 NFC', manufacturer: 'Xiaomi', androidVersion: '12', sdkVersion: '31',
      batteryPercentage: 0, charging: true, screenWidth: 720, screenHeight: 1600, unavailable: [],
    })
    expect(client.getDevice.mock.calls).toEqual([['device-A']])
    expect(shell.mock.calls.map(call => call[0])).toEqual(['getprop', 'dumpsys battery', 'wm size'])
  })

  it.each(['unauthorized', 'offline'])('does not query an unavailable target: %s', async (status) => {
    const { client } = fixture(status)
    await expect(readDeviceInfo(client, 'device-A')).rejects.toThrow()
    expect(client.getDevice).not.toHaveBeenCalled()
  })

  it('rejects invalid input before touching the transport', async () => {
    const { client } = fixture()
    await expect(readDeviceInfo(client, 'device-A; reboot')).rejects.toThrow()
    expect(client.listDevicesWithPaths).not.toHaveBeenCalled()
  })

  it('reports an unsupported metric as unavailable while retaining supported information', async () => {
    const { client, shell } = fixture()
    shell.mockImplementation(async command => Readable.from([Buffer.from(command === 'getprop' ? '[ro.product.model]: [POCO]' : '')]))
    const info = await readDeviceInfo(client, 'device-A')
    expect(info.model).toBe('POCO')
    expect(info.batteryPercentage).toBeNull()
    expect(info.charging).toBeNull()
    expect(info.screenWidth).toBeNull()
    expect(info.unavailable).toEqual(['battery', 'screen'])
  })

  it('times out a stalled stream, destroys it and retains completed metrics', async () => {
    vi.useFakeTimers()
    const { client, shell } = fixture()
    const stalled = new Readable({ read() {} })
    const original = shell.getMockImplementation()
    shell.mockImplementation(command => command === 'dumpsys battery' ? Promise.resolve(stalled) : original(command))
    const reading = readDeviceInfo(client, 'device-A', { timeout: 50 })
    await vi.advanceTimersByTimeAsync(50)
    const info = await reading
    expect(info.model).toBe('POCO X3 NFC')
    expect(info.batteryPercentage).toBeNull()
    expect(stalled.destroyed).toBe(true)
  })

  it('limits output from an untrusted device', async () => {
    const { client, shell } = fixture()
    shell.mockImplementation(async () => Readable.from([Buffer.alloc(300000)]))
    await expect(readDeviceInfo(client, 'device-A')).rejects.toThrow()
  })
})

describe('device information IPC boundary', () => {
  function sender() {
    const rendererDir = path.resolve('test-application/dist')
    const frame = { url: `${pathToFileURL(path.join(rendererDir, 'index.html')).href}#/device` }
    const contents = { mainFrame: frame }
    const mainApp = { rendererDir, getMainWindow: () => ({ webContents: contents, isDestroyed: () => false }) }
    return { frame, contents, mainApp, event: { sender: contents, senderFrame: frame } }
  }

  it('accepts the managed main frame on its actual application page', async () => {
    const { event, mainApp } = sender()
    const { client } = fixture()
    await expect(createDeviceInfoHandler(mainApp, client)(event, 'device-A')).resolves.toMatchObject({ id: 'device-A' })
  })

  it.each(['https://example.com', 'file:///other/index.html', 'data:text/html,hello'])(
    'rejects a main window navigated away from the application: %s', async (url) => {
      const { event, frame, mainApp } = sender()
      frame.url = url
      const { client } = fixture()
      await expect(createDeviceInfoHandler(mainApp, client)(event, 'device-A')).rejects.toThrow()
      expect(client.listDevicesWithPaths).not.toHaveBeenCalled()
    },
  )

  it('rejects child frames and unrelated windows before device I/O', async () => {
    const { event, mainApp } = sender()
    const { client } = fixture()
    const read = createDeviceInfoHandler(mainApp, client)
    await expect(read({ ...event, senderFrame: { url: event.senderFrame.url } }, 'device-A')).rejects.toThrow()
    await expect(read({ ...event, sender: { mainFrame: event.senderFrame } }, 'device-A')).rejects.toThrow()
    expect(client.listDevicesWithPaths).not.toHaveBeenCalled()
  })
})
