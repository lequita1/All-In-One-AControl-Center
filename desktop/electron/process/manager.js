import { promisify } from 'node:util'
import treeKill from '@magda/tree-kill'

const terminateTree = promisify(treeKill)

/**
 * Process Manager
 */
export class ProcessManager {
  processList = []

  constructor() {
    this.processList = []
  }

  add(process) {
    if (!this.processList.includes(process)) {
      this.processList.push(process)
      process.once('close', () => {
        this.processList = this.processList.filter(item => item !== process)
      })
    }
  }

  async kill(process) {
    const targets = process == null
      ? [...this.processList]
      : this.processList.filter(item => item === process || item.pid === process)
    if (process != null && !targets.length) {
      throw new TypeError('Cannot terminate an unowned process')
    }
    for (const item of targets) {
      if (Number.isInteger(item.pid) && item.pid > 0 && item.exitCode == null && item.signalCode == null) {
        await terminateTree(item.pid, 'SIGTERM')
      }
      this.processList = this.processList.filter(owned => owned !== item)
    }
    return this
  }
}
