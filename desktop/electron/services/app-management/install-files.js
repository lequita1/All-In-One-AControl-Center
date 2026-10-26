import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { constants, createWriteStream } from 'node:fs'
import { lstat, mkdtemp, open, realpath, rm, rmdir } from 'node:fs/promises'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

/** Snapshot only native-selected files; never expose these paths to the renderer. */
export async function prepareInstallFiles(paths) {
  if (!Array.isArray(paths) || !paths.length || paths.length > 64)
    throw new Error('Choose between 1 and 64 APK files for one application')
  const selected = [...paths]
  const seen = new Set()
  const sources = []
  let total = 0
  for (const file of selected) {
    if (typeof file !== 'string' || !path.isAbsolute(file) || path.extname(file).toLowerCase() !== '.apk')
      throw new Error('Choose regular APK files using the file picker')
    const info = await lstat(file)
    const canonical = await realpath(file)
    const identity = process.platform === 'win32' ? canonical.toLowerCase() : canonical
    if (!info.isFile() || info.isSymbolicLink() || seen.has(identity) || info.size < 4 || info.size > 1073741824)
      throw new Error('APK selections must be unique, nonempty regular files no larger than 1 GiB each')
    total += info.size
    if (total > 2147483648)
      throw new Error('The selected APKs exceed the 2 GiB total limit')
    seen.add(identity)
    sources.push({ path: canonical, size: info.size, name: path.basename(file) })
  }

  const directory = await mkdtemp(path.join(os.tmpdir(), 'acc-install-'))
  const owned = []
  const cleanup = async () => {
    for (const file of owned) await rm(file, { force: true })
    await rmdir(directory)
  }
  try {
    const files = []
    for (const [index, source] of sources.entries()) {
      const destination = path.join(directory, `part-${index}.apk`)
      owned.push(destination)
      const handle = await open(source.path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0))
      try {
        const info = await handle.stat()
        if (!info.isFile() || info.size !== source.size)
          throw new Error('An APK changed during selection; choose the files again')
        const hash = createHash('sha256')
        let bytes = 0
        const header = Buffer.alloc(4)
        const fingerprint = new Transform({ transform(chunk, encoding, callback) {
          if (bytes < 4)
            chunk.copy(header, bytes, 0, Math.min(4 - bytes, chunk.length))
          bytes += chunk.length
          if (bytes > source.size)
            return callback(new Error('An APK changed while copying'))
          hash.update(chunk)
          callback(null, chunk)
        } })
        await pipeline(handle.createReadStream({ autoClose: false }), fingerprint, createWriteStream(destination, { flags: 'wx', mode: 0o600 }), { signal: AbortSignal.timeout(180000) })
        if (bytes !== source.size || !header.equals(Buffer.from([0x50, 0x4B, 3, 4])))
          throw new Error('The selected file is not a supported APK archive')
        files.push(Object.freeze({ path: destination, name: source.name, size: bytes, sha256: hash.digest('hex') }))
      }
      finally { await handle.close() }
    }
    return { files: Object.freeze(files), cleanup }
  }
  catch (error) {
    try {
      await cleanup()
    }
    catch (cleanupError) {
      throw new Error('APK selection failed and temporary-file cleanup was incomplete', { cause: new AggregateError([error, cleanupError], 'Snapshot and cleanup failed') })
    }
    throw error
  }
}
