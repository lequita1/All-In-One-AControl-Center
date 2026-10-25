import { electronAPI } from '@electron-toolkit/preload'
import { sheller } from '$electron/helpers/shell/index.js'
import { parseArguments, validateDeviceSerial } from '$electron/helpers/shell/arguments.js'
import { getScrcpy } from '$electron/configs/index.js'
import commandHelper from '$renderer/utils/command/index.js'
import { createDeferred } from '$renderer/utils/index.js'

import { ProcessManager } from '$electron/process/manager.js'

import { parseDisplayIds, parseScrcpyAppList, parseScrcpyCameras, parseScrcpyCodecList } from './helper.js'

const processManager = new ProcessManager()

electronAPI.ipcRenderer.on('quit-before', () => {
  processManager.kill()
})

function normalizeScrcpyError(error) {
  const message = error?.stderr || error?.message || String(error)
  return new Error(String(message))
}

function createScrcpyProcess(command, options = {}) {
  let mirrorProcess = null

  const {
    resolveOnReady = false,
    resolveOnSpawn = false,
    readyPattern = /(?:Renderer:|Texture:|\[server\]\s+INFO:\s+Device:)/i,
    getReadyValue = () => void 0,
    readyErrorMessage = 'scrcpy process exited before ready',
    startupTimeout = 15000,
    stdout,
    stderr,
    ...shellerOptions
  } = options

  const readyDeferred = resolveOnReady || resolveOnSpawn
    ? createDeferred()
    : null

  if (readyDeferred && (!Number.isFinite(startupTimeout) || startupTimeout < 1 || startupTimeout > 120000)) {
    throw new TypeError('Invalid scrcpy startup timeout')
  }

  let readySettled = false
  let readyTimer
  const output = { stdout: '', stderr: '' }

  function settleReady(error, value) {
    if (!readyDeferred || readySettled) {
      return
    }
    readySettled = true
    clearTimeout(readyTimer)
    if (error) {
      readyDeferred.reject(error)
    }
    else {
      readyDeferred.resolve(value)
    }
  }

  function resolveReady(data, stream) {
    if (!readyDeferred || !resolveOnReady || readySettled) {
      return
    }

    const text = output[stream] = (output[stream] + String(data)).slice(-8192)

    if (!text.trim()) {
      return
    }

    readyPattern.lastIndex = 0

    const matchList = text.match(readyPattern)

    if (!matchList) {
      return
    }

    try {
      settleReady(null, getReadyValue(matchList, text))
    }
    catch (error) {
      settleReady(error)
    }
  }

  mirrorProcess = sheller([getScrcpy(), ...parseArguments(command)], {
    encoding: 'utf8',
    ...shellerOptions,
    shell: false,

    stdout: (data) => {
      stdout?.(data, mirrorProcess)
      resolveReady(data, 'stdout')
    },

    stderr: (data) => {
      stderr?.(data, mirrorProcess)
      resolveReady(data, 'stderr')
    },
  })

  processManager.add(mirrorProcess)

  if (readyDeferred) {
    readyTimer = setTimeout(() => {
      settleReady(new Error('scrcpy startup timed out'))
      Promise.resolve(mirrorProcess.kill()).catch(() => {})
    }, startupTimeout)
  }

  if (resolveOnSpawn) {
    mirrorProcess.once('spawn', () => {
      settleReady()
    })
  }

  const exitPromise = mirrorProcess
    .then((result) => {
      settleReady(new Error(readyErrorMessage))
      return result
    })
    .catch((error) => {
      const normalized = normalizeScrcpyError(error)
      if (readyDeferred) {
        settleReady(normalized)
        return
      }
      throw normalized
    })

  const promise = readyDeferred
    ? readyDeferred.promise
    : exitPromise

  return Object.assign(mirrorProcess, {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  })
}

function createMirrorProcess(
  serial,
  { title, args = '', ...options } = {},
) {
  return createScrcpyProcess(
    [
      `--serial=${validateDeviceSerial(serial)}`,
      `--window-title=${title ?? ''}`,
      ...targetedOptions(args),
    ],
    options,
  )
}

function targetedOptions(input) {
  const args = parseArguments(input)
  // getopt short-option clusters can conceal -s/-d/-e. Preferences use long
  // names already; require those for custom options rather than guess arity.
  const selectors = ['--serial', '--select-usb', '--select-tcpip', '--tcpip']
  if (args.some((arg) => {
    const flag = arg.split('=')[0]
    // getopt_long also accepts unambiguous prefixes, e.g. --ser=other.
    return arg === '--' || /^-[^-]/.test(arg) || (flag.startsWith('--') && selectors.some(selector => selector.startsWith(flag)))
  })) {
    throw new TypeError('Use long mirroring options without overriding the selected device')
  }
  return args
}

async function shell(...args) {
  return createScrcpyProcess(...args)
}

async function getEncoders(serial) {
  const res = await createScrcpyProcess([`--serial=${validateDeviceSerial(serial)}`, '--list-encoders'])

  const stdout = res.stdout

  const value = parseScrcpyCodecList(stdout)

  return value
}

async function mirror(...args) {
  return createMirrorProcess(...args)
}

async function record(serial, { title, args = '', savePath, ...options } = {}) {
  return createScrcpyProcess(
    [`--serial=${validateDeviceSerial(serial)}`, `--window-title=${title ?? ''}`, `--record=${savePath}`, ...targetedOptions(args)],
    options,
  )
}

async function helper(
  serial,
  command = '',
  options = {},
) {
  const stringCommand = commandHelper.stringify(command)

  return createScrcpyProcess(
    [`--serial=${validateDeviceSerial(serial)}`, '--no-window', '--no-video', '--no-audio', ...targetedOptions(stringCommand)],
    {
      resolveOnReady: true,
      ...options,
    },
  )
}

async function getAppList(serial) {
  const res = await createScrcpyProcess([`--serial=${validateDeviceSerial(serial)}`, '--list-apps'])

  const stdout = res.stdout

  const value = parseScrcpyAppList(stdout)

  return value
}

async function getDisplayIds(serial) {
  const res = await createScrcpyProcess([`--serial=${validateDeviceSerial(serial)}`, '--list-displays'])

  const stdout = res.stdout

  const value = parseDisplayIds(stdout)

  return value
}

async function getCameraList(serial, options) {
  const res = await createScrcpyProcess([`--serial=${validateDeviceSerial(serial)}`, '--list-cameras'])

  const stdout = res.stdout

  const value = parseScrcpyCameras(stdout, options)

  return value
}

async function launch(serial, args = {}) {
  let {
    commands = '',
    packageName,
    useNewDisplay = true,
    newDisplay = '',
    landscape,
    ...options
  } = args

  commands = targetedOptions(commands)

  if (useNewDisplay) {
    commands.push(newDisplay ? `--new-display=${newDisplay}` : '--new-display')
  }

  if (landscape || !useNewDisplay) {
    commands = commands.filter(arg => arg !== '--flex-display')
  }

  if (packageName && packageName !== 'unknown') {
    commands.push(`--start-app=${packageName}`)
  }

  return createMirrorProcess(serial, {
    ...options,
    args: commands,
    resolveOnReady: useNewDisplay,
    resolveOnSpawn: !useNewDisplay,
    readyPattern: /New display:.+?\(id=(\d+)\)/i,
    getReadyValue: (matchList) => {
      const displayId = matchList[1]

      if (!displayId) {
        throw new Error('The display ID was not obtained.')
      }

      return displayId
    },
    readyErrorMessage: useNewDisplay
      ? 'scrcpy exited before new display was created'
      : 'scrcpy exited before spawn',
  })
}

async function killProcesses() {
  return processManager.kill()
}

export default {
  shell,
  getEncoders,
  mirror,
  record,
  launch,
  helper,
  getAppList,
  getDisplayIds,
  getCameraList,
  killProcesses,
}
