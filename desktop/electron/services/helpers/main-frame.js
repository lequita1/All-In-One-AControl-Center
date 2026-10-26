import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** Authorize only the managed main frame on the configured local app page. */
export function assertMainApplication(mainApp, event) {
  const window = mainApp.getMainWindow()
  if (!window || window.isDestroyed() || event.sender !== window.webContents || event.senderFrame !== event.sender.mainFrame)
    throw new Error('Request is not from the main application frame')
  const actual = new URL(event.senderFrame.url)
  actual.hash = ''
  actual.search = ''
  let allowed
  if (mainApp.devRendererDir) {
    const root = new URL(`${mainApp.devRendererDir.replace(/\/$/, '')}/`)
    allowed = actual.href === root.href || actual.href === new URL('index.html', root).href
  }
  else {
    allowed = actual.href === pathToFileURL(path.resolve(mainApp.rendererDir, 'index.html')).href
  }
  if (!allowed)
    throw new Error('Request is not from the application page')
  return window
}
