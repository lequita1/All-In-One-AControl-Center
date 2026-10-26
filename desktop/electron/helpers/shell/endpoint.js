import { isIP } from 'node:net'

/** Build one ADB endpoint argument without accepting flags or shell fragments. */
export function adbEndpoint(host, port) {
  if (typeof host !== 'string' || !host || host.length > 300) {
    throw new TypeError('A valid wireless device address is required')
  }
  let address = host
  let selectedPort = port
  const embedded = host.startsWith('[')
    ? host.match(/^\[([^\]]+)\](?::(\d+))?$/)
    : !isIP(host) && host.includes(':') ? host.match(/^([^:]+):(\d+)$/) : null
  if (embedded) {
    address = embedded[1]
    if (embedded[2] && port != null && port !== '') {
      throw new TypeError('Specify the wireless port only once')
    }
    selectedPort = embedded[2] ?? port
  }
  const ipVersion = isIP(address)
  const hostname = address.length <= 253
    && !/^[\d.]+$/.test(address)
    && address.split('.').every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))
  if (!ipVersion && !hostname) {
    throw new TypeError('Invalid wireless device address')
  }
  selectedPort = selectedPort == null || selectedPort === '' ? 5555 : selectedPort
  if (!/^\d+$/.test(String(selectedPort)) || !Number.isInteger(Number(selectedPort)) || Number(selectedPort) < 1 || Number(selectedPort) > 65535) {
    throw new TypeError('Wireless port must be between 1 and 65535')
  }
  return `${ipVersion === 6 ? `[${address}]` : address}:${Number(selectedPort)}`
}

export function pairingCode(code) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw new TypeError('A six-digit wireless pairing code is required')
  }
  return code
}
