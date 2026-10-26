import net from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openApplicationShell } from '../transport.js'

const cleanups = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function server(handler) {
  const commands = []
  const sockets = new Set()
  const host = net.createServer((socket) => {
    sockets.add(socket)
    socket.on('error', () => {})
    socket.on('close', () => sockets.delete(socket))
    let input = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      input = Buffer.concat([input, chunk])
      while (input.length >= 4) {
        const length = Number.parseInt(input.subarray(0, 4).toString(), 16)
        if (input.length < length + 4)
          return
        const command = input.subarray(4, 4 + length).toString()
        input = input.subarray(4 + length)
        commands.push(command)
        handler(socket, command)
      }
    })
  })
  await new Promise(resolve => host.listen(0, '127.0.0.1', resolve))
  cleanups.push(() => new Promise((resolve) => {
    for (const socket of sockets) socket.destroy()
    host.close(resolve)
  }))
  return { commands, device: { serial: 'A', client: { options: { host: '127.0.0.1', port: host.address().port } } } }
}

describe('owned application shell transport', () => {
  it('does not dispatch a shell command after cancellation during the transport handshake', async () => {
    let lateSocket
    const f = await server((socket) => {
      lateSocket = socket
    })
    const abort = new AbortController()
    const result = openApplicationShell(f.device, 'pm uninstall com.example.app', { signal: abort.signal }).catch(error => error)
    await vi.waitFor(() => expect(f.commands).toEqual(['host:transport:A']))
    abort.abort()
    expect(await result).toBeInstanceOf(Error)
    if (!lateSocket.destroyed)
      lateSocket.write('OKAY')
    await new Promise(resolve => setImmediate(resolve))
    expect(f.commands).toEqual(['host:transport:A'])
  })

  it('checks current frame authority at dispatch, after transport setup', async () => {
    const f = await server(socket => socket.write('OKAY'))
    const authorize = vi.fn(() => {
      throw new Error('Frame changed')
    })
    await expect(openApplicationShell(f.device, 'am force-stop com.example.app', { signal: new AbortController().signal, authorize })).rejects.toThrow('Frame changed')
    expect(f.commands).toEqual(['host:transport:A'])
  })

  it('uses installed adbkit framing and returns only the shell output stream', async () => {
    const f = await server((socket, command) => {
      if (command.startsWith('host:transport:'))
        socket.write('OKAY')
      else socket.end('OKAYhello')
    })
    const output = await openApplicationShell(f.device, 'pm list users', { signal: new AbortController().signal })
    const chunks = []
    for await (const chunk of output) chunks.push(chunk)
    expect(Buffer.concat(chunks).toString()).toBe('hello')
    expect(f.commands).toEqual(['host:transport:A', 'shell:pm list users'])
  })
})
