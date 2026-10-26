import net from 'node:net'
import ParserModule from '@devicefarmer/adbkit/dist/src/adb/parser.js'
import TransportModule from '@devicefarmer/adbkit/dist/src/adb/command/host/transport.js'
import ShellModule from '@devicefarmer/adbkit/dist/src/adb/command/host-transport/shell.js'
import { validateDeviceSerial } from '@escrcpy/shared'

const Parser = ParserModule.default || ParserModule
const HostTransportCommand = TransportModule.default || TransportModule
const ShellCommand = ShellModule.default || ShellModule

/**
 * Own the socket before handshake; never let a timed-out promise dispatch later.
 * Uses the pinned adbkit framing/parser without its automatic server startup.
 */
export async function openApplicationShell(device, command, { signal, authorize = () => {} }) {
  validateDeviceSerial(device.serial)
  signal.throwIfAborted()
  const { host, port } = device.client.options
  const socket = net.createConnection({ host, port })
  socket.setNoDelay(true)
  const abort = () => socket.destroy(new Error('Application transport cancelled'))
  signal.addEventListener('abort', abort, { once: true })
  socket.once('close', () => signal.removeEventListener('abort', abort))
  try {
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve)
      socket.on('error', reject)
    })
    signal.throwIfAborted()
    const connection = { parser: new Parser(socket), write: data => socket.write(data) }
    await new HostTransportCommand(connection).execute(device.serial)
    signal.throwIfAborted()
    authorize()
    return await new ShellCommand(connection).execute(command)
  }
  catch (error) {
    socket.destroy()
    throw error
  }
}
