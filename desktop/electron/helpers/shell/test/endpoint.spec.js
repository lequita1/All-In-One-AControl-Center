import { describe, expect, it } from 'vitest'
import { adbEndpoint, pairingCode } from '../endpoint.js'

describe('wireless ADB arguments', () => {
  it.each([
    { host: '192.168.1.2', port: '37123', want: '192.168.1.2:37123' },
    { host: 'phone.local:5555', want: 'phone.local:5555' },
    { host: 'phone.local', want: 'phone.local:5555' },
    { host: '[fe80::1%12]:37123', want: '[fe80::1%12]:37123' },
    { host: '::1', port: 5555, want: '[::1]:5555' },
  ])('formats one literal endpoint: $want', ({ host, port, want }) => {
    expect(adbEndpoint(host, port)).toBe(want)
  })

  it.each([
    { host: '' }, { host: '-sother' }, { host: 'phone.local other' },
    { host: 'phone;reboot' }, { host: '999.999.999.999' },
    { host: 'phone', port: 0 }, { host: 'phone', port: 65536 },
    { host: 'phone', port: '5555 shell reboot' }, { host: '[::1]:bad' },
  ])('rejects an invalid address or port: %j', ({ host, port }) => {
    expect(() => adbEndpoint(host, port)).toThrow()
  })

  it('accepts a six-digit pairing code without changing leading zeroes', () => {
    expect(pairingCode('012345')).toBe('012345')
  })

  it.each(['', '12345', '1234567', '123456 reboot', 123456])('rejects an invalid pairing code: %j', (code) => {
    expect(() => pairingCode(code)).toThrow()
  })
})
