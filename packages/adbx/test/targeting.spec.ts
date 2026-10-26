import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createAdbx } from '../src/index.js'
import type { IAdbClient, IAdbDevice } from '../src/types.js'

function transport() {
  const unexpected = async () => {
    throw new Error('Unexpected fake transport operation')
  }
  const commands: Array<{ serial: string, command: string }> = []
  const packages: Array<{ serial: string, operation: string, packageName: string }> = []
  const devices = new Map<string, IAdbDevice>()
  for (const serial of ['device-A', 'device-B']) {
    devices.set(serial, {
      async shell(command: string) {
        commands.push({ serial, command })
        return Readable.from([Buffer.from('Physical size: 1080x2400')])
      },
      screencap: unexpected,
      push: unexpected,
      pull: unexpected,
      readdir: unexpected,
      install: unexpected,
      async uninstall(packageName: string) {
        packages.push({ serial, operation: 'uninstall', packageName })
        return true
      },
      async isInstalled(packageName: string) {
        packages.push({ serial, operation: 'isInstalled', packageName })
        return true
      },
      tcpip: unexpected,
      waitForDevice: unexpected,
    })
  }
  const requests: string[] = []
  const adb = {
    getDevice(serial: string) {
      requests.push(serial)
      const device = devices.get(serial)
      if (!device)
        throw new Error('Unknown fake device')
      return device
    },
    listDevicesWithPaths: unexpected,
    version: unexpected,
    kill: unexpected,
    trackDevices: unexpected,
  } satisfies IAdbClient
  return { adb, commands, requests, packages }
}

describe('explicit ADB targeting', () => {
  it('keeps an in-flight operation on A when selection changes to B', async () => {
    const fake = transport()
    const adbx = createAdbx({ adb: fake.adb })
    let selected = 'device-A'
    const first = adbx.input.tap(selected, 12, 34)
    selected = 'device-B'
    const second = adbx.input.tap(selected, 56, 78)
    await Promise.all([first, second])
    expect(fake.commands).toEqual([
      { serial: 'device-A', command: 'input tap 12 34' },
      { serial: 'device-B', command: 'input tap 56 78' },
    ])
  })

  it.each(['', '-sother', 'device-A shell reboot', 'device-A\nother'])(
    'rejects an invalid target before consulting the transport: %j', async (serial) => {
      const fake = transport()
      const adbx = createAdbx({ adb: fake.adb })
      await expect(adbx.input.tap(serial, 12, 34)).rejects.toThrow()
      expect(fake.requests).toEqual([])
    },
  )
})

describe('package operation boundaries', () => {
  it.each(['', ' com.example.app', 'com.example.app ', 'com..app', '-k', 'com.example.app;id', 'com.example.$(id)', 'com.example.app\nreboot', 'com.example.app\n', 'com.example.app\r\n', 'com.example.app\u2028', 'com.example.app\0', 'com.example.app/Activity', 'com.123', `${'a'.repeat(256)}.app`])(
    'rejects a malformed package before consulting the device transport: %j', async (packageName) => {
      const fake = transport()
      const adbx = createAdbx({ adb: fake.adb })
      await expect(async () => adbx.uninstall('device-A', packageName)).rejects.toThrow(/package/i)
      await expect(async () => adbx.isInstalled('device-A', packageName)).rejects.toThrow(/package/i)
      expect(fake.requests).toEqual([])
      expect(fake.packages).toEqual([])
    },
  )

  it.each([null, 42, {}, []])('rejects a non-string package identifier: %j', async (packageName) => {
    const fake = transport()
    const adbx = createAdbx({ adb: fake.adb })
    await expect(async () => adbx.uninstall('device-A', packageName as unknown as string)).rejects.toThrow(/package/i)
    expect(fake.requests).toEqual([])
  })

  it.each(['', '-sother', 'device-A shell reboot', 'device-A\n'])('rejects an invalid package-operation target: %j', async (serial) => {
    const fake = transport()
    const adbx = createAdbx({ adb: fake.adb })
    await expect(async () => adbx.uninstall(serial, 'com.example.app')).rejects.toThrow()
    await expect(async () => adbx.isInstalled(serial, 'com.example.app')).rejects.toThrow()
    expect(fake.requests).toEqual([])
  })

  it('preserves the original target for package checks and removal when selection changes', async () => {
    const fake = transport()
    const adbx = createAdbx({ adb: fake.adb })
    let selected = 'device-A'
    const checking = adbx.isInstalled(selected, 'com.example.App_2')
    const removing = adbx.uninstall(selected, 'com.example.App_2')
    selected = 'device-B'
    expect(selected).toBe('device-B')
    await expect(checking).resolves.toBe(true)
    await expect(removing).resolves.toBe(true)
    expect(fake.packages).toEqual([
      { serial: 'device-A', operation: 'isInstalled', packageName: 'com.example.App_2' },
      { serial: 'device-A', operation: 'uninstall', packageName: 'com.example.App_2' },
    ])
  })

  it('permits the Android framework identifier for read-only installed checks', async () => {
    const fake = transport()
    await expect(createAdbx({ adb: fake.adb }).isInstalled('device-A', 'android')).resolves.toBe(true)
  })
})
