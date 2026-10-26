import { randomBytes } from 'node:crypto'
import { shellEscape, validateDeviceSerial, validatePackageName } from '@escrcpy/shared'
import { openApplicationShell, pushApplicationFile } from './transport.js'
import { prepareInstallFiles } from './install-files.js'
import { createApkInstaller } from './installer.js'

function userId(value) {
  if (!Number.isInteger(value) || value < 0 || value > 2147483647)
    throw new TypeError('A numeric Android user ID is required')
  return value
}

function requestTuple(request, action = false) {
  const keys = action ? ['serial', 'userId', 'packageName', 'action'] : ['serial', 'userId']
  if (!request || typeof request !== 'object' || Array.isArray(request) || Object.keys(request).some(key => !keys.includes(key)))
    throw new TypeError('Invalid application request')
  const target = { serial: validateDeviceSerial(request.serial), userId: userId(request.userId) }
  if (action) {
    target.packageName = validatePackageName(request.packageName)
    if (!['launch', 'force-stop', 'uninstall'].includes(request.action))
      throw new TypeError('Unsupported application action')
    target.action = request.action
  }
  return Object.freeze(target)
}

function bounded(promise, timeout, cancel = () => {}) {
  let timer
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => {
      cancel()
      reject(new Error('Application query timed out'))
    }, timeout)
  })]).finally(() => clearTimeout(timer))
}

function parsePackages(output, versions = false) {
  const packages = new Map()
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const match = line.match(versions ? /^package:(\S+) versionCode:(\d+)$/ : /^package:(\S+)$/)
    if (!match || (versions && BigInt(match[2]) > 9223372036854775807n))
      throw new Error('Package information could not be classified')
    const name = validatePackageName(match[1])
    if (packages.has(name))
      throw new Error('Package information changed; refresh the library')
    packages.set(name, versions ? match[2] : true)
  }
  return packages
}

/** Only fixed operation builders can call this injected transport. */
export function createAppManagement(client, { confirm = async () => false, timeout = 5000, openShell = openApplicationShell, selectFiles = async () => [], prepareFiles = prepareInstallFiles, confirmInstall = async () => false, pushFile = pushApplicationFile, installTimeout = 180000 } = {}) {
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 15000)
    throw new TypeError('Invalid application query timeout')
  if (!Number.isFinite(installTimeout) || installTimeout < 1 || installTimeout > 180000)
    throw new TypeError('Invalid installation timeout')
  const busy = new Set()

  async function connect(serial) {
    const devices = await bounded(client.listDevicesWithPaths(), timeout)
    if (!devices.some(device => device.id === serial && ['device', 'emulator'].includes(device.type)))
      throw new Error('Authorize and connect the selected phone first')
    return client.getDevice(serial)
  }

  async function run(device, args, authorize = () => {}, limit = timeout) {
    const marker = `__ACC_${randomBytes(12).toString('hex')}__`
    const command = `${args.map(arg => `'${shellEscape(String(arg))}'`).join(' ')} 2>&1; printf '\n${marker}%s\n' "$?"`
    const deadline = Date.now() + limit
    let stream
    const cancellation = new AbortController()
    const operation = (async () => {
      stream = await openShell(device, command, { signal: cancellation.signal, authorize })
      if (Date.now() >= deadline) {
        stream.destroy()
        throw new Error('Application query timed out')
      }
      const chunks = []
      let bytes = 0
      try {
        for await (const chunk of stream) {
          const buffer = Buffer.from(chunk)
          bytes += buffer.length
          if (bytes > 1048576)
            throw new Error('Application output exceeded the size limit')
          chunks.push(buffer)
        }
      }
      finally {
        stream.destroy()
      }
      const result = Buffer.concat(chunks).toString('utf8')
      const offset = result.lastIndexOf(`\n${marker}`)
      const status = offset < 0 ? '' : result.slice(offset + marker.length + 1).trim()
      if (!/^\d+$/.test(status))
        throw new Error('Application command outcome could not be verified; refresh before retrying')
      if (status !== '0') {
        const error = new Error(`Android rejected the application command: ${result.slice(0, offset).trim().slice(0, 400)}`)
        error.androidRejected = true
        throw error
      }
      return result.slice(0, offset).trim()
    })()
    return bounded(operation, limit, () => {
      cancellation.abort()
      stream?.destroy()
    })
  }

  async function mutate(device, args, authorize) {
    try {
      return await run(device, args, authorize)
    }
    catch (error) {
      if (error.androidRejected)
        throw error
      throw new Error('The application action outcome is unknown; refresh the library before retrying', { cause: error })
    }
  }

  async function readUsers(device) {
    const output = await run(device, ['pm', 'list', 'users'])
    const users = output.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*UserInfo\{(\d+):([^:}]*):[^}]*\}(?:\s+running)?\s*$/)
      return match ? [{ id: userId(Number(match[1])), name: match[2].slice(0, 120) }] : []
    })
    if (!users.length || new Set(users.map(user => user.id)).size !== users.length)
      throw new Error('Android users are unavailable')
    return users
  }

  async function inventory(target) {
    const device = await connect(target.serial)
    const users = await readUsers(device)
    if (!users.some(user => user.id === target.userId))
      throw new Error('The selected Android user is unavailable')
    const commands = [
      ['--show-versioncode'], ['-s'], ['-3'], ['-d'],
    ].map(flags => ['pm', 'list', 'packages', ...flags, '--user', target.userId])
    const [all, system, thirdParty, disabled] = await Promise.all(commands.map(async (args, index) => parsePackages(await run(device, args), index === 0)))
    for (const name of [...system.keys(), ...thirdParty.keys(), ...disabled.keys()]) {
      if (!all.has(name))
        throw new Error('Installed packages changed; refresh the library')
    }
    const packages = [...all].map(([packageName, versionCode]) => {
      if (system.has(packageName) === thirdParty.has(packageName))
        throw new Error('Package information could not be classified')
      return { packageName, versionCode, system: system.has(packageName), userInstalled: thirdParty.has(packageName), enabled: !disabled.has(packageName) }
    }).sort((a, b) => a.packageName.localeCompare(b.packageName))
    return { device, serial: target.serial, userId: target.userId, users, packages }
  }

  function installed(snapshot, name) {
    const item = snapshot.packages.find(item => item.packageName === name)
    if (!item)
      throw new Error('This application is no longer installed for the selected user')
    return item
  }

  function userApplication(item) {
    if (item.system || !item.userInstalled || item.packageName === 'android')
      throw new Error('This action is limited to user-installed applications; system apps are protected')
  }

  const install = createApkInstaller({ connect, readUsers, run, selectFiles, prepareFiles, confirmInstall, pushFile, installTimeout })

  return {
    async install(request, authorize = () => {}) {
      const target = requestTuple(request)
      if (busy.has(target.serial))
        throw new Error('An application action is already in progress on this phone')
      busy.add(target.serial)
      try {
        return await install(target, authorize)
      }
      finally { busy.delete(target.serial) }
    },
    async users(serial) {
      validateDeviceSerial(serial)
      return { serial, users: await readUsers(await connect(serial)) }
    },
    async list(request) {
      const target = requestTuple(request)
      const snapshot = await inventory(target)
      return { serial: snapshot.serial, userId: snapshot.userId, users: snapshot.users, packages: snapshot.packages }
    },
    async perform(request, authorize = () => {}) {
      const target = requestTuple(request, true)
      if (busy.has(target.serial))
        throw new Error('An application action is already in progress on this phone')
      busy.add(target.serial)
      try {
        let snapshot = await inventory(target)
        let item = installed(snapshot, target.packageName)
        if (target.action !== 'launch') {
          userApplication(item)
          const versionCode = item.versionCode
          const accepted = await confirm(Object.freeze({ ...target, versionCode }))
          if (accepted !== true)
            return { ...target, status: 'cancelled' }
          snapshot = await inventory(target)
          item = installed(snapshot, target.packageName)
          userApplication(item)
          if (item.versionCode !== versionCode)
            throw new Error('The app version changed; review and confirm the action again')
        }
        authorize()
        if (target.action === 'launch') {
          if (!item.enabled)
            throw new Error('Enable this app before launching it')
          const component = await run(snapshot.device, ['cmd', 'package', 'resolve-activity', '--brief', '--components', '--user', target.userId, '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', target.packageName])
          const [packageName, activity, extra] = component.split('/')
          if (extra != null || packageName !== target.packageName || !/^\.?[a-z_$][\w$]*(?:\.[a-z_$][\w$]*)*$/i.test(activity || ''))
            throw new Error('This app has no supported launcher activity')
          authorize()
          const output = await mutate(snapshot.device, ['am', 'start-activity', '-W', '--user', target.userId, '-n', component], authorize)
          if (/Error:|Exception|Status:\s*timeout/i.test(output))
            throw new Error('Android could not launch this application')
          const warning = output.match(/^Warning:.*$/m)?.[0]
          if (warning && !/intent has been delivered to currently running\s+top-most instance|current\s+task has been brought to the front/i.test(warning))
            throw new Error('Android reports that the activity was not started')
          if (!/Status:\s*ok\b/i.test(output))
            throw new Error('The launch outcome could not be verified')
        }
        else if (target.action === 'force-stop') {
          await mutate(snapshot.device, ['am', 'force-stop', '--user', target.userId, target.packageName], authorize)
        }
        else {
          const output = await mutate(snapshot.device, ['pm', 'uninstall', '--user', target.userId, '--versionCode', item.versionCode, target.packageName], authorize)
          if (output !== 'Success')
            throw new Error('Android did not report a successful uninstall; refresh before retrying')
          try {
            const after = await inventory(target)
            if (after.packages.some(item => item.packageName === target.packageName))
              throw new Error('Application remains installed')
          }
          catch (error) {
            throw new Error('Removal was attempted but its final state could not be verified; refresh before retrying', { cause: error })
          }
        }
        return { ...target, status: 'completed' }
      }
      finally {
        busy.delete(target.serial)
      }
    },
  }
}
