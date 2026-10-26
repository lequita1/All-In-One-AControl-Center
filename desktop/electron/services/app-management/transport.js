import net from 'node:net'
import { createReadStream } from 'node:fs'
import ParserModule from '@devicefarmer/adbkit/dist/src/adb/parser.js'
import TransportModule from '@devicefarmer/adbkit/dist/src/adb/command/host/transport.js'
import ShellModule from '@devicefarmer/adbkit/dist/src/adb/command/host-transport/shell.js'
import SyncModule from '@devicefarmer/adbkit/dist/src/adb/command/host-transport/sync.js'
import { validateDeviceSerial } from '@escrcpy/shared'

const Parser = ParserModule.default || ParserModule
const HostTransportCommand = TransportModule.default || TransportModule
const ShellCommand = ShellModule.default || ShellModule
const SyncCommand = SyncModule.default || SyncModule

class BoundedApplicationParser extends Parser {
  readBytes(length, ...args) {
    if (!Number.isInteger(length) || length < 0 || length > 65536)
      throw new Error('Application transport response exceeded the size limit')
    return super.readBytes(length, ...args)
  }
}

/**
 * Own the socket before handshake; never let a timed-out promise dispatch later.
 * Uses the pinned adbkit framing/parser without its automatic server startup.
 */
async function openTransport(device, signal) {
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
    const connection = {
      parser: new BoundedApplicationParser(socket),
      write: (data, callback) => socket.write(data, callback),
      on: (...args) => socket.on(...args),
      removeListener: (...args) => socket.removeListener(...args),
      end: () => socket.destroy(),
    }
    await new HostTransportCommand(connection).execute(device.serial)
    signal.throwIfAborted()
    return { socket, connection }
  }
  catch (error) {
    socket.destroy()
    throw error
  }
}

export async function openApplicationShell(device, command, { signal, authorize = () => {} }) {
  const { socket, connection } = await openTransport(device, signal)
  try {
    signal.throwIfAborted()
    authorize()
    return await new ShellCommand(connection).execute(command)
  }
  catch (error) {
    socket.destroy()
    throw error
  }
}

export async function pushApplicationFile(device, file, remote, { signal, authorize = () => {} }) {
  if (!/^\/data\/local\/tmp\/acc-install-[a-f0-9]{32}\/part-\d+\.apk$/.test(remote))
    throw new TypeError('Invalid owned APK staging path')
  const { socket, connection } = await openTransport(device, signal)
  let source
  try {
    signal.throwIfAborted()
    authorize()
    const sync = await new SyncCommand(connection).execute()
    signal.throwIfAborted()
    authorize()
    source = createReadStream(file)
    // Keep late stream errors observed when transport cancellation closes both ends.
    source.on('error', () => {})
    const transfer = sync.push(source, remote, 0o600)
    await new Promise((resolve, reject) => {
      transfer.on('error', reject)
      transfer.once('end', resolve)
      socket.once('close', () => reject(new Error('APK transfer connection closed')))
    })
    signal.throwIfAborted()
  }
  finally {
    source?.destroy()
    socket.destroy()
  }
}
