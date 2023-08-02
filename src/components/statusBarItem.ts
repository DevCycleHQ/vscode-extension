import * as vscode from 'vscode'

const STATUS_BAR_ITEM: string = 'devcycle-feature-flags'
export const statusBarItem = vscode.window.createStatusBarItem(STATUS_BAR_ITEM)
statusBarItem.name = 'DevCycle Status'

export function showBusyMessage(message: string) {
    statusBarItem.text = `$(loading~spin) ${message}...`
    statusBarItem.tooltip = `${message}...`
    statusBarItem.show()
  }
  
export function hideBusyMessage() {
    statusBarItem.hide()
}