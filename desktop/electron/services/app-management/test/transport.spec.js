import net from 'node:net'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openApplicationShell, pushApplicationFile } from '../transport.js'

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
  it('rejects staging outside the owned APK path before contacting ADB', async () => {
    await expect(pushApplicationFile({}, '/unused.apk', '/sdcard/other.apk', { signal: new AbortController().signal })).rejects.toThrow(/staging path/)
  })

  it('propagates a failed sync-service handshake without opening the APK', async () => {
    const f = await server((socket, command) => socket.write(command === 'sync:' ? 'FAIL0006denied' : 'OKAY'))
    await expect(pushApplicationFile(f.device, '/unused.apk', `/data/local/tmp/acc-install-${'a'.repeat(32)}/part-0.apk`, { signal: new AbortController().signal })).rejects.toThrow(/denied/)
    expect(f.commands).toEqual(['host:transport:A', 'sync:'])
  })

  it('checks frame authority again after sync setup before sending file bytes', async () => {
    let current = true
    const f = await server((socket, command) => {
      if (command === 'sync:')
        current = false
      socket.write('OKAY')
    })
    await expect(pushApplicationFile(f.device, '/unused.apk', `/data/local/tmp/acc-install-${'a'.repeat(32)}/part-0.apk`, { signal: new AbortController().signal, authorize: () => {
      if (!current)
        throw new Error('Frame changed')
    } })).rejects.toThrow('Frame changed')
    expect(f.commands).toEqual(['host:transport:A', 'sync:'])
  })

  it('does not dispatch sync after cancellation during the transport handshake', async () => {
    const f = await server(() => {})
    const abort = new AbortController()
    const result = pushApplicationFile(f.device, '/unused.apk', `/data/local/tmp/acc-install-${'a'.repeat(32)}/part-0.apk`, { signal: abort.signal }).catch(error => error)
    await vi.waitFor(() => expect(f.commands).toEqual(['host:transport:A']))
    abort.abort()
    expect(await result).toBeInstanceOf(Error)
    expect(f.commands).toEqual(['host:transport:A'])
  })

  it('rejects cancellation during an active upload without waiting for a remote sync reply', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'acc-sync-test-'))
    cleanups.push(() => rm(folder, { recursive: true, force: true }))
    const file = path.join(folder, 'large.apk')
    await writeFile(file, Buffer.alloc(1024 * 1024, 65))
    const abort = new AbortController()
    const f = await server((socket, command) => {
      socket.write('OKAY')
      if (command === 'sync:') {
        socket.removeAllListeners('data')
        socket.once('data', () => abort.abort())
      }
    })
    await expect(pushApplicationFile(f.device, file, `/data/local/tmp/acc-install-${'a'.repeat(32)}/part-0.apk`, { signal: abort.signal })).rejects.toThrow()
    expect(abort.signal.aborted).toBe(true)
  })

  it('rejects an oversized sync failure length before buffering its device-controlled body', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'acc-sync-test-'))
    cleanups.push(() => rm(folder, { recursive: true, force: true }))
    const file = path.join(folder, 'snapshot.apk')
    await writeFile(file, 'PK\x03\x04test')
    const f = await server((socket, command) => {
      socket.write('OKAY')
      if (command === 'sync:') {
        socket.removeAllListeners('data')
        socket.once('data', () => {
          const header = Buffer.alloc(8)
          header.write('FAIL')
          header.writeUInt32LE(65537, 4)
          socket.write(header)
        })
      }
    })
    await expect(pushApplicationFile(f.device, file, `/data/local/tmp/acc-install-${'a'.repeat(32)}/part-0.apk`, { signal: AbortSignal.timeout(300) })).rejects.toThrow(/output.*limit|response.*limit/i)
  })

  it('pushes exact bytes using the pinned sync framing and checks the remote reply', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'acc-sync-test-'))
    cleanups.push(() => rm(folder, { recursive: true, force: true }))
    const file = path.join(folder, 'snapshot.apk')
    const bytes = Buffer.from('PK\x03\x04test')
    await writeFile(file, bytes)
    let received = Buffer.alloc(0)
    let destination
    const f = await server((socket, command) => {
      socket.write('OKAY')
      if (command === 'sync:') {
        socket.removeAllListeners('data')
        let input = Buffer.alloc(0)
        socket.on('data', (chunk) => {
          input = Buffer.concat([input, chunk])
          while (input.length >= 8) {
            const id = input.subarray(0, 4).toString()
            const length = input.readUInt32LE(4)
            if (id === 'DONE') {
              input = input.subarray(8)
              socket.write(Buffer.concat([Buffer.from('OKAY'), Buffer.alloc(4)]))
              return
            }
            if (input.length < 8 + length)
              return
            const content = input.subarray(8, 8 + length)
            if (id === 'SEND')
              destination = content.toString()
            if (id === 'DATA')
              received = Buffer.concat([received, content])
            input = input.subarray(8 + length)
          }
        })
      }
    })
    const remote = `/data/local/tmp/acc-install-${'a'.repeat(32)}/part-0.apk`
    await pushApplicationFile(f.device, file, remote, { signal: new AbortController().signal })
    expect(received).toEqual(bytes)
    expect(destination).toBe(`${remote},33152`)
    expect(f.commands).toEqual(['host:transport:A', 'sync:'])
  })

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
