import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createAdbx } from '../src/index.js'
import type { IAdbClient, IAdbDevice } from '../src/types.js'

function transport() {
  const unexpected = async () => {
    throw new Error('Unexpected fake transport operation')
  }
  const commands: Array<{ serial: string, command: string }> = []
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
      uninstall: unexpected,
      isInstalled: unexpected,
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
  return { adb, commands, requests }
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
