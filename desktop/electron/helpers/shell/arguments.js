import quote from 'shell-quote'

export { validateDeviceSerial } from '@escrcpy/shared'

/** Parse old option strings without executing or expanding host shell syntax. */
export function parseArguments(input) {
  if (typeof input !== 'string' && !Array.isArray(input)) {
    throw new TypeError('Arguments must be a string or string array')
  }
  // Literal arrays are the preferred interface for paths, titles and other data.
  // Legacy strings have no shell expansion contract.
  if (typeof input === 'string' && /[$`]/.test(input)) {
    throw new TypeError('Shell expansion is not supported in options')
  }
  const args = Array.isArray(input) ? [...input] : quote.parse(input)
  if (args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) {
    throw new TypeError('Shell operators, comments and invalid arguments are not supported')
  }
  return args
}
