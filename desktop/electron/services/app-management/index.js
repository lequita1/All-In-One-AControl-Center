import { dialog, ipcMain } from 'electron'
import { Adb } from '@devicefarmer/adbkit'
import { t } from '$electron/helpers/i18n/index.js'
import { assertMainApplication } from '../helpers/main-frame.js'
import { createAppManagement } from './service.js'

export async function selectInstallFiles(mainApp) {
  const result = await dialog.showOpenDialog(mainApp.getMainWindow(), {
    title: t('apps.chooseApks'),
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: t('apps.apkFiles'), extensions: ['apk'] }],
  })
  return result.canceled ? [] : result.filePaths
}

export async function confirmApkInstallation(mainApp, target) {
  const { response } = await dialog.showMessageBox(mainApp.getMainWindow(), {
    type: 'warning',
    title: t('apps.install'),
    message: t('apps.installWarning'),
    detail: `${t('apps.phone')}: ${target.serial}\n${t('apps.user')}: ${target.userId}\n\n${target.files.map(file => `${file.name} (${file.size} bytes)\nSHA-256: ${file.sha256}`).join('\n\n')}`,
    buttons: [t('common.cancel'), t('apps.install')],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  })
  return response === 1
}

export async function confirmApplicationAction(mainApp, target) {
  const { response } = await dialog.showMessageBox(mainApp.getMainWindow(), {
    type: 'warning',
    title: t('apps.confirmTitle'),
    message: t(target.action === 'uninstall' ? 'apps.uninstallWarning' : 'apps.stopWarning'),
    detail: `${target.packageName}\n${t('apps.phone')}: ${target.serial}\n${t('apps.user')}: ${target.userId}\n${t('apps.version')}: ${target.versionCode}`,
    buttons: [t('common.cancel'), t(target.action === 'uninstall' ? 'apps.uninstall' : 'apps.stop')],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  })
  return response === 1
}

export function createAppManagementHandlers(mainApp, client, confirm = target => confirmApplicationAction(mainApp, target)) {
  const service = createAppManagement(client, { confirm, selectFiles: () => selectInstallFiles(mainApp), confirmInstall: target => confirmApkInstallation(mainApp, target) })
  return Object.fromEntries(['users', 'list', 'perform', 'install'].map(method => [method, async (event, request) => {
    assertMainApplication(mainApp, event)
    return service[method](request, () => assertMainApplication(mainApp, event))
  }]))
}

export default {
  name: 'service:app-management',
  deps: ['module:main'],
  apply(mainApp) {
    const handlers = createAppManagementHandlers(mainApp, Adb.createClient())
    for (const method of ['users', 'list', 'perform', 'install'])
      ipcMain.handle(`apps:${method}`, handlers[method])
  },
}
