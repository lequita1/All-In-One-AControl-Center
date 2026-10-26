import { randomBytes } from 'node:crypto'

/** Captured/validated targets and native-only snapshots enter here from the service. */
export function createApkInstaller({ connect, readUsers, run, selectFiles, prepareFiles, confirmInstall, pushFile, installTimeout }) {
  async function authorizedDevice(target) {
    const device = await connect(target.serial)
    if (!(await readUsers(device)).some(user => user.id === target.userId))
      throw new Error('The selected Android user is unavailable')
    return device
  }

  return async (target, authorize) => {
    await authorizedDevice(target)
    authorize()
    const selection = await selectFiles(target)
    const result = { ...target, action: 'install', status: 'cancelled' }
    if (!selection.length)
      return result
    authorize()
    const snapshot = await prepareFiles(selection)
    const warnings = []
    let failure
    let device
    let session
    let staged = false
    const directory = `/data/local/tmp/acc-install-${randomBytes(16).toString('hex')}`
    const remoteFiles = snapshot.files.map((_, index) => `${directory}/part-${index}.apk`)
    try {
      const files = Object.freeze(snapshot.files.map(({ name, size, sha256 }) => Object.freeze({ name, size, sha256 })))
      if (await confirmInstall(Object.freeze({ ...target, files })) === true) {
        device = await authorizedDevice(target)
        authorize()
        staged = true
        await run(device, ['mkdir', '-m', '700', directory], authorize)
        const created = await run(device, ['pm', 'install-create', '-r', '--restrict-permissions', '--user', target.userId, '-S', files.reduce((sum, file) => sum + file.size, 0)], authorize)
        const match = created.match(/^Success: created install session \[(\d+)\]$/)
        if (!match || Number(match[1]) > 2147483647)
          throw new Error('Android did not return a valid install session; no commit was sent')
        session = match[1]
        for (const [index, file] of snapshot.files.entries()) {
          const remote = remoteFiles[index]
          const cancellation = new AbortController()
          const timer = setTimeout(() => cancellation.abort(), installTimeout)
          try {
            await pushFile(device, file.path, remote, { signal: cancellation.signal, authorize })
          }
          finally { clearTimeout(timer) }
          const digest = (await run(device, ['sha256sum', remote], authorize, installTimeout)).match(/^([a-f0-9]{64})[ \t]+(.+)$/i)
          if (!digest || digest[1].toLowerCase() !== file.sha256 || digest[2] !== remote)
            throw new Error('APK SHA-256 fingerprint mismatch; no commit was sent')
          const written = await run(device, ['pm', 'install-write', '-S', file.size, session, `part-${index}.apk`, remote], authorize, installTimeout)
          if (written !== `Success: streamed ${file.size} bytes`)
            throw new Error('Android did not confirm the split write; no commit was sent')
        }
        await authorizedDevice(target)
        authorize()
        let committed
        try {
          committed = await run(device, ['pm', 'install-commit', session], authorize, installTimeout)
        }
        catch (error) {
          if (error.androidRejected)
            throw error
          throw new Error('Installation outcome is unknown; refresh and inspect the phone before retrying', { cause: error })
        }
        if (committed !== 'Success')
          throw new Error('Installation outcome could not be verified; refresh and inspect the phone before retrying')
        session = null
        result.status = 'completed'
        result.fileCount = files.length
      }
    }
    catch (error) { failure = error }
    finally {
      if (session) {
        try {
          await run(device, ['pm', 'install-abandon', session])
        }
        catch { warnings.push('The incomplete Android install session could not be abandoned') }
      }
      if (staged) {
        try {
          await run(device, ['rm', '-f', ...remoteFiles])
          await run(device, ['rmdir', directory])
        }
        catch { warnings.push('Temporary APK files could not be removed from the phone') }
      }
      try {
        await snapshot.cleanup()
      }
      catch { warnings.push('Temporary APK files could not be removed from this computer') }
    }
    if (failure)
      throw new Error([failure.message, ...warnings].join('. '), { cause: failure })
    if (warnings.length)
      result.warnings = warnings
    return result
  }
}
