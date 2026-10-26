import { Readable } from 'node:stream'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { dialog } from 'electron'
import { confirmApkInstallation, confirmApplicationAction, createAppManagementHandlers, selectInstallFiles } from '../index.js'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() }, dialog: { showMessageBox: vi.fn(async () => ({ response: 0 })), showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })) } }))
vi.mock('$electron/helpers/i18n/index.js', () => ({ t: key => key }))
vi.mock('../transport.js', () => ({ pushApplicationFile: vi.fn(), openApplicationShell: (device, command, { authorize }) => {
  authorize()
  return device.shell(command)
} }))

function fixture() {
  const rendererDir = path.resolve('test-application/dist')
  const frame = { url: `${pathToFileURL(path.join(rendererDir, 'index.html')).href}#/applications` }
  const contents = { mainFrame: frame }
  const window = { webContents: contents, isDestroyed: () => false }
  const mainApp = { rendererDir, getMainWindow: () => window }
  const client = { listDevicesWithPaths: vi.fn(async () => [{ id: 'A', type: 'device' }]), getDevice: vi.fn(() => ({
    shell: async command => Readable.from([Buffer.from(`Users:\nUserInfo{0:Owner:13}\n${command.match(/__ACC_[a-f0-9]+__/)[0]}0\n`)]),
  })) }
  return { mainApp, client, frame, window, event: { sender: contents, senderFrame: frame } }
}

describe('application IPC boundary', () => {
  it('accepts only the managed main frame on the actual application page', async () => {
    const f = fixture()
    await expect(createAppManagementHandlers(f.mainApp, f.client).users(f.event, 'A')).resolves.toEqual({ serial: 'A', users: [{ id: 0, name: 'Owner' }] })
  })

  it.each(['https://example.com', 'file:///other/index.html', 'data:text/html,hello'])('rejects a navigated main page before transport: %s', async (url) => {
    const f = fixture()
    f.frame.url = url
    const handlers = createAppManagementHandlers(f.mainApp, f.client)
    await expect(handlers.users(f.event, 'A')).rejects.toThrow()
    await expect(handlers.list(f.event, { serial: 'A', userId: 0 })).rejects.toThrow()
    await expect(handlers.perform(f.event, { serial: 'A', userId: 0, packageName: 'com.example.app', action: 'uninstall' })).rejects.toThrow()
    await expect(handlers.install(f.event, { serial: 'A', userId: 0 })).rejects.toThrow()
    expect(f.client.listDevicesWithPaths).not.toHaveBeenCalled()
  })

  it('uses a parented native APK-only multi-file picker and treats dismissal as cancellation', async () => {
    const f = fixture()
    await expect(selectInstallFiles(f.mainApp)).resolves.toEqual([])
    expect(dialog.showOpenDialog).toHaveBeenLastCalledWith(f.window, expect.objectContaining({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'apps.apkFiles', extensions: ['apk'] }] }))
  })

  it('shows captured target, update consequences and file fingerprints; defaults to cancel', async () => {
    const f = fixture()
    await expect(confirmApkInstallation(f.mainApp, { serial: 'A', userId: 10, files: [{ name: 'base.apk', size: 123, sha256: 'f'.repeat(64) }] })).resolves.toBe(false)
    const [window, options] = dialog.showMessageBox.mock.calls.at(-1)
    expect(window).toBe(f.window)
    expect(options).toMatchObject({ defaultId: 0, cancelId: 0, message: 'apps.installWarning' })
    for (const value of ['A', '10', 'base.apk', '123', 'f'.repeat(64)]) expect(options.detail).toContain(value)
  })

  it('rejects renderer-supplied file paths before showing a picker', async () => {
    const f = fixture()
    dialog.showOpenDialog.mockClear()
    await expect(createAppManagementHandlers(f.mainApp, f.client).install(f.event, { serial: 'A', userId: 0, paths: ['/other.apk'] })).rejects.toThrow()
    expect(dialog.showOpenDialog).not.toHaveBeenCalled()
  })

  it('rejects another window or child frame', async () => {
    const f = fixture()
    const handlers = createAppManagementHandlers(f.mainApp, f.client)
    await expect(handlers.users({ ...f.event, senderFrame: { url: f.frame.url } }, 'A')).rejects.toThrow()
    await expect(handlers.users({ ...f.event, sender: {} }, 'A')).rejects.toThrow()
    expect(f.client.listDevicesWithPaths).not.toHaveBeenCalled()
  })

  it('defaults native confirmation to cancel and displays the full captured target', async () => {
    const f = fixture()
    await expect(confirmApplicationAction(f.mainApp, { serial: 'A', userId: 10, packageName: 'com.example.app', action: 'uninstall', versionCode: '4' })).resolves.toBe(false)
    const [window, options] = dialog.showMessageBox.mock.calls.at(-1)
    expect(window).toBe(f.window)
    expect(options).toMatchObject({ defaultId: 0, cancelId: 0, noLink: true })
    expect(options.detail).toContain('A')
    expect(options.detail).toContain('10')
    expect(options.detail).toContain('com.example.app')
    expect(options.detail).toContain('4')
  })
})
