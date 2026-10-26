import { describe, expect, it } from 'vitest'
import { parseArguments, validateDeviceSerial } from '../arguments.js'

describe('host argument boundary', () => {
  it('keeps quoted values and literal array data intact', () => {
    expect(parseArguments('--max-size=1024 --window-title="My phone"')).toEqual(['--max-size=1024', '--window-title=My phone'])
    expect(parseArguments(['--record=C:\\My videos\\a & b.mp4', '--window-title=$(echo phone)'])).toEqual(['--record=C:\\My videos\\a & b.mp4', '--window-title=$(echo phone)'])
  })

  it.each(['--no-audio && calc', '--no-audio | calc', '--no-audio; calc', '--no-audio > out', '--no-audio # hidden', '--title=$HOME', '--title=`whoami`'])(
    'rejects host syntax in legacy options: %s', (input) => {
      expect(() => parseArguments(input)).toThrow()
    },
  )

  it.each([['ok', 1], ['bad\0value'], {}, null])('rejects malformed arguments: %j', (input) => {
    expect(() => parseArguments(input)).toThrow()
  })

  it.each(['usb-123', 'emulator-5554', '192.168.1.5:37123', '[fe80::1%12]:5555', 'adb-test._adb-tls-connect._tcp'])('accepts an explicit Android target: %s', (serial) => {
    expect(validateDeviceSerial(serial)).toBe(serial)
  })

  it.each(['', '-sother', 'a b', 'a\nother', 'a" & calc', null, 123])('rejects an ambiguous or unsafe target: %j', (serial) => {
    expect(() => validateDeviceSerial(serial)).toThrow()
  })
})
