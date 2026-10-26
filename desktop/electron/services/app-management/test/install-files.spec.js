import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareInstallFiles } from '../install-files.js'

const folders = []
afterEach(async () => {
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true })
})
async function apk(name = 'quote\'s $(ignored).apk', content = Buffer.from('PK\x03\x04fixture')) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'acc-apk-test-'))
  folders.push(folder)
  const file = path.join(folder, name)
  await writeFile(file, content)
  return file
}

describe('native-selected APK snapshots', () => {
  it('copies bytes into owned storage and fingerprints the captured selection', async () => {
    const source = await apk()
    const original = await readFile(source)
    const snapshot = await prepareInstallFiles([source])
    try {
      await writeFile(source, 'changed source')
      expect(await readFile(snapshot.files[0].path)).toEqual(original)
      expect(snapshot.files[0]).toMatchObject({ name: path.basename(source), size: original.length, sha256: createHash('sha256').update(original).digest('hex') })
      expect(snapshot.files[0].path).not.toBe(source)
    }
    finally { await snapshot.cleanup() }
    await expect(stat(snapshot.files[0].path)).rejects.toThrow()
    expect(await readFile(source, 'utf8')).toBe('changed source')
  })

  it('rejects non-APK, empty, directory and duplicate selections', async () => {
    const file = await apk()
    for (const selection of [[], [file, file], [await apk('file.txt')], [await apk('empty.apk', Buffer.alloc(0))], [path.dirname(file)], ['relative.apk']])
      await expect(prepareInstallFiles(selection)).rejects.toThrow()
  })

  it('rejects excessive file counts before opening paths', async () => {
    await expect(prepareInstallFiles(Array.from({ length: 65 }, (_, i) => path.resolve(`${i}.apk`)))).rejects.toThrow(/64|count/i)
  })
})
